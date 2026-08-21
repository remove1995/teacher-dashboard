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
  schoolYear: string;
  schedule: string | null;
  focus: string;
  strengths: string;
  attention: string;
  rateMinor: number;
  billingStatus: DemoPaymentStatus;
  lastPaymentDate: string | null;
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
  studentIds: string[];
  goal: string;
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
  defaultLessonDuration: 60,
  interfaceDensity: "Комфортная",
} as const;

export const demoStudents: DemoStudent[] = [
  { id: "alina", name: "Алина Морозова", level: "B1", format: "Индивидуально", status: "ACTIVE", color: "#6F8F7A", schoolYear: "8 класс", schedule: "Понедельник и четверг · 14:30–15:30", focus: "Travel English, свободная речь и Past Simple", strengths: "Уверенно поддерживает диалог и быстро запоминает лексику.", attention: "Нужно закрепить неправильные глаголы и письменную речь.", rateMinor: 300000, billingStatus: "PAID", lastPaymentDate: "2026-08-02" },
  { id: "adam", name: "Адам Волков", level: "A2", format: "Пара · Адам / Даниэль", status: "ACTIVE", color: "#8B82B8", schoolYear: "6 класс", schedule: "Среда · 16:00–17:00", focus: "Food, everyday communication, question forms", strengths: "Активно говорит в парной работе и хорошо воспринимает речь на слух.", attention: "Повторить spelling и порядок слов в вопросах.", rateMinor: 200000, billingStatus: "PARTIALLY_PAID", lastPaymentDate: "2026-08-12" },
  { id: "daniel", name: "Даниэль Ким", level: "A2", format: "Пара · Адам / Даниэль", status: "ACTIVE", color: "#788FA5", schoolYear: "6 класс", schedule: "Среда · 16:00–17:00", focus: "Food, role play and functional language", strengths: "Аккуратно выполняет задания и использует новые фразы в речи.", attention: "Развивать спонтанные ответы без подготовки.", rateMinor: 200000, billingStatus: "PAID", lastPaymentDate: "2026-08-10" },
  { id: "masha-orlova", name: "Маша Орлова", level: "A1", format: "Группа · GoGetter", status: "ACTIVE", color: "#C08A7A", schoolYear: "5 класс", schedule: "Вторник и суббота · 18:30–19:30", focus: "GoGetter Unit 3, food and would like", strengths: "Стала увереннее отвечать без подсказок.", attention: "Повторить spelling vegetables.", rateMinor: 450000, billingStatus: "EXPECTED", lastPaymentDate: "2026-07-03" },
  { id: "sonya", name: "Соня Лебедева", level: "A1", format: "Группа · GoGetter", status: "PAUSED", color: "#8B9A7A", schoolYear: "5 класс", schedule: null, focus: "Базовая лексика и чтение", strengths: "Хорошо работает с визуальными опорами.", attention: "После паузы потребуется повторение Unit 2.", rateMinor: 450000, billingStatus: "EXPECTED", lastPaymentDate: "2026-07-01" },
  { id: "lev", name: "Лев Иванов", level: "A1", format: "Индивидуально", status: "COMPLETED", color: "#9A8E85", schoolYear: "4 класс", schedule: null, focus: "Базовый разговорный курс завершён", strengths: "Освоил основную лексику курса и простые диалоги.", attention: "Рекомендовано продолжить чтение адаптированных текстов.", rateMinor: 250000, billingStatus: "PAID", lastPaymentDate: "2026-06-20" },
];

export const demoLessons: DemoLesson[] = [
  { id: "lesson-aug-1", entityName: "Алина Морозова", kind: "INDIVIDUAL", date: "2026-08-21", startTime: "14:30", durationMinutes: 60, title: "Travel plans", tags: ["Speaking", "B1"], completedStages: 2, totalStages: 4, homework: null, status: "PLANNED", color: "#6F8F7A", studentIds: ["alina"], goal: "Научиться рассказывать о планах поездки и задавать уточняющие вопросы." },
  { id: "lesson-aug-2", entityName: "Адам / Даниэль", kind: "PAIR", date: "2026-08-20", startTime: "16:00", durationMinutes: 60, title: "Food and ordering", tags: ["GoGetter", "Unit 3"], completedStages: 4, totalStages: 4, homework: "Workbook, page 31", status: "COMPLETED", color: "#8B82B8", studentIds: ["adam", "daniel"], goal: "Заказать еду и напитки, используя вежливые фразы." },
  { id: "lesson-aug-3", entityName: "GoGetter Group", kind: "GROUP", date: "2026-08-22", startTime: "18:30", durationMinutes: 60, title: "Would you like some…?", tags: ["Vocabulary", "Speaking"], completedStages: 1, totalStages: 4, homework: "Food vocabulary", status: "PLANNED", color: "#C08A7A", studentIds: ["masha-orlova", "sonya"], goal: "Предлагать еду и отвечать на предложения в коротком диалоге." },
  { id: "lesson-jul-1", entityName: "Алина Морозова", kind: "INDIVIDUAL", date: "2026-07-28", startTime: "14:30", durationMinutes: 60, title: "Past experiences", tags: ["Grammar"], completedStages: 3, totalStages: 3, homework: "Write five sentences", status: "COMPLETED", color: "#6F8F7A", studentIds: ["alina"], goal: "Рассказать о прошлой поездке в Past Simple." },
  { id: "lesson-jul-2", entityName: "Адам / Даниэль", kind: "PAIR", date: "2026-07-24", startTime: "16:00", durationMinutes: 60, title: "At the café", tags: ["Role play"], completedStages: 3, totalStages: 4, homework: null, status: "COMPLETED", color: "#8B82B8", studentIds: ["adam", "daniel"], goal: "Разыграть диалог гостя и официанта." },
  { id: "lesson-jun-1", entityName: "GoGetter Group", kind: "GROUP", date: "2026-06-18", startTime: "18:30", durationMinutes: 60, title: "Summer review", tags: ["Revision"], completedStages: 5, totalStages: 5, homework: "Summer checklist", status: "COMPLETED", color: "#C08A7A", studentIds: ["masha-orlova", "sonya"], goal: "Повторить лексику и грамматику пройденных модулей." },
];

