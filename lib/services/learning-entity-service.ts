import { dateOnly, toDateInput } from "@/lib/domain/dates";
import { buildLearningEntities } from "@/lib/domain/learning-entities";
import { prisma } from "@/lib/db/prisma";

export async function getActiveLearningEntities(at = new Date()) {
  const day = dateOnly(toDateInput(at));
  const activeWindow = { effectiveFrom: { lte: day }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }] };
  const [students, cohorts] = await Promise.all([
    prisma.student.findMany({
      where: {
        archivedAt: null,
        status: { not: "COMPLETED" },
        OR: [
          { individualSchedules: { some: { status: "ACTIVE", effectiveFrom: { lte: day }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }] } } },
          { billingProfiles: { some: { cohortId: null, ...activeWindow } } },
        ],
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        individualSchedules: { where: { status: "ACTIVE", effectiveFrom: { lte: day }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }] }, select: { id: true } },
        billingProfiles: { where: { cohortId: null, ...activeWindow }, select: { id: true } },
      },
    }),
    prisma.cohort.findMany({
      where: { activeFrom: { lte: day }, OR: [{ activeTo: null }, { activeTo: { gte: day } }] },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true, kind: true },
    }),
  ]);
  return buildLearningEntities(students, cohorts);
}
