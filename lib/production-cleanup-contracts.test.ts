import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("production-use cleanup contracts", () => {
  it("uses neutral cohort name placeholders without default values", () => {
    const form = source("components/cohort-form.tsx");
    expect(form).toContain('placeholder={kind === "PAIR" ? "Пара 1" : "Группа 1"}');
    expect(form).not.toContain('placeholder={kind === "PAIR" ? "Адам / Даниэль"');
  });

  it("uses TutorFlow in user-facing shell branding and metadata", () => {
    const shell = source("components/app-shell.tsx");
    expect(shell).toContain('aria-label="TutorFlow"');
    expect(shell).not.toContain("Teacher Dashboard");
    expect(source("app/layout.tsx")).toContain('title: "TutorFlow"');
  });

  it("passes the persisted teacher avatar into the account panel", () => {
    expect(source("app/layout.tsx")).toContain("teacherAvatarUrl={settings.avatarUrl}");
    expect(source("components/app-shell.tsx")).toContain("<AvatarImage src={teacherAvatarUrl}");
    expect(source("app/settings/actions.ts")).toContain("validAvatarUrl(avatarUrl)");
    expect(source("app/settings/actions.ts")).not.toContain("storeTeacherAvatar");
  });

  it("shows native Send only when browser sharing is available", () => {
    const actions = source("components/share-actions.tsx");
    expect(actions).toContain("canShare ? <button");
    expect(actions).toContain("nativeShare");
    expect(actions).not.toContain("disabled={!canShare}");
  });

  it("gives participant rows the full section width and responsive minmax columns", () => {
    const form = source("components/cohort-form.tsx");
    const css = source("app/globals.css");
    expect(form).toContain("cohort-participants-section");
    expect(css).toContain(".cohort-participants-section{grid-template-columns:minmax(0,1fr)}");
    expect(css).toContain("grid-template-columns:minmax(340px,1.65fr)");
  });

  it("keeps cohort lifecycle dates out of the visible Pair/Group form", () => {
    const form = source("components/cohort-form.tsx");
    expect(form).toContain('<input type="hidden" name="activeFrom"');
    expect(form).toContain('<input type="hidden" name="activeTo"');
    expect(form).not.toContain('<span>Начало</span>');
    expect(form).not.toContain('<span>Окончание</span>');
  });

  it("uses a URL-based teacher avatar preview and cohesive cohort hero", () => {
    expect(source("app/settings/page.tsx")).toContain("<TeacherAvatarUrlField");
    expect(source("components/teacher-avatar-url-field.tsx")).toContain('name="avatarUrl"');
    expect(source("components/teacher-avatar-url-field.tsx")).toContain('type="url"');
    expect(source("app/cohorts/[cohortId]/page.tsx")).toContain("cohort-profile-visual");
    expect(source("app/cohorts/[cohortId]/page.tsx")).toContain('/assets/books-botanical-center.png');
    expect(source("components/cohort-form.tsx")).toContain('name="imageUrl"');
  });
});
