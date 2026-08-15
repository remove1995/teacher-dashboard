"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { copyLessonPlan, reorderStages } from "@/lib/domain/lesson";
import { dateOnly, timeToMinute } from "@/lib/domain/dates";
import { attendanceAfterLessonCompletion, attendanceAfterUndoCompletion } from "@/lib/domain/attendance";
import { getTeacherSettings } from "@/lib/settings";

const planned = () => ({ manuallyEdited: true, kanbanVisible: true });

const required = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};

function refreshLessons() {
  revalidatePath("/lessons");
  revalidatePath("/attendance");
}

const monthStart=(month:string)=>{if(!/^\d{4}-\d{2}$/.test(month))throw new Error("Invalid planning month");return dateOnly(`${month}-01`)};
const nextMonth=(month:string)=>{const [year,value]=month.split("-").map(Number);return new Date(Date.UTC(year,value,1))};

export async function createLessonPlanningMonth(targetType:"student"|"cohort",targetId:string,month:string){
  const value=monthStart(month);
  const record=targetType==="student"
    ? await prisma.lessonPlanningMonth.upsert({where:{studentId_month:{studentId:targetId,month:value}},update:{},create:{studentId:targetId,month:value}})
    : await prisma.lessonPlanningMonth.upsert({where:{cohortId_month:{cohortId:targetId,month:value}},update:{},create:{cohortId:targetId,month:value}});
  refreshLessons();return {id:record.id,month};
}

export async function removeLessonPlanningMonth(planningMonthId:string){
  const record=await prisma.lessonPlanningMonth.findUniqueOrThrow({where:{id:planningMonthId}});const targetWhere=record.studentId?{studentId:record.studentId}:{cohortId:record.cohortId!};const month=record.month.toISOString().slice(0,7);
  const lessons=await prisma.lesson.count({where:{...targetWhere,kanbanVisible:true,scheduledDate:{gte:monthStart(month),lt:nextMonth(month)}}});
  if(lessons>0)throw new Error("Move the lessons before removing this month");
  await prisma.lessonPlanningMonth.delete({where:{id:planningMonthId}});refreshLessons();return {month};
}

export async function moveLessonOnMobile(lessonId:string,scheduledDateText:string){
  const scheduledDate=dateOnly(scheduledDateText),month=scheduledDateText.slice(0,7);monthStart(month);
  const lesson=await prisma.lesson.findUniqueOrThrow({where:{id:lessonId},select:{studentId:true,cohortId:true}});const targetWhere=lesson.studentId?{studentId:lesson.studentId}:{cohortId:lesson.cohortId!};
  const order=await prisma.lesson.aggregate({where:{...targetWhere,kanbanVisible:true,id:{not:lessonId},scheduledDate:{gte:monthStart(month),lt:nextMonth(month)}},_max:{kanbanOrder:true}});
  await prisma.$transaction(async tx=>{await tx.lesson.update({where:{id:lessonId},data:{scheduledDate,...planned(),kanbanMaterializedAt:new Date(),kanbanOrder:(order._max.kanbanOrder??-1)+1}});if(lesson.studentId)await tx.lessonPlanningMonth.upsert({where:{studentId_month:{studentId:lesson.studentId,month:monthStart(month)}},update:{},create:{studentId:lesson.studentId,month:monthStart(month)}});else await tx.lessonPlanningMonth.upsert({where:{cohortId_month:{cohortId:lesson.cohortId!,month:monthStart(month)}},update:{},create:{cohortId:lesson.cohortId!,month:monthStart(month)}})});
  refreshLessons();return {id:lessonId,scheduledDate:scheduledDateText,month};
}

export async function updateLessonField(lessonId: string, field: "title" | "goal" | "homeworkText" | "notes" | "colorOverride", formData: FormData) {
  const value = String(formData.get("value") ?? "").trim();
  await prisma.lesson.update({ where: { id: lessonId }, data: { [field]: value || null, ...planned() } });
  refreshLessons();
}

export async function updateLessonDate(lessonId: string, formData: FormData) {
  const scheduledDate = required(formData, "value");
  await prisma.lesson.update({ where: { id: lessonId }, data: { scheduledDate: dateOnly(scheduledDate), ...planned(), kanbanMaterializedAt: new Date() } });
  refreshLessons();
  return scheduledDate;
}

