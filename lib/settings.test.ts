import { describe, expect, it } from "vitest";
import { DEFAULT_TEACHER_SETTINGS, validAvatarUrl, validTimezone } from "./settings";

describe("teacher settings", () => {
  it("provides safe beta defaults", () => {
    expect(DEFAULT_TEACHER_SETTINGS).toMatchObject({ displayName: "Маша", timezone: "Europe/Moscow", defaultLessonDuration: 60, currency: "RUB" });
  });

  it("validates IANA timezones", () => {
    expect(validTimezone("Europe/Moscow")).toBe(true);
    expect(validTimezone("Asia/Yekaterinburg")).toBe(true);
    expect(validTimezone("not/a-timezone")).toBe(false);
  });

  it("accepts empty or HTTP(S) avatar URLs and rejects unsafe values", () => {
    expect(validAvatarUrl(null)).toBe(true);
    expect(validAvatarUrl("https://images.example.com/avatar.webp")).toBe(true);
    expect(validAvatarUrl("http://localhost/avatar.png")).toBe(true);
    expect(validAvatarUrl("/uploads/profile/avatar.png")).toBe(false);
    expect(validAvatarUrl("javascript:alert(1)")).toBe(false);
    expect(validAvatarUrl("not a url")).toBe(false);
  });
});
