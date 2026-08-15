CREATE TABLE "TeacherSettings" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "displayName" TEXT NOT NULL DEFAULT 'Маша',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "defaultLessonDuration" INTEGER NOT NULL DEFAULT 60,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSettings_pkey" PRIMARY KEY ("id")
);