export const demoPayments: DemoPayment[] = [
  { id: "payment-1", studentName: "Алина Морозова", context: "Индивидуально", billingModel: "Предоплата за месяц", expectedMinor: 2400000, receivedMinor: 2400000, status: "PAID" },
  { id: "payment-2", studentName: "Адам Волков", context: "Пара · Адам / Даниэль", billingModel: "За урок", expectedMinor: 800000, receivedMinor: 400000, status: "PARTIALLY_PAID" },
  { id: "payment-3", studentName: "Даниэль Ким", context: "Пара · Адам / Даниэль", billingModel: "За урок", expectedMinor: 800000, receivedMinor: 800000, status: "PAID" },
  { id: "payment-4", studentName: "Маша Орлова", context: "GoGetter Group", billingModel: "Абонемент группы", expectedMinor: 450000, receivedMinor: 0, status: "EXPECTED" },
];

export const demoCohorts = [
  { id: "adam-daniel", name: "Адам / Даниэль", kind: "PAIR" as const, participants: 2, color: "#8B82B8", studentIds: ["adam", "daniel"] },
  { id: "gogetter", name: "GoGetter Group", kind: "GROUP" as const, participants: 3, color: "#C08A7A", studentIds: ["masha-orlova", "sonya"] },
];

export type DemoAttendanceStatus = "PRESENT" | "ABSENT" | "CANCELLED" | "RESCHEDULED" | "PLANNED";
export const demoAttendance = [
  { lessonId: "lesson-aug-1", studentId: "alina", status: "PLANNED" as const },
  { lessonId: "lesson-aug-2", studentId: "adam", status: "PRESENT" as const },
  { lessonId: "lesson-aug-2", studentId: "daniel", status: "ABSENT" as const },
  { lessonId: "lesson-aug-3", studentId: "masha-orlova", status: "PLANNED" as const },
  { lessonId: "lesson-aug-3", studentId: "sonya", status: "PLANNED" as const },
  { lessonId: "lesson-jul-1", studentId: "alina", status: "PRESENT" as const },
  { lessonId: "lesson-jul-2", studentId: "adam", status: "PRESENT" as const },
  { lessonId: "lesson-jul-2", studentId: "daniel", status: "PRESENT" as const },
  { lessonId: "lesson-jun-1", studentId: "masha-orlova", status: "PRESENT" as const },
  { lessonId: "lesson-jun-1", studentId: "sonya", status: "PRESENT" as const },
];

export function demoStudentById(id: string) {
  return demoStudents.find((student) => student.id === id);
}

export function demoStudentLessons(studentId: string) {
  return demoLessons.filter((lesson) => lesson.studentIds.includes(studentId)).sort((a, b) => b.date.localeCompare(a.date));
}

export function demoStudentPayment(studentId: string) {
  const student = demoStudentById(studentId);
  return student ? demoPayments.find((payment) => payment.studentName === student.name) : undefined;
}

export type DemoPeopleFilter = "ALL" | "INDIVIDUAL" | "PAIR" | "GROUP";
export function filterDemoPeople(filter: DemoPeopleFilter, query: string) {
  const normalized = query.trim().toLocaleLowerCase("ru");
  const students = filter === "ALL" || filter === "INDIVIDUAL"
    ? demoStudents.filter((student) => (filter === "ALL" || student.format === "Индивидуально") && student.name.toLocaleLowerCase("ru").includes(normalized))
    : [];
  const cohorts = filter === "ALL" || filter === "PAIR" || filter === "GROUP"
    ? demoCohorts.filter((cohort) => {
      const searchable = `${cohort.name} ${cohort.studentIds.map((id) => demoStudentById(id)?.name ?? "").join(" ")}`.toLocaleLowerCase("ru");
      return (filter === "ALL" || cohort.kind === filter) && searchable.includes(normalized);
    })
    : [];
  return { students, cohorts };
}

export function demoLessonMonths() {
  return [...new Set(demoLessons.map((lesson) => lesson.date.slice(0, 7)))].sort().reverse();
}

export function demoPaymentSummary() {
  const expectedMinor = demoPayments.reduce((sum, payment) => sum + payment.expectedMinor, 0);
  const receivedMinor = demoPayments.reduce((sum, payment) => sum + payment.receivedMinor, 0);
  return { expectedMinor, receivedMinor, outstandingMinor: expectedMinor - receivedMinor };
}
