import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.teacherSettings.findUnique({ where: { id: "primary" } });

  await prisma.$transaction(async (tx) => {
    await tx.attachment.deleteMany();
    await tx.lessonTag.deleteMany();
    await tx.cohortTag.deleteMany();
    await tx.studentTag.deleteMany();
    await tx.testResult.deleteMany();
    await tx.learningRecord.deleteMany();
    await tx.credit.deleteMany();
    await tx.payment.deleteMany();
    await tx.attendance.deleteMany();
    await tx.lessonStage.deleteMany();
    await tx.lesson.deleteMany();
    await tx.lessonPlanningMonth.deleteMany();
    await tx.scheduleException.deleteMany();
    await tx.scheduleSlot.deleteMany();
    await tx.recurringSchedule.deleteMany();
    await tx.billingProfile.deleteMany();
    await tx.cohortTag.deleteMany();
    await tx.cohortMembership.deleteMany();
    await tx.cohort.deleteMany();
    await tx.studentTag.deleteMany();
    await tx.tag.deleteMany();
    await tx.student.deleteMany();
  });

  if (!settings) {
    await prisma.teacherSettings.create({
      data: { id: "primary", displayName: "Маша", timezone: "Europe/Moscow", defaultLessonDuration: 60, currency: "RUB" },
    });
  }

  const [students, cohorts, lessons, attendance, payments, learningRecords, settingsCount] = await Promise.all([
    prisma.student.count(), prisma.cohort.count(), prisma.lesson.count(), prisma.attendance.count(),
    prisma.payment.count(), prisma.learningRecord.count(), prisma.teacherSettings.count(),
  ]);
  console.log("Business data cleared. Teacher settings preserved.", { students, cohorts, lessons, attendance, payments, learningRecords, settings: settingsCount });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
