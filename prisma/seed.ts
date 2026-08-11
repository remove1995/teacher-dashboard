import { PrismaClient } from "@prisma/client";
import { generateLessonsForSchedule } from "../lib/services/schedule-service";

const prisma = new PrismaClient();
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  await prisma.attachment.deleteMany();
  await prisma.lessonTag.deleteMany();
  await prisma.cohortTag.deleteMany();
  await prisma.studentTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.learningRecord.deleteMany();
  await prisma.credit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.lessonStage.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.scheduleException.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.recurringSchedule.deleteMany();
  await prisma.billingProfile.deleteMany();
  await prisma.cohortMembership.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.student.deleteMany();

  const students = await Promise.all([
    prisma.student.create({ data: { id: "student-alina", name: "Алина Морозова", color: "#6F8F7A", status: "ACTIVE", yearOrLevel: "B1", notesPrivate: "Готовится к переходу на уровень B2." } }),
    prisma.student.create({ data: { id: "student-adam", name: "Адам Волков", color: "#8B82B8", status: "ACTIVE", yearOrLevel: "A2" } }),
    prisma.student.create({ data: { id: "student-daniel", name: "Даниэль Ким", color: "#B98271", status: "ACTIVE", yearOrLevel: "A2" } }),
    prisma.student.create({ data: { id: "student-masha", name: "Маша Орлова", color: "#C08A4A", status: "ACTIVE", yearOrLevel: "A1" } }),
    prisma.student.create({ data: { id: "student-sonya", name: "Соня Лебедева", color: "#568994", status: "ACTIVE", yearOrLevel: "A1" } }),
    prisma.student.create({ data: { id: "student-kirill", name: "Кирилл Петров", color: "#7A8DB6", status: "ACTIVE", yearOrLevel: "A1" } }),
    prisma.student.create({ data: { id: "student-rita", name: "Рита Соколова", color: "#A16E8B", status: "ACTIVE", yearOrLevel: "A1" } }),
    prisma.student.create({ data: { id: "student-lev", name: "Лев Иванов", color: "#788D55", status: "PAUSED", yearOrLevel: "A1" } }),
  ]);

  const [pair, group] = await Promise.all([
    prisma.cohort.create({ data: { id: "cohort-pair-adam-daniel", name: "Адам / Даниэль", kind: "PAIR", color: "#8B82B8", activeFrom: date("2026-01-12"), defaultRateMinor: 200000 } }),
    prisma.cohort.create({ data: { id: "cohort-gogetter", name: "GoGetter Group", kind: "GROUP", color: "#D29B58", activeFrom: date("2026-01-12"), defaultRateMinor: 450000 } }),
  ]);

  await prisma.cohortMembership.createMany({ data: [
    { id: "membership-adam-pair", studentId: "student-adam", cohortId: pair.id, activeFrom: date("2026-01-12") },
    { id: "membership-daniel-pair", studentId: "student-daniel", cohortId: pair.id, activeFrom: date("2026-01-12") },
    { id: "membership-masha-group", studentId: "student-masha", cohortId: group.id, activeFrom: date("2026-01-12") },
    { id: "membership-sonya-group", studentId: "student-sonya", cohortId: group.id, activeFrom: date("2026-01-12") },
    { id: "membership-kirill-group", studentId: "student-kirill", cohortId: group.id, activeFrom: date("2026-01-12") },
    { id: "membership-rita-group", studentId: "student-rita", cohortId: group.id, activeFrom: date("2026-01-12") },
    { id: "membership-lev-group", studentId: "student-lev", cohortId: group.id, activeFrom: date("2026-01-12"), activeTo: date("2026-07-31") },
  ] });

  await prisma.billingProfile.createMany({ data: [
    { id: "billing-alina-monthly", studentId: "student-alina", model: "MONTHLY_PREPAID", amountMinor: 250000, effectiveFrom: date("2026-01-01") },
    { id: "billing-adam-weekly", studentId: "student-adam", cohortId: pair.id, model: "WEEKLY_PREPAID", amountMinor: 200000, effectiveFrom: date("2026-01-01") },
    { id: "billing-daniel-per-lesson", studentId: "student-daniel", cohortId: pair.id, model: "PAY_PER_LESSON", amountMinor: 220000, effectiveFrom: date("2026-01-01") },
    { id: "billing-masha-group", studentId: "student-masha", cohortId: group.id, model: "GROUP_SUBSCRIPTION", amountMinor: 300000, effectiveFrom: date("2026-01-01") },
    { id: "billing-sonya-group", studentId: "student-sonya", cohortId: group.id, model: "GROUP_SUBSCRIPTION", amountMinor: 450000, effectiveFrom: date("2026-01-01") },
    { id: "billing-kirill-group", studentId: "student-kirill", cohortId: group.id, model: "GROUP_SUBSCRIPTION", amountMinor: 450000, effectiveFrom: date("2026-01-01") },
    { id: "billing-rita-group", studentId: "student-rita", cohortId: group.id, model: "GROUP_SUBSCRIPTION", amountMinor: 450000, effectiveFrom: date("2026-01-01") },
  ] });

  await prisma.recurringSchedule.create({ data: { id: "schedule-alina", studentId: "student-alina", effectiveFrom: date("2026-08-01"), effectiveTo: date("2027-05-31"), timezone: "Europe/Moscow", slots: { create: [{ weekday: 2, startMinute: 990, durationMinutes: 60 }, { weekday: 5, startMinute: 990, durationMinutes: 60 }] } } });
  await prisma.recurringSchedule.create({ data: { id: "schedule-pair", cohortId: pair.id, effectiveFrom: date("2026-08-01"), effectiveTo: date("2027-05-31"), timezone: "Europe/Moscow", slots: { create: [{ weekday: 3, startMinute: 930, durationMinutes: 60 }] }, exceptions: { create: [{ occurrenceDate: date("2026-08-19"), kind: "OCCURRENCE_OVERRIDE", replacementDate: date("2026-08-20"), replacementStartMinute: 960, replacementDurationMinutes: 60, note: "Перенос по просьбе учеников" }] } } });
  await prisma.recurringSchedule.create({ data: { id: "schedule-group", cohortId: group.id, effectiveFrom: date("2026-08-01"), effectiveTo: date("2027-05-31"), timezone: "Europe/Moscow", slots: { create: [{ weekday: 1, startMinute: 1080, durationMinutes: 75 }, { weekday: 4, startMinute: 1080, durationMinutes: 75 }] } } });

  await prisma.lesson.create({ data: { id: "lesson-alina-completed", studentId: "student-alina", scheduledDate: date("2026-08-04"), startMinute: 990, durationMinutes: 60, title: "Travel stories", goal: "Практика Past Simple и Past Continuous", status: "COMPLETED", completedAt: new Date("2026-08-04T15:31:00.000Z"), recurringScheduleId: "schedule-alina", scheduleRevision: 1, generationKey: "schedule-alina:2026-08-04:990", stages: { create: [{ text: "Warm-up", completed: true, sortOrder: 0 }, { text: "Story sequencing", completed: true, sortOrder: 1 }, { text: "Speaking practice", completed: false, sortOrder: 2 }] }, attendance: { create: { studentId: "student-alina", status: "PRESENT" } } } });
  await prisma.lesson.create({ data: { id: "lesson-alina-cancelled", studentId: "student-alina", scheduledDate: date("2026-08-07"), startMinute: 990, durationMinutes: 60, title: "Making plans", status: "CANCELLED", recurringScheduleId: "schedule-alina", scheduleRevision: 1, generationKey: "schedule-alina:2026-08-07:990", attendance: { create: { studentId: "student-alina", status: "CANCELLED" } } } });
  await prisma.lesson.create({ data: { id: "lesson-pair-original", cohortId: pair.id, scheduledDate: date("2026-08-19"), startMinute: 930, durationMinutes: 60, title: "Comparatives", status: "RESCHEDULED", recurringScheduleId: "schedule-pair", scheduleRevision: 1, generationKey: "schedule-pair:2026-08-19:930", attendance: { create: [{ studentId: "student-adam", status: "RESCHEDULED" }, { studentId: "student-daniel", status: "RESCHEDULED" }] } } });
  await prisma.lesson.create({ data: { id: "lesson-pair-replacement", cohortId: pair.id, scheduledDate: date("2026-08-20"), startMinute: 960, durationMinutes: 60, title: "Comparatives", status: "COMPLETED", completedAt: new Date("2026-08-20T14:01:00.000Z"), originalLessonId: "lesson-pair-original", manuallyEdited: true, homeworkText: "Workbook p. 42, ex. 3–5", attendance: { create: [{ studentId: "student-adam", status: "PRESENT" }, { studentId: "student-daniel", status: "ABSENT", note: "Заболел" }] } } });
  await prisma.lesson.create({ data: { id: "lesson-group-completed", cohortId: group.id, scheduledDate: date("2026-08-06"), startMinute: 1080, durationMinutes: 75, title: "Food and restaurants", goal: "Заказ еды и вежливые просьбы", status: "COMPLETED", completedAt: new Date("2026-08-06T17:16:00.000Z"), recurringScheduleId: "schedule-group", scheduleRevision: 1, generationKey: "schedule-group:2026-08-06:1080", homeworkText: "Подготовить собственное меню", attendance: { create: [{ studentId: "student-masha", status: "PRESENT" }, { studentId: "student-sonya", status: "PRESENT" }, { studentId: "student-kirill", status: "ABSENT" }, { studentId: "student-rita", status: "PRESENT" }] } } });
  await prisma.lesson.create({ data: { id: "lesson-group-planned", cohortId: group.id, scheduledDate: date("2026-08-13"), startMinute: 1080, durationMinutes: 75, title: "At the market", status: "PLANNED", recurringScheduleId: "schedule-group", scheduleRevision: 1, generationKey: "schedule-group:2026-08-13:1080", manuallyEdited: true, attendance: { create: [{ studentId: "student-masha", status: "PLANNED" }, { studentId: "student-sonya", status: "PLANNED" }, { studentId: "student-kirill", status: "PLANNED" }, { studentId: "student-rita", status: "PLANNED" }] } } });

  await prisma.lesson.updateMany({
    where: { id: { in: ["lesson-alina-completed", "lesson-alina-cancelled", "lesson-pair-original", "lesson-pair-replacement", "lesson-group-completed", "lesson-group-planned"] } },
    data: { kanbanVisible: true, kanbanMaterializedAt: new Date("2026-08-11T12:00:00.000Z") },
  });

  await prisma.attendance.updateMany({
    where: { lessonId: { in: ["lesson-pair-replacement", "lesson-group-completed"] }, status: { not: "PLANNED" } },
    data: { manuallyEdited: true },
  });

  await prisma.payment.createMany({ data: [
    { id: "payment-alina-aug", studentId: "student-alina", billingProfileId: "billing-alina-monthly", periodLabel: "Август 2026", periodStart: date("2026-08-01"), periodEnd: date("2026-08-31"), paymentDate: date("2026-08-01"), suggestedAmountMinor: 1750000, actualAmountMinor: 1750000, calculationNote: "8 × 2 500 ₽ − 2 500 ₽ перенос", billingModel: "MONTHLY_PREPAID", status: "PAID" },
    { id: "payment-adam-week", studentId: "student-adam", cohortId: pair.id, billingProfileId: "billing-adam-weekly", periodLabel: "17–23 августа 2026", periodStart: date("2026-08-17"), periodEnd: date("2026-08-23"), suggestedAmountMinor: 200000, actualAmountMinor: 200000, calculationNote: "1 × 2 000 ₽", billingModel: "WEEKLY_PREPAID", status: "PAID" },
    { id: "payment-daniel-aug", studentId: "student-daniel", cohortId: pair.id, billingProfileId: "billing-daniel-per-lesson", periodLabel: "Август 2026", periodStart: date("2026-08-01"), periodEnd: date("2026-08-31"), suggestedAmountMinor: 660000, actualAmountMinor: 330000, calculationNote: "3 завершённых неоплаченных урока × 2 200 ₽; внесено частично", manuallyOverridden: true, paymentDate: date("2026-08-21"), billingModel: "PAY_PER_LESSON", status: "PARTIALLY_PAID" },
    { id: "payment-masha-aug", studentId: "student-masha", cohortId: group.id, billingProfileId: "billing-masha-group", periodLabel: "Август 2026", periodStart: date("2026-08-01"), periodEnd: date("2026-08-31"), paymentDate: date("2026-08-02"), suggestedAmountMinor: 300000, actualAmountMinor: 300000, calculationNote: "Индивидуальная цена участника 3 000 ₽", billingModel: "GROUP_SUBSCRIPTION", status: "PAID", receiptUrl: "https://example.com/receipts/masha-august" },
    { id: "payment-sonya-aug", studentId: "student-sonya", cohortId: group.id, billingProfileId: "billing-sonya-group", periodLabel: "Август 2026", periodStart: date("2026-08-01"), periodEnd: date("2026-08-31"), suggestedAmountMinor: 450000, actualAmountMinor: 0, calculationNote: "Стандартная цена группы 4 500 ₽", billingModel: "GROUP_SUBSCRIPTION", status: "OVERDUE" },
    { id: "payment-kirill-aug-part-1", studentId: "student-kirill", cohortId: group.id, billingProfileId: "billing-kirill-group", periodLabel: "Август 2026", periodStart: date("2026-08-01"), periodEnd: date("2026-08-31"), paymentDate: date("2026-08-03"), suggestedAmountMinor: 450000, actualAmountMinor: 200000, calculationNote: "Абонемент группы 4 500 ₽", billingModel: "GROUP_SUBSCRIPTION", status: "PARTIALLY_PAID", comment: "Первая часть" },
    { id: "payment-kirill-aug-part-2", studentId: "student-kirill", cohortId: group.id, billingProfileId: "billing-kirill-group", periodLabel: "Август 2026", periodStart: date("2026-08-01"), periodEnd: date("2026-08-31"), paymentDate: date("2026-08-10"), suggestedAmountMinor: 450000, actualAmountMinor: 250000, calculationNote: "Абонемент группы 4 500 ₽", billingModel: "GROUP_SUBSCRIPTION", status: "PARTIALLY_PAID", comment: "Остаток" },
    { id: "payment-rita-aug", studentId: "student-rita", cohortId: group.id, billingProfileId: "billing-rita-group", periodLabel: "Август 2026", periodStart: date("2026-08-01"), periodEnd: date("2026-08-31"), paymentDate: date("2026-08-05"), suggestedAmountMinor: 450000, actualAmountMinor: 500000, calculationNote: "Абонемент группы 4 500 ₽", billingModel: "GROUP_SUBSCRIPTION", status: "PAID", comment: "Переплата 500 ₽ сохранена в балансе" },
  ] });

  await prisma.credit.create({ data: { id: "credit-alina-cancelled", studentId: "student-alina", sourceLessonId: "lesson-alina-cancelled", sourcePeriodLabel: "Август 2026", amountMinor: 250000, lessonEquivalent: 1, destinationPeriodLabel: "Сентябрь 2026", status: "AVAILABLE", confirmedAt: new Date("2026-08-08T09:00:00.000Z"), note: "Учитель подтвердил перенос: оплаченный урок отменён и не будет отработан." } });

  const vocabulary = await prisma.learningRecord.create({ data: { id: "learning-alina-travel", studentId: "student-alina", kind: "VOCABULARY", entryDate: date("2026-08-04"), title: "Travel stories", content: "miss a flight; book accommodation; get lost", parentFacing: true, sourceLessonId: "lesson-alina-completed" } });
  await prisma.learningRecord.create({ data: { id: "learning-alina-note", studentId: "student-alina", kind: "NOTE", entryDate: date("2026-08-04"), title: "Фокус на следующую неделю", content: "Продолжить работу над окончаниями прошедшего времени.", parentFacing: false, sourceLessonId: "lesson-alina-completed" } });
  const test = await prisma.testResult.create({ data: { id: "test-alina-unit-3", studentId: "student-alina", title: "Unit 3 Test", testDate: date("2026-08-05"), score: 42, maxScore: 50, percentage: 84, comment: "Уверенная лексика, повторить вопросы в Past Simple." } });
  await prisma.attachment.createMany({ data: [
    { id: "attachment-vocabulary", fileName: "travel-vocabulary.png", mediaType: "image/png", externalUrl: "https://example.com/demo/travel-vocabulary.png", learningRecordId: vocabulary.id },
    { id: "attachment-test", fileName: "unit-3-test.pdf", mediaType: "application/pdf", externalUrl: "https://example.com/demo/unit-3-test.pdf", testResultId: test.id },
    { id: "attachment-receipt", fileName: "receipt-masha-august.pdf", mediaType: "application/pdf", externalUrl: "https://example.com/receipts/masha-august.pdf", paymentId: "payment-masha-aug" },
  ] });

  await prisma.tag.create({ data: { id: "tag-gogetter", name: "GoGetter", cohorts: { create: [{ cohortId: group.id }] } } });
  await prisma.tag.create({ data: { id: "tag-speaking", name: "Speaking", students: { create: [{ studentId: students[0].id }] }, lessons: { create: [{ lessonId: "lesson-alina-completed" }] } } });

  await generateLessonsForSchedule(prisma, "schedule-alina");
  await generateLessonsForSchedule(prisma, "schedule-pair");
  await generateLessonsForSchedule(prisma, "schedule-group");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
