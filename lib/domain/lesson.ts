export function homeworkState(lesson: { status: string; homeworkText?: string | null }) {
  const hasHomework = Boolean(lesson.homeworkText?.trim());
  return { hasHomework, needsHomeworkAttention: lesson.status === "COMPLETED" && !hasHomework };
}

export function canUpdateGeneratedLesson(lesson: { scheduledDate: Date; manuallyEdited: boolean }, today: Date) {
  return lesson.scheduledDate >= today && !lesson.manuallyEdited;
}

export function attendanceAfterCompletion(context: "INDIVIDUAL" | "COHORT") {
  return context === "INDIVIDUAL" ? "PRESENT" as const : null;
}

export function aggregateAttendance(statuses: string[]) {
  return { present: statuses.filter((status) => status === "PRESENT").length, total: statuses.length };
}

export type PlanStage = { id: string; text: string; completed: boolean; sortOrder: number };
export type ReusableLessonPlan = { title: string; goal: string | null; homeworkText: string | null; tags: string[]; stages: PlanStage[] };

export function completionTransition(stageCount: number, completedStageCount: number) {
  if (stageCount < 0 || completedStageCount < 0 || completedStageCount > stageCount) throw new Error("Invalid stage counts");
  return { status: "COMPLETED" as const, completedAtRequired: true };
}

export function undoCompletion() {
  return { status: "PLANNED" as const, completedAt: null };
}

export function addStage(stages: PlanStage[], stage: Omit<PlanStage, "sortOrder">) {
  return [...stages, { ...stage, sortOrder: stages.length }];
}

export function editStage(stages: PlanStage[], stageId: string, text: string) {
  return stages.map((stage) => stage.id === stageId ? { ...stage, text } : stage);
}

export function deleteStage(stages: PlanStage[], stageId: string) {
  return stages.filter((stage) => stage.id !== stageId).map((stage, sortOrder) => ({ ...stage, sortOrder }));
}

export function reorderStages(stages: PlanStage[], orderedIds: string[]) {
  if (orderedIds.length !== stages.length || new Set(orderedIds).size !== stages.length || orderedIds.some((id) => !stages.some((stage) => stage.id === id))) throw new Error("Stage order must contain every stage exactly once");
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  return orderedIds.map((id, sortOrder) => ({ ...byId.get(id)!, sortOrder }));
}

export function copyLessonPlan(source: ReusableLessonPlan) {
  return {
    title: source.title,
    goal: source.goal,
    homeworkText: source.homeworkText,
    tags: [...source.tags],
    stages: [...source.stages].sort((a, b) => a.sortOrder - b.sortOrder).map(({ text }) => ({ text, completed: false })),
  };
}

export function emptyLessonPlan() {
  return {
    title: "",
    goal: null,
    homeworkText: null,
    notes: null,
  };
}

export function lessonMatchesSearch(lesson: ReusableLessonPlan & { notes?: string | null }, query: string) {
  const normalized = query.trim().toLocaleLowerCase("ru");
  if (!normalized) return true;
  return [lesson.title, lesson.goal, lesson.homeworkText, lesson.notes, ...lesson.tags, ...lesson.stages.map(({ text }) => text)].filter(Boolean).some((value) => value!.toLocaleLowerCase("ru").includes(normalized));
}

export function lessonMatchesTags(lessonTags: string[], selectedTags: string[]) {
  return selectedTags.every((tag) => lessonTags.includes(tag));
}

export function lessonBelongsToWorkspace(lesson: { studentId: string | null; cohortId: string | null }, target: { type: "student" | "cohort"; id: string }) {
  return target.type === "student" ? lesson.studentId === target.id : lesson.cohortId === target.id;
}

export function isKanbanLesson(lesson:{kanbanVisible:boolean}){return lesson.kanbanVisible;}
export function materializationMode(candidateId:string|null){return candidateId?{kind:"reuse" as const,lessonId:candidateId}:{kind:"create" as const};}

export function defaultLessonDate(input: { source: "recurring"; generatedDate: string } | { source: "manual"; month: string; today: string }) {
  if (input.source === "recurring") return input.generatedDate;
  if (!/^\d{4}-\d{2}$/.test(input.month)) throw new Error("Month must use YYYY-MM format");
  return input.today.startsWith(`${input.month}-`) ? input.today : `${input.month}-01`;
}

export function applyManualLessonDate<T extends { scheduledDate: string; manuallyEdited: boolean }>(lesson: T, scheduledDate: string) {
  return { ...lesson, scheduledDate, manuallyEdited: true };
}

export function groupLessonIdsByMonth(lessons: Array<{ id: string; scheduledDate: string }>) {
  return lessons.reduce<Record<string,string[]>>((groups, lesson) => {
    const month = lesson.scheduledDate.slice(0,7);
    (groups[month] ??= []).push(lesson.id);
    return groups;
  }, {});
}

export function planningMonthRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Invalid planning month");
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Invalid planning month");
  return {
    start: `${month}-01`,
    end: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10),
  };
}

export type KanbanMonth = { key: string; materializedAt?: string | Date | null };

