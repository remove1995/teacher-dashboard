import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("group creation flow contracts", () => {
  it("offers existing and new students in participant rows", () => { const form = source("components/cohort-form.tsx"); expect(form).toContain('value="existing"'); expect(form).toContain('value="new"'); expect(form).toContain("+ Добавить ученика"); });
  it("passes a profile student into the first group flow", () => { const page = source("app/cohorts/new/page.tsx"); expect(page).toContain("query.memberId"); expect(page).toContain("initialMemberIds={initialMemberIds}"); });
  it("creates new students and memberships in the same transaction", () => { const actions = source("app/actions/people.ts"); expect(actions).toContain("const participants = await resolveParticipants(tx, input)"); expect(actions).toContain("await tx.student.create"); expect(actions).toContain("await syncMembers(tx, created.id, input, participants)"); });
  it("does not silently duplicate a student with an existing name", () => expect(source("app/actions/people.ts")).toContain("select the existing profile"));
});
