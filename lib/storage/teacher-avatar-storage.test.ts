import { describe, expect, it } from "vitest";
import { TEACHER_AVATAR_MAX_BYTES, validateTeacherAvatar } from "./teacher-avatar-storage";

describe("teacher avatar validation", () => {
  it("accepts supported images within the limit", () => expect(() => validateTeacherAvatar({ type: "image/webp", size: 1024 } as File)).not.toThrow());
  it("rejects non-image files", () => expect(() => validateTeacherAvatar({ type: "application/pdf", size: 1024 } as File)).toThrow("AVATAR_TYPE"));
  it("rejects oversized images", () => expect(() => validateTeacherAvatar({ type: "image/jpeg", size: TEACHER_AVATAR_MAX_BYTES + 1 } as File)).toThrow("AVATAR_TOO_LARGE"));
});
