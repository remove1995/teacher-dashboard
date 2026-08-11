export const statusLabels = { ACTIVE: "Занимается", PAUSED: "Пауза", COMPLETED: "Обучение завершено" } as const;
export const billingLabels = { MONTHLY_PREPAID: "Предоплата за месяц", WEEKLY_PREPAID: "Предоплата за неделю", PAY_PER_LESSON: "Оплата за урок", GROUP_SUBSCRIPTION: "Абонемент группы" } as const;
export const weekdayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
export const money = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);
export const dateLabel = (value: Date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
