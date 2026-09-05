import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { setEffectiveBillingProfile } from "./member-billing-service";
import { permanentlyDeleteStudentRecord } from "./student-lifecycle-service";
import { createTrialPaymentCredits } from "./trial-credit-service";

const prisma = new PrismaClient();
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

afterAll(() => prisma.$disconnect());

describe("member-specific billing persistence", () => {
  it("changes one member price without duplicating active context or changing payment history", async () => {
    const student = await prisma.student.create({ data: { name: `Billing ${crypto.randomUUID()}`, color: "#83916f" } });
    const peer = await prisma.student.create({ data: { name: `Peer ${crypto.randomUUID()}`, color: "#83916f" } });
    const cohort = await prisma.cohort.create({ data: { name: `Group ${crypto.randomUUID()}`, kind: "GROUP", color: "#83916f", activeFrom: date("2026-09-01") } });
    try {
      const member = await prisma.cohortMembership.create({ data: { studentId: student.id, cohortId: cohort.id, activeFrom: date("2026-09-01") } });
      const peerMember = await prisma.cohortMembership.create({ data: { studentId: peer.id, cohortId: cohort.id, activeFrom: date("2026-09-01") } });
      const original = await prisma.billingProfile.create({ data: { studentId: student.id, cohortId: cohort.id, membershipId: member.id, model: "GROUP_SUBSCRIPTION", amountMinor: 450000, effectiveFrom: date("2026-09-01") } });
      await prisma.billingProfile.create({ data: { studentId: peer.id, cohortId: cohort.id, membershipId: peerMember.id, model: "GROUP_SUBSCRIPTION", amountMinor: 500000, effectiveFrom: date("2026-09-01") } });
      const payment = await prisma.payment.create({ data: { studentId: student.id, cohortId: cohort.id, billingProfileId: original.id, periodLabel: "Сентябрь 2026", periodStart: date("2026-09-01"), periodEnd: date("2026-09-30"), suggestedAmountMinor: 450000, actualAmountMinor: 450000, billingModel: "GROUP_SUBSCRIPTION", status: "PAID", calculationNote: "Историческая оплата" } });
      await setEffectiveBillingProfile(prisma, { studentId: student.id, cohortId: cohort.id, membershipId: member.id, model: "GROUP_SUBSCRIPTION", amountMinor: 400000, effectiveFrom: "2026-10-01" });
      const profiles = await prisma.billingProfile.findMany({ where: { membershipId: member.id }, orderBy: { effectiveFrom: "asc" } });
      expect(profiles).toHaveLength(2);
      expect(profiles.filter(({ effectiveTo }) => effectiveTo === null)).toHaveLength(1);
      expect(profiles.map(({ amountMinor }) => amountMinor)).toEqual([450000, 400000]);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).actualAmountMinor).toBe(450000);
      expect(await prisma.cohortMembership.findUnique({ where: { id: member.id } })).not.toBeNull();
      expect((await prisma.billingProfile.findFirstOrThrow({ where: { membershipId: peerMember.id } })).amountMinor).toBe(500000);
    } finally {
      await prisma.payment.deleteMany({ where: { studentId: { in: [student.id, peer.id] } } });
      await prisma.billingProfile.deleteMany({ where: { studentId: { in: [student.id, peer.id] } } });
      await prisma.cohortMembership.deleteMany({ where: { cohortId: cohort.id } });
      await prisma.cohort.delete({ where: { id: cohort.id } });
      await permanentlyDeleteStudentRecord(prisma, student.id); await permanentlyDeleteStudentRecord(prisma, peer.id);
    }
  });

  it("keeps trial history while converting or ending membership", async () => {
    const student = await prisma.student.create({ data: { name: `Trial ${crypto.randomUUID()}`, color: "#83916f" } });
    const cohort = await prisma.cohort.create({ data: { name: `Trial group ${crypto.randomUUID()}`, kind: "GROUP", color: "#83916f", activeFrom: date("2026-09-01") } });
    try {
      const member = await prisma.cohortMembership.create({ data: { studentId: student.id, cohortId: cohort.id, activeFrom: date("2026-09-01"), status: "TRIAL", trialLessonDate: date("2026-09-05") } });
      const profile = await prisma.billingProfile.create({ data: { studentId: student.id, cohortId: cohort.id, membershipId: member.id, model: "PAY_PER_LESSON", amountMinor: 150000, effectiveFrom: date("2026-09-05") } });
      const lesson = await prisma.lesson.create({ data: { cohortId: cohort.id, scheduledDate: date("2026-09-05"), startMinute: 900, durationMinutes: 60, title: "Пробный урок", attendance: { create: { studentId: student.id, status: "PRESENT" } } } });
      const payment = await prisma.payment.create({ data: { studentId: student.id, cohortId: cohort.id, billingProfileId: profile.id, periodLabel: "Пробный урок", periodStart: date("2026-09-05"), periodEnd: date("2026-09-05"), suggestedAmountMinor: 150000, actualAmountMinor: 150000, billingModel: "PAY_PER_LESSON", status: "PAID", calculationNote: "Разовая оплата" } });
      await prisma.cohortMembership.update({ where: { id: member.id }, data: { status: "REGULAR", trialLessonDate: null } });
      await setEffectiveBillingProfile(prisma, { studentId: student.id, cohortId: cohort.id, membershipId: member.id, model: "GROUP_SUBSCRIPTION", amountMinor: 450000, effectiveFrom: "2026-09-06" });
      expect(await createTrialPaymentCredits(prisma, { membershipId: member.id, studentId: student.id, cohortId: cohort.id, destinationPeriodLabel: "Сентябрь 2026" })).toBe(150000);
      expect(await createTrialPaymentCredits(prisma, { membershipId: member.id, studentId: student.id, cohortId: cohort.id, destinationPeriodLabel: "Сентябрь 2026" })).toBe(0);
      await prisma.cohortMembership.update({ where: { id: member.id }, data: { activeTo: date("2026-09-30") } });
      expect(await prisma.attendance.findUnique({ where: { lessonId_studentId: { lessonId: lesson.id, studentId: student.id } } })).not.toBeNull();
      expect(await prisma.payment.findUnique({ where: { id: payment.id } })).not.toBeNull();
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).actualAmountMinor).toBe(150000);
      expect(await prisma.credit.count({ where: { sourcePaymentId: payment.id, amountMinor: 150000, status: "AVAILABLE" } })).toBe(1);
      expect(await prisma.student.findUnique({ where: { id: student.id } })).not.toBeNull();
      expect(await prisma.billingProfile.count({ where: { membershipId: member.id } })).toBe(2);
    } finally {
      await prisma.credit.deleteMany({ where: { studentId: student.id } }); await prisma.payment.deleteMany({ where: { studentId: student.id } }); await prisma.attendance.deleteMany({ where: { studentId: student.id } }); await prisma.lesson.deleteMany({ where: { cohortId: cohort.id } }); await prisma.billingProfile.deleteMany({ where: { studentId: student.id } }); await prisma.cohortMembership.deleteMany({ where: { cohortId: cohort.id } }); await prisma.cohort.delete({ where: { id: cohort.id } }); await permanentlyDeleteStudentRecord(prisma, student.id);
    }
  });
});