export async function materializeLesson(targetType: "student" | "cohort", targetId: string, candidateId: string | null, formData: FormData) {
  const scheduledDateText = required(formData, "scheduledDate");
  const scheduledDate = dateOnly(scheduledDateText);
  const startMinute = timeToMinute(required(formData, "startTime"));
  const requestedTitle = String(formData.get("title") ?? "").trim();
  const settings = await getTeacherSettings();
  const lesson = await prisma.$transaction(async (tx) => {
    const targetWhere = targetType === "student" ? { studentId: targetId } : { cohortId: targetId };
    const candidate = candidateId ? await tx.lesson.findFirst({ where: { id: candidateId, ...targetWhere, recurringScheduleId: { not: null } } }) : null;
    const order = await tx.lesson.aggregate({ where: { ...targetWhere, kanbanVisible: true, scheduledDate: { gte: dateOnly(`${scheduledDateText.slice(0,7)}-01`), lt: new Date(Date.UTC(scheduledDate.getUTCFullYear(),scheduledDate.getUTCMonth()+1,1)) } }, _max: { kanbanOrder: true } });
    if (candidate) return candidate.kanbanVisible ? candidate : tx.lesson.update({ where: { id: candidate.id }, data: { scheduledDate, startMinute, title: requestedTitle || candidate.title, ...planned(), kanbanMaterializedAt: new Date(), kanbanOrder: (order._max.kanbanOrder ?? -1)+1 } });
    const attendanceStudentIds = targetType === "student" ? [targetId] : (await tx.cohortMembership.findMany({ where: { cohortId: targetId, activeFrom: { lte: scheduledDate }, OR: [{ activeTo: null }, { activeTo: { gte: scheduledDate } }] }, select: { studentId: true } })).map(({studentId})=>studentId);
    return tx.lesson.create({ data: { studentId: targetType === "student" ? targetId : null, cohortId: targetType === "cohort" ? targetId : null, scheduledDate, startMinute, durationMinutes: settings.defaultLessonDuration, title: requestedTitle || "Новый урок", ...planned(), kanbanMaterializedAt: new Date(), kanbanOrder: (order._max.kanbanOrder ?? -1)+1, attendance: { create: attendanceStudentIds.map((studentId)=>({studentId,status:"PLANNED"})) } } });
  });
  refreshLessons();
  return { id:lesson.id, scheduledDate:scheduledDateText };
}

export async function reorderKanbanLessons(month: string, orderedIds: string[]) {
  const lessons = await prisma.lesson.findMany({ where: { id: { in: orderedIds }, kanbanVisible: true }, select: { id:true, scheduledDate:true } });
  if (lessons.length !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length || lessons.some(({scheduledDate})=>scheduledDate.toISOString().slice(0,7)!==month)) throw new Error("Invalid Kanban order");
  await prisma.$transaction(orderedIds.map((id,kanbanOrder)=>prisma.lesson.update({where:{id},data:{kanbanOrder,kanbanVisible:true,manuallyEdited:true}})));
  refreshLessons();
}

export async function moveLessonToMonth(lessonId: string, targetMonth: string, scheduledDateText: string, targetOrder: string[]) {
  if (!scheduledDateText.startsWith(`${targetMonth}-`)) throw new Error("Lesson date must be inside the target month");
  await prisma.$transaction(async tx => {
    const lesson = await tx.lesson.findUniqueOrThrow({where:{id:lessonId},select:{studentId:true,cohortId:true}});
    const targetWhere = lesson.studentId ? {studentId:lesson.studentId} : {cohortId:lesson.cohortId!};
    const monthStart=dateOnly(`${targetMonth}-01`); const [year,month]=targetMonth.split("-").map(Number);
    const existed=await tx.lesson.count({where:{...targetWhere,kanbanVisible:true,id:{not:lessonId},scheduledDate:{gte:monthStart,lt:new Date(Date.UTC(year,month,1))}}});
    await tx.lesson.update({where:{id:lessonId},data:{scheduledDate:dateOnly(scheduledDateText),...planned(),...(existed===0?{kanbanMaterializedAt:new Date()}:{})}});
    const ids=targetOrder.includes(lessonId)?targetOrder:[...targetOrder,lessonId];
    for(const [kanbanOrder,id] of ids.entries()) await tx.lesson.update({where:{id},data:{kanbanOrder}});
  });
  refreshLessons();
}

export async function completeLesson(lessonId: string) {
  await prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.update({ where: { id: lessonId }, data: { status: "COMPLETED", completedAt: new Date(), ...planned() }, select: { studentId: true, cohortId:true, scheduledDate:true } });
    const expectedStudentIds=lesson.studentId?[lesson.studentId]:(await tx.cohortMembership.findMany({where:{cohortId:lesson.cohortId!,activeFrom:{lte:lesson.scheduledDate},OR:[{activeTo:null},{activeTo:{gte:lesson.scheduledDate}}]},select:{studentId:true}})).map(({studentId})=>studentId);
    const existing=await tx.attendance.findMany({where:{lessonId,studentId:{in:expectedStudentIds}},select:{studentId:true,status:true,manuallyEdited:true}});
    for(const value of attendanceAfterLessonCompletion(expectedStudentIds,existing))await tx.attendance.upsert({where:{lessonId_studentId:{lessonId,studentId:value.studentId}},update:{status:value.status,manuallyEdited:value.manuallyEdited},create:{lessonId,studentId:value.studentId,status:value.status,manuallyEdited:value.manuallyEdited}});
  });
  refreshLessons();
}

