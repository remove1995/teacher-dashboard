import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "../app/settings/backup/route";

describe("settings backup endpoint", () => {
  it("rejects an unauthenticated download before reading backup data", async () => {
    const response = await GET(new NextRequest("http://localhost/settings/backup"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
