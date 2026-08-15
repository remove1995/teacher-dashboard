import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.teacherSettings.upsert({
    where: { id: "primary" },
    update: {},
    create: {
      id: "primary",
      displayName: "Маша",
      timezone: "Europe/Moscow",
      defaultLessonDuration: 60,
      currency: "RUB",
    },
  });
}

main()
  .then(() => console.log("Beta settings are ready. No demo business data was created."))
  .finally(() => prisma.$disconnect());
