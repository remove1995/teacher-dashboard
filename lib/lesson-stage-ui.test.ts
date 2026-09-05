import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("lesson stage editor UI", () => {
  it("uses an auto-growing multiline editor and preserves handle-only dragging", () => {
    const component = source("components/lesson-workspace-controls.tsx");

    expect(component).toContain("<textarea");
    expect(component).toContain('className="stage-name"');
    expect(component).toContain('textarea.style.height = `${textarea.scrollHeight}px`');
    expect(component).toContain('className="stage-drag-handle"');
    expect(component).toContain("draggable");
  });

  it("allows wrapped stage text and visibly distinguishes completed stages", () => {
    const css = source("app/globals.css");

    expect(css).toMatch(/\.stage-edit-row \.stage-name\{[^}]*white-space:pre-wrap/);
    expect(css).toMatch(/\.stage-edit-row \.stage-name\{[^}]*overflow-wrap:anywhere/);
    expect(css).toMatch(/input\[type=checkbox\]:checked\) \.stage-name\{[^}]*text-decoration:line-through/);
    expect(css).not.toMatch(/\.stage-edit-row \.stage-name\{[^}]*text-overflow:ellipsis/);
  });
});
