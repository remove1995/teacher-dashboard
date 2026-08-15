import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 6 UI contracts", () => {
  it("does not duplicate Student Profile tab destinations under the identity", () => { const page = source("app/students/[studentId]/page.tsx"); expect(page).not.toContain('>История</Link><Link className="secondary-button"'); expect(page).toContain("Редактировать профиль"); });
  it("keeps contextual Learning record editing", () => expect(source("components/learning-profile-workspace.tsx")).toContain(">Изменить</Link>"));
  it("Lessons exposes Kanban without a local Calendar mode", () => { const page = source("app/lessons/page.tsx"); expect(page).toContain("<LessonKanbanBoard"); expect(page).not.toContain("view-toggle"); expect(page).not.toContain(">Календарь</Link>"); });
  it("keeps the global Calendar workspace route", () => expect(source("app/calendar/page.tsx")).toContain("<CalendarWorkspace"));
  it("uses a Cyrillic-capable primary font stack", () => { const css = source("app/globals.css"); expect(css).toContain('"Segoe UI Variable Text","Segoe UI","Noto Sans"'); });
  it("removes presentation copy from the Students workspace", () => { const page = source("app/students/page.tsx"); expect(page).not.toContain("Люди и форматы"); expect(page).not.toContain("Ученики могут заниматься"); expect(page).not.toContain("Персоны"); });
  it("uses the shared Send actions for edited reports and homework", () => { const learning = source("components/learning-profile-workspace.tsx"), lessons = source("components/lesson-workspace-controls.tsx"); expect(learning).toContain("<ShareActions"); expect(lessons).toContain('field === "homeworkText" && <ShareActions'); });
  it("defines the approved editorial color tokens", () => { const css = source("app/globals.css"); expect(css).toContain("--color-background:#F8F4EF"); expect(css).toContain("--color-surface:#FFFDFC"); expect(css).toContain("--color-primary:#6E2335"); expect(css).toContain("--color-secondary:#D9A6A0"); expect(css).toContain("--color-text:#181515"); });
  it("provides a Cyrillic-friendly serif display and sans UI hierarchy", () => { const css = source("app/globals.css"); expect(css).toContain('--font-display:Cambria,"Times New Roman",serif'); expect(css).toContain("font-family:var(--font-display)"); expect(css).toContain("font-family:var(--font-ui)"); });
  it("shows an active desktop navigation state and account card", () => { const shell = source("components/app-shell.tsx"); expect(shell).toContain('className={isCurrent(pathname,href)?"active":""}'); expect(shell).toContain('className="sidebar-account"'); });
  it("uses persisted teacher settings in the shell and dashboard", () => { expect(source("components/app-shell.tsx")).toContain("teacherName"); expect(source("app/page.tsx")).toContain("getTeacherSettings"); expect(source("app/settings/page.tsx")).toContain("saveTeacherSettings"); });
});
