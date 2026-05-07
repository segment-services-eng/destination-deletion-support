import { describe, it, expect } from "vitest";
import { MANUAL_OVERRIDES } from "./overrides";

describe("MANUAL_OVERRIDES", () => {
  it("is an array (may be empty when all destinations are auto-detected)", () => {
    expect(Array.isArray(MANUAL_OVERRIDES)).toBe(true);
  });

  it("contains valid destination objects if any exist", () => {
    MANUAL_OVERRIDES.forEach((dest) => {
      expect(dest.slug).toBeTruthy();
      expect(dest.name).toBeTruthy();
      expect(dest.type).toBeTruthy();
      expect(dest.repo).toBeTruthy();
      expect(dest.status).toBe("active");
    });
  });
});
