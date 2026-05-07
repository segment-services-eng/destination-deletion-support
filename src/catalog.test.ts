import { describe, it, expect } from "vitest";
import { FALLBACK_CATALOG } from "./catalog";

describe("FALLBACK_CATALOG", () => {
  it("contains a large list of destination names", () => {
    expect(FALLBACK_CATALOG.length).toBeGreaterThan(300);
  });

  it("includes well-known destinations", () => {
    expect(FALLBACK_CATALOG).toContain("Amplitude");
    expect(FALLBACK_CATALOG).toContain("Braze");
    expect(FALLBACK_CATALOG).toContain("Google Cloud PubSub");
    expect(FALLBACK_CATALOG).toContain("Intercom");
  });

  it("is sorted alphabetically and contains no duplicates", () => {
    const unique = [...new Set(FALLBACK_CATALOG)];
    expect(FALLBACK_CATALOG.length).toBe(unique.length);

    const sorted = [...FALLBACK_CATALOG].sort((a, b) => a.localeCompare(b));
    expect(FALLBACK_CATALOG).toEqual(sorted);
  });
});

