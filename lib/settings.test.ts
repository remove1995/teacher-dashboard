import { describe, expect, it } from "vitest";
import { DEFAULT_TEACHER_SETTINGS, validTimezone } from "./settings";

describe("teacher settings", () => {
  it("provides safe beta defaults", () => {
    expect(DEFAULT_TEACHER_SETTINGS).toMatchObject({ displayName: "Маша", timezone: "Europe/Moscow", defaultLessonDuration: 60, currency: "RUB" });
  });

  it("validates IANA timezones", () => {
    expect(validTimezone("Europe/Moscow")).toBe(true);
    expect(validTimezone("Asia/Yekaterinburg")).toBe(true);
    expect(validTimezone("not/a-timezone")).toBe(false);
  });
});
