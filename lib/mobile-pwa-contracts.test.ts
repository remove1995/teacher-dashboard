import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("mobile TutorFlow and PWA contracts", () => {
  it("uses non-shrinking horizontally scrollable mobile filters", () => {
    const css = source("app/globals.css");
    expect(css).toContain(".profile-tabs,.students-filters,.attendance-filters,.payment-kind-filter,.payment-status-filter,.calendar-view-toggle,.calendar-filters,.learning-filters,.learning-type-picker");
    expect(css).toContain("overflow-x:auto");
    expect(css).toContain("flex:0 0 auto");
    expect(css).toContain("min-width:max-content");
  });

  it("keeps mobile botanical accents decorative and within fixed viewport layers", () => {
    const css = source("app/globals.css");
    expect(css).toContain('.workspace::before{top:calc(74px + env(safe-area-inset-top));right:-42px;width:198px;height:264px');
    expect(css).toContain('.workspace::after{left:-48px;bottom:calc(10px + env(safe-area-inset-bottom));width:182px;height:243px');
    expect(css).toContain('background-image:url("/assets/decor-branch-peach.png")');
    expect(css).toContain('background-image:url("/assets/decor-branch-sage.png")');
    expect(css).toContain("pointer-events:none");
    expect(css).toContain("overflow-x:clip");
  });

  it("declares a standalone manifest and iOS metadata", () => {
    const manifest = source("app/manifest.ts");
    const layout = source("app/layout.tsx");
    expect(manifest).toContain('name: "TutorFlow"');
    expect(manifest).toContain('display: "standalone"');
    expect(manifest).toContain('start_url: "/"');
    expect(manifest).toContain('purpose: "maskable"');
    expect(layout).toContain("appleWebApp:");
    expect(layout).toContain('viewportFit: "cover"');
  });
});