export function orderLessonMonths(months: Array<string | KanbanMonth>, currentMonth: string, focusedMonth?: string) {
  const records = new Map<string, KanbanMonth>();
  for (const month of months) {
    const record = typeof month === "string" ? { key: month } : month;
    const previous = records.get(record.key);
    if (!previous || Number(new Date(record.materializedAt ?? 0)) > Number(new Date(previous.materializedAt ?? 0))) records.set(record.key, record);
  }
  const unique = [...records.values()];
  const recentFirst = (a: KanbanMonth, b: KanbanMonth) => Number(new Date(b.materializedAt ?? 0)) - Number(new Date(a.materializedAt ?? 0)) || b.key.localeCompare(a.key);
  const active = unique.filter(({ key }) => key >= currentMonth).sort(recentFirst);
  const archive = unique.filter(({ key }) => key < currentMonth).sort((a,b) => b.key.localeCompare(a.key));
  if (focusedMonth) {
    const index = active.findIndex(({ key }) => key === focusedMonth);
    if (index > 0) active.unshift(...active.splice(index,1));
  }
  return [...active, ...archive].map(({ key }) => key);
}

export type KanbanLesson = { id: string; scheduledDate: string | Date; startMinute: number; status: string; kanbanOrder?: number | null };

export function sortKanbanLessons<T extends KanbanLesson>(lessons: T[], today: string) {
  const hasManualOrder = lessons.some(({ kanbanOrder }) => kanbanOrder !== null && kanbanOrder !== undefined);
  if (hasManualOrder) return [...lessons].sort((a,b) => (a.kanbanOrder ?? Number.MAX_SAFE_INTEGER) - (b.kanbanOrder ?? Number.MAX_SAFE_INTEGER));
  const date = (lesson: T) => typeof lesson.scheduledDate === "string" ? lesson.scheduledDate.slice(0,10) : lesson.scheduledDate.toISOString().slice(0,10);
  const upcoming = (lesson: T) => lesson.status === "PLANNED" && date(lesson) >= today;
  return [...lessons].sort((a,b) => {
    if (upcoming(a) !== upcoming(b)) return upcoming(a) ? -1 : 1;
    const direction = upcoming(a) ? 1 : -1;
    return direction * (date(a).localeCompare(date(b)) || a.startMinute - b.startMinute);
  });
}

export function chooseNextGeneratedOccurrence<T extends { scheduledDate: string | Date; startMinute: number }>(lessons: T[], month: string, today: string) {
  const inMonth = lessons.filter((lesson) => (typeof lesson.scheduledDate === "string" ? lesson.scheduledDate : lesson.scheduledDate.toISOString()).startsWith(month));
  return [...inMonth].sort((a,b) => {
    const ad = typeof a.scheduledDate === "string" ? a.scheduledDate.slice(0,10) : a.scheduledDate.toISOString().slice(0,10);
    const bd = typeof b.scheduledDate === "string" ? b.scheduledDate.slice(0,10) : b.scheduledDate.toISOString().slice(0,10);
    const aUpcoming = ad >= today, bUpcoming = bd >= today;
    return aUpcoming !== bUpcoming ? (aUpcoming ? -1 : 1) : ad.localeCompare(bd) || a.startMinute-b.startMinute;
  })[0] ?? null;
}

export function suggestDateInMonth(currentDate: string, targetMonth: string) {
  const day = Number(currentDate.slice(8,10));
  const [year, month] = targetMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${targetMonth}-${String(Math.min(day,lastDay)).padStart(2,"0")}`;
}

export type KanbanContainer<T> = { key:string; lessons:T[] };

export function findKanbanContainer<T extends {id:string}>(containers:KanbanContainer<T>[], id:string){
  if(id.startsWith("month:")) return containers.find(({key})=>key===id.slice(6))?.key;
  return containers.find(({lessons})=>lessons.some(lesson=>lesson.id===id))?.key;
}

export function moveKanbanCard<T extends {id:string}>(containers:KanbanContainer<T>[],activeId:string,overId:string){
  const source=findKanbanContainer(containers,activeId),target=findKanbanContainer(containers,overId);
  if(!source||!target||source===target)return {containers,source,target};
  const next=containers.map(container=>({...container,lessons:[...container.lessons]}));
  const sourceColumn=next.find(({key})=>key===source)!,targetColumn=next.find(({key})=>key===target)!;
  const index=sourceColumn.lessons.findIndex(({id})=>id===activeId);const [lesson]=sourceColumn.lessons.splice(index,1);
  const overIndex=overId.startsWith("month:")?targetColumn.lessons.length:targetColumn.lessons.findIndex(({id})=>id===overId);
  targetColumn.lessons.splice(overIndex<0?targetColumn.lessons.length:overIndex,0,lesson);
  return {containers:next,source,target};
}

export function addPlanningMonth(months:string[],month:string){return [...new Set([month,...months])];}
export function removePlanningMonth(months:string[],month:string){return months.filter(value=>value!==month);}
export function adjacentPlanningMonth(months:string[],selected:string,direction:-1|1){const index=Math.max(0,months.indexOf(selected));return months[Math.min(months.length-1,Math.max(0,index+direction))]??null;}
export function selectedMonthAfterRemoval(months:string[],removed:string){const index=months.indexOf(removed),remaining=removePlanningMonth(months,removed);return remaining[Math.min(Math.max(index,0),remaining.length-1)]??null;}
export function horizontalMonthSwipe(deltaX:number,deltaY:number,threshold=48){if(Math.abs(deltaX)<threshold||Math.abs(deltaX)<=Math.abs(deltaY)*1.5)return null;return deltaX<0?1 as const:-1 as const;}
export function moveLessonDate<T extends {id:string;scheduledDate:string}>(lesson:T,scheduledDate:string){return {...lesson,scheduledDate};}
