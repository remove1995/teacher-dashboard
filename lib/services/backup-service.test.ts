import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { BACKUP_MODEL_NAMES, buildTutorFlowBackup, serializeBackupValue, type TutorFlowBackupData } from "./backup-service";

const emptyData = () => Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, []])) as unknown as TutorFlowBackupData;

describe("TutorFlow application backup", () => {
  it("has a versioned envelope and produces valid JSON", () => {
    const backup = buildTutorFlowBackup(emptyData(), new Date("2026-09-05T09:30:00.000Z"));
    expect(backup).toMatchObject({ format: "tutorflow-backup", version: 1, createdAt: "2026-09-05T09:30:00.000Z" });
    expect(JSON.parse(JSON.stringify(backup))).toEqual(backup);
  });

  it("preserves records, identifiers, foreign keys, and archived students", () => {
    const data = emptyData();
    data.Student = [{ id: "student-1", name: "Archived", archivedAt: "2026-08-01T00:00:00.000Z" }];
    data.Cohort = [{ id: "cohort-1", name: "Pair" }];
    data.CohortMembership = [{ id: "membership-1", studentId: "student-1", cohortId: "cohort-1" }];
    data.RecurringSchedule = [{ id: "schedule-1", studentId: null, cohortId: "cohort-1" }];
    data.Lesson = [{ id: "lesson-1", cohortId: "cohort-1", recurringScheduleId: "schedule-1", originalLessonId: null }];
    data.BillingProfile = [{ id: "billing-1", studentId: "student-1", membershipId: "membership-1", amountMinor: 600000 }];
    data.Payment = [{ id: "payment-1", studentId: "student-1", billingProfileId: "billing-1", actualAmountMinor: 150000 }];
    data.Attendance = [{ id: "attendance-1", lessonId: "lesson-1", studentId: "student-1" }];
    data.LearningRecord = [{ id: "record-1", studentId: "student-1", sourceLessonId: "lesson-1" }];

    const backup = buildTutorFlowBackup(data);
    expect(backup.data.Student).toEqual(data.Student);
    expect(backup.data.CohortMembership[0]).toMatchObject({ studentId: "student-1", cohortId: "cohort-1" });
    expect(backup.data.Lesson[0]).toMatchObject({ cohortId: "cohort-1", recurringScheduleId: "schedule-1" });
    expect(backup.data.Payment[0]).toMatchObject({ billingProfileId: "billing-1", actualAmountMinor: 150000 });
    expect(backup.data.Attendance[0]).toMatchObject({ lessonId: "lesson-1", studentId: "student-1" });
    expect(backup.data.LearningRecord[0]).toMatchObject({ sourceLessonId: "lesson-1" });
  });

  it("serializes dates, Decimal money equivalents, and BigInt without precision loss", () => {
    expect(serializeBackupValue({ at: new Date("2026-09-05T10:11:12.000Z"), decimal: new Prisma.Decimal("123456789.12"), large: 9007199254740993n }))
      .toEqual({ at: "2026-09-05T10:11:12.000Z", decimal: "123456789.12", large: "9007199254740993" });
  });

  it("covers every Prisma model so schema additions require an explicit backup decision", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const schemaModels = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]).sort();
    expect([...BACKUP_MODEL_NAMES].sort()).toEqual(schemaModels);
  });

  it("contains no authentication or environment secret fields", () => {
    const json = JSON.stringify(buildTutorFlowBackup(emptyData())).toLowerCase();
    for (const forbidden of ["database_url", "session_secret", "password_hash", "tutorflow_password", ".env", "cookie", "token"]) expect(json).not.toContain(forbidden);
  });
});
