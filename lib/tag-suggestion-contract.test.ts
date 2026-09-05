import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("tag suggestion visibility", () => {
  it("archives only suggestion visibility while preserving tag relations", () => {
    const schema = source("prisma/schema.prisma");
    const actions = source("app/actions/lessons.ts");
    const page = source("app/lessons/page.tsx");
    expect(schema).toContain("suggestionHiddenAt DateTime?");
    expect(actions).toContain("data: { suggestionHiddenAt: new Date() }");
    expect(actions).not.toContain("export async function hideTagSuggestion(tagId: string) {\n  await prisma.tag.delete");
    expect(page).toContain("allTags.filter(({suggestionHiddenAt})=>!suggestionHiddenAt)");
  });
});
