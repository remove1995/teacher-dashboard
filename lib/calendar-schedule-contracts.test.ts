import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(),path),"utf8");

describe("calendar and schedule action UX", () => {
  it("keeps cancel, reschedule, and remove as separate actions", () => {
    const actions=source("app/actions/calendar.ts");
    expect(actions).toContain("cancelOccurrenceRecord");
    expect(actions).toContain("rescheduleOccurrence");
    expect(actions).toContain("removeOccurrence");
  });

  it("renders expected domain errors inside the calendar sheet", () => {
    const workspace=source("components/calendar-workspace.tsx");
    expect(workspace).toContain("useActionState");
    expect(workspace).toContain('className="calendar-action-error"');
    expect(workspace).toContain("Удалить из расписания");
  });

  it("exposes an editable effective start date for schedule revisions", () => {
    const form=source("components/schedule-form.tsx");
    expect(form).toContain("Новое расписание действует с");
    expect(form).toContain('name="effectiveFrom"');
    expect(form).not.toContain('name="changeFrom"');
  });
});
