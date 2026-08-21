export type DemoStudentStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
export type DemoEntityKind = "INDIVIDUAL" | "PAIR" | "GROUP";
export type DemoLessonStatus = "PLANNED" | "COMPLETED";
export type DemoPaymentStatus = "PAID" | "PARTIALLY_PAID" | "EXPECTED";

export type DemoStudent = {
  id: string;
  name: string;
  level: string;
  format: string;
  status: DemoStudentStatus;
  color: string;
};

export type DemoLesson = {
  id: string;
  entityName: string;
  kind: DemoEntityKind;
  date: string;
  startTime: string;
  durationMinutes: number;
  title: string;
  tags: string[];
  completedStages: number;
  totalStages: number;
  homework: string | null;
  status: DemoLessonStatus;
  color: string;
};

export type DemoPayment = {
  id: string;
  studentName: string;
  context: string;
  billingModel: string;
  expectedMinor: number;
  receivedMinor: number;
  status: DemoPaymentStatus;
};

export const demoSettings = {
  teacherName: "Маша",
  currency: "RUB",
  timezone: "Europe/Moscow",
} as const;

export const demoStudents: DemoStudent[] = [
  { id: "alina", name: "Алина Морозова", level: "B1", format: "Индивидуально", status: "ACTIVE", color: "#6F8F7A" },
  { id: "adam", name: "Адам Волков", level: "A2", format: "Пара · Адам / Даниэль", status: "ACTIVE", color: "#8B82B8" },
  { id: "daniel", name: "Даниэль Ким", level: "A2", format: "Пара · Адам / Даниэль", status: "ACTIVE", color: "#788FA5" },
  { id: "masha-orlova", name: "Маша Орлова", level: "A1", format: "Группа · GoGetter", status: "ACTIVE", color: "#C08A7A" },
  { id: "sonya", name: "Соня Лебедева", level: "A1", format: "Группа · GoGetter", status: "PAUSED", color: "#8B9A7A" },
  { id: "lev", name: "Лев Иванов", level: "A1", format: "Индивидуально", status: "COMPLETED", color: "#9A8E85" },
];

export const demoLessons: DemoLesson[] = [
  { id: "lesson-aug-1", entityName: "Алина Морозова", kind: "INDIVIDUAL", date: "2026-08-21", startTime: "14:30", durationMinutes: 60, title: "Travel plans", tags: ["Speaking", "B1"], completedStages: 2, totalStages: 4, homework: null, status: "PLANNED", color: "#6F8F7A" },
  { id: "lesson-aug-2", entityName: "Адам / Даниэль", kind: "PAIR", date: "2026-08-20", startTime: "16:00", durationMinutes: 60, title: "Food and ordering", tags: ["GoGetter", "Unit 3"], completedStages: 4, totalStages: 4, homework: "Workbook, page 31", status: "COMPLETED", color: "#8B82B8" },
  { id: "lesson-aug-3", entityName: "GoGetter Group", kind: "GROUP", date: "2026-08-22", startTime: "18:30", durationMinutes: 60, title: "Would you like some…?", tags: ["Vocabulary", "Speaking"], completedStages: 1, totalStages: 4, homework: "Food vocabulary", status: "PLANNED", color: "#C08A7A" },
  { id: "lesson-jul-1", entityName: "Алина Морозова", kind: "INDIVIDUAL", date: "2026-07-28", startTime: "14:30", durationMinutes: 60, title: "Past experiences", tags: ["Grammar"], completedStages: 3, totalStages: 3, homework: "Write five sentences", status: "COMPLETED", color: "#6F8F7A" },
  { id: "lesson-jul-2", entityName: "Адам / Даниэль", kind: "PAIR", date: "2026-07-24", startTime: "16:00", durationMinutes: 60, title: "At the café", tags: ["Role play"], completedStages: 3, totalStages: 4, homework: null, status: "COMPLETED", color: "#8B82B8" },
  { id: "lesson-jun-1", entityName: "GoGetter Group", kind: "GROUP", date: "2026-06-18", startTime: "18:30", durationMinutes: 60, title: "Summer review", tags: ["Revision"], completedStages: 5, totalStages: 5, homework: "Summer checklist", status: "COMPLETED", color: "#C08A7A" },
];

export const demoPayments: DemoPayment[] = [
  { id: "payment-1", studentName: "Алина Морозова", context: "Индивидуально", billingModel: "Предоплата за месяц", expectedMinor: 2400000, receivedMinor: 2400000, status: "PAID" },
  { id: "payment-2", studentName: "Адам Волков", context: "Пара · Адам / Даниэль", billingModel: "За урок", expectedMinor: 800000, receivedMinor: 400000, status: "PARTIALLY_PAID" },
  { id: "payment-3", studentName: "Даниэль Ким", context: "Пара · Адам / Даниэль", billingModel: "За урок", expectedMinor: 800000, receivedMinor: 800000, status: "PAID" },
  { id: "payment-4", studentName: "Маша Орлова", context: "GoGetter Group", billingModel: "Абонемент группы", expectedMinor: 450000, receivedMinor: 0, status: "EXPECTED" },
];

export const demoCohorts = [
  { id: "adam-daniel", name: "Адам / Даниэль", kind: "PAIR" as const, participants: 2, color: "#8B82B8" },
  { id: "gogetter", name: "GoGetter Group", kind: "GROUP" as const, participants: 3, color: "#C08A7A" },
];

export function demoLessonMonths() {
  return [...new Set(demoLessons.map((lesson) => lesson.date.slice(0, 7)))].sort().reverse();
}

export function demoPaymentSummary() {
  const expectedMinor = demoPayments.reduce((sum, payment) => sum + payment.expectedMinor, 0);
  const receivedMinor = demoPayments.reduce((sum, payment) => sum + payment.receivedMinor, 0);
  return { expectedMinor, receivedMinor, outstandingMinor: expectedMinor - receivedMinor };
}
