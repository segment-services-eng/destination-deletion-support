import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMarkdown } from "./markdown";
import type { Destination } from "./types";

const makeDest = (overrides: Partial<Destination> & { slug: string; name: string }): Destination => ({
  type: "Action Destination",
  repo: "segmentio/action-destinations",
  sourceUrl: `https://github.com/segmentio/action-destinations/blob/main/src/${overrides.slug}/index.ts`,
  status: "active",
  ...overrides,
});

describe("generateMarkdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates header with total and supported counts", () => {
    const destinations: ReadonlyArray<Destination> = [
      makeDest({ slug: "braze", name: "Braze", status: "active" }),
      makeDest({ slug: "dawn", name: "Dawn", status: "commented-out" }),
    ];

    const result = generateMarkdown(destinations);

    expect(result).toContain("**Total: 2** | **Supported: 1**");
    expect(result).toContain("## All Destinations (2)");
  });

  it("includes all destinations in a single table with status column", () => {
    const destinations: ReadonlyArray<Destination> = [
      makeDest({ slug: "braze", name: "Braze", status: "active" }),
      makeDest({ slug: "blackbaud", name: "Blackbaud", status: "noop" }),
      makeDest({ slug: "close", name: "Close", status: "commented-out" }),
    ];

    const result = generateMarkdown(destinations);

    expect(result).toContain("| Deletion Status |");
    expect(result).toContain("| Supported |");
    expect(result).toContain("| Stub/No-Op |");
    expect(result).toContain("| Commented Out |");
  });

  it("sorts all destinations alphabetically by name", () => {
    const destinations: ReadonlyArray<Destination> = [
      makeDest({ slug: "zzz", name: "Zzz" }),
      makeDest({ slug: "aaa", name: "Aaa", status: "noop" }),
      makeDest({ slug: "mmm", name: "Mmm", type: "Legacy Integration" }),
    ];

    const result = generateMarkdown(destinations);
    const aaaIdx = result.indexOf("| 1 | Aaa");
    const mmmIdx = result.indexOf("| 2 | Mmm");
    const zzzIdx = result.indexOf("| 3 | Zzz");

    expect(aaaIdx).toBeLessThan(mmmIdx);
    expect(mmmIdx).toBeLessThan(zzzIdx);
  });

  it("numbers rows sequentially", () => {
    const destinations: ReadonlyArray<Destination> = [
      makeDest({ slug: "a", name: "Alpha" }),
      makeDest({ slug: "b", name: "Beta" }),
    ];

    const result = generateMarkdown(destinations);

    expect(result).toContain("| 1 | Alpha |");
    expect(result).toContain("| 2 | Beta |");
  });

  it("includes timestamp in footer", () => {
    const result = generateMarkdown([]);
    expect(result).toContain("*Generated on: 2026-05-07 12:00:00 UTC*");
  });

  it("includes status legend in footer", () => {
    const result = generateMarkdown([]);
    expect(result).toContain("### Status Legend");
    expect(result).toContain("Has a working `onDelete` handler that makes API calls");
  });

  it("handles empty destination list", () => {
    const result = generateMarkdown([]);
    expect(result).toContain("**Total: 0** | **Supported: 0**");
    expect(result).toContain("## All Destinations (0)");
  });

  it("includes slug in backticks", () => {
    const destinations: ReadonlyArray<Destination> = [
      makeDest({ slug: "my-dest", name: "My Dest" }),
    ];

    const result = generateMarkdown(destinations);
    expect(result).toContain("| `my-dest` |");
  });

  it("renders source as a View link for destinations with sourceUrl", () => {
    const destinations: ReadonlyArray<Destination> = [
      makeDest({ slug: "test", name: "Test", sourceUrl: "https://github.com/org/repo/blob/main/file.ts" }),
    ];

    const result = generateMarkdown(destinations);
    expect(result).toContain("[View](https://github.com/org/repo/blob/main/file.ts)");
  });

  it("renders source as dash for catalog-only destinations", () => {
    const destinations: ReadonlyArray<Destination> = [
      makeDest({ slug: "test", name: "Test", sourceUrl: "-", status: "unsupported", type: "Catalog Only" }),
    ];

    const result = generateMarkdown(destinations);
    expect(result).toContain("| - | Not Detected |");
  });
});
