import { describe, expect, it } from "vitest";
import { copyText, nativeShare, shareOrCopy } from "./share";

describe("shared browser output", () => {
  it("copies the current text", async () => { let copied = ""; expect(await copyText("current", { writeText: async (text) => { copied = text; } })).toBe(true); expect(copied).toBe("current"); });
  it("shares the current text", async () => { let shared = ""; expect(await nativeShare({ title: "Homework", text: "current homework" }, async (payload) => { shared = payload.text ?? ""; })).toBe("shared"); expect(shared).toBe("current homework"); });
  it("handles unsupported sharing", async () => expect(await nativeShare({ title: "Report", text: "draft" })).toBe("unsupported"));
  it("handles share cancellation", async () => expect(await nativeShare({ title: "Report", text: "draft" }, async () => { throw new DOMException("cancel", "AbortError"); })).toBe("cancelled"));
  it("copies the current text when native sharing is unavailable", async () => { let copied = ""; expect(await shareOrCopy({ title: "Homework", text: "current homework" }, undefined, { writeText: async (text) => { copied = text; } })).toBe("copied"); expect(copied).toBe("current homework"); });
});