export async function undoLessonCompletion(lessonId: string) {
  await prisma.$transaction(async tx=>{await tx.lesson.update({ where: { id: lessonId }, data: { status: "PLANNED", completedAt: null, ...planned() } });const records=await tx.attendance.findMany({where:{lessonId},select:{id:true,studentId:true,status:true,manuallyEdited:true}});const safe=attendanceAfterUndoCompletion(records);for(const value of safe)await tx.attendance.update({where:{id:records.find(({studentId})=>studentId===value.studentId)!.id},data:{status:value.status}})});
  refreshLessons();
}

export async function addLessonStage(lessonId: string, formData: FormData) {
  const text = required(formData, "text");
  const aggregate = await prisma.lessonStage.aggregate({ where: { lessonId }, _max: { sortOrder: true } });
  await prisma.lessonStage.create({ data: { lessonId, text, sortOrder: (aggregate._max.sortOrder ?? -1) + 1 } });
  await prisma.lesson.update({ where: { id: lessonId }, data: planned() });
  refreshLessons();
}

export async function updateLessonStage(stageId: string, formData: FormData) {
  const text = required(formData, "text");
  const stage = await prisma.lessonStage.update({ where: { id: stageId }, data: { text }, select: { lessonId: true } });
  await prisma.lesson.update({ where: { id: stage.lessonId }, data: planned() });
  refreshLessons();
}

export async function toggleLessonStage(stageId: string, completed: boolean) {
  const stage = await prisma.lessonStage.update({ where: { id: stageId }, data: { completed }, select: { lessonId: true } });
  await prisma.lesson.update({ where: { id: stage.lessonId }, data: planned() });
  refreshLessons();
}

export async function deleteLessonStage(stageId: string) {
  await prisma.$transaction(async (tx) => {
    const stage = await tx.lessonStage.delete({ where: { id: stageId }, select: { lessonId: true } });
    const remaining = await tx.lessonStage.findMany({ where: { lessonId: stage.lessonId }, orderBy: { sortOrder: "asc" } });
    for (const [sortOrder, item] of remaining.entries()) await tx.lessonStage.update({ where: { id: item.id }, data: { sortOrder } });
    await tx.lesson.update({ where: { id: stage.lessonId }, data: planned() });
  });
  refreshLessons();
}

export async function reorderLessonStages(lessonId: string, orderedIds: string[]) {
  await prisma.$transaction(async (tx) => {
    const stages = await tx.lessonStage.findMany({ where: { lessonId }, orderBy: { sortOrder: "asc" } });
    const reordered = reorderStages(stages, orderedIds);
    await tx.lessonStage.updateMany({ where: { lessonId }, data: { sortOrder: { increment: 1000 } } });
    for (const stage of reordered) await tx.lessonStage.update({ where: { id: stage.id }, data: { sortOrder: stage.sortOrder } });
    await tx.lesson.update({ where: { id: lessonId }, data: planned() });
  });
  refreshLessons();
}

export async function addLessonTag(lessonId: string, formData: FormData) {
  const name = required(formData, "name");
  await prisma.$transaction(async (tx) => {
    const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
    await tx.lessonTag.upsert({ where: { lessonId_tagId: { lessonId, tagId: tag.id } }, update: {}, create: { lessonId, tagId: tag.id } });
    await tx.lesson.update({ where: { id: lessonId }, data: planned() });
  });
  refreshLessons();
}

export async function removeLessonTag(lessonId: string, tagId: string) {
  await prisma.$transaction([
    prisma.lessonTag.delete({ where: { lessonId_tagId: { lessonId, tagId } } }),
    prisma.lesson.update({ where: { id: lessonId }, data: planned() }),
  ]);
  refreshLessons();
}

export async function copyPlanToLesson(sourceLessonId: string, targetLessonId: string) {
  await prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.lesson.findUniqueOrThrow({ where: { id: sourceLessonId }, include: { stages: true, tags: { include: { tag: true } } } }),
      tx.lesson.findUniqueOrThrow({ where: { id: targetLessonId }, select: { studentId: true, cohortId: true } }),
    ]);
    if (source.studentId !== target.studentId || source.cohortId !== target.cohortId) throw new Error("Plans can only be copied within the selected student, pair, or group");
    const plan = copyLessonPlan({ title: source.title, goal: source.goal, homeworkText: source.homeworkText, tags: source.tags.map(({ tag }) => tag.name), stages: source.stages });
    await tx.lesson.update({ where: { id: targetLessonId }, data: { title: plan.title, goal: plan.goal, homeworkText: plan.homeworkText, ...planned() } });
    await tx.lessonStage.deleteMany({ where: { lessonId: targetLessonId } });
    await tx.lessonTag.deleteMany({ where: { lessonId: targetLessonId } });
    if (plan.stages.length) await tx.lessonStage.createMany({ data: plan.stages.map((stage, sortOrder) => ({ lessonId: targetLessonId, text: stage.text, completed: false, sortOrder })) });
    for (const name of plan.tags) {
      const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
      await tx.lessonTag.create({ data: { lessonId: targetLessonId, tagId: tag.id } });
    }
  });
  refreshLessons();
}
