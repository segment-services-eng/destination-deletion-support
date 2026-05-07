import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMarkdown } from "./markdown";
import type { Destination } from "./types";

describe("generateMarkdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates header with total and active counts", () => {
    const destinations: ReadonlyArray<Destination> = [
      { slug: "braze", name: "Braze", type: "Action Destination", repo: "segmentio/action-destinations", status: "active" },
      { slug: "dawn", name: "Dawn", type: "Action Destination", repo: "segmentio/action-destinations", status: "commented-out" },
    ];

    const result = generateMarkdown(destinations);

    expect(result).toContain("**Total: 2** | **Supported: 1**");
    expect(result).toContain("## All Destinations (2)");
  });

  it("includes all destinations in a single table with status column", () => {
    const destinations: ReadonlyArray<Destination> = [
      { slug: "braze", name: "Braze", type: "Action Destination", repo: "segmentio/action-destinations", status: "active" },
      { slug: "blackbaud", name: "Blackbaud", type: "Action Destination", repo: "segmentio/action-destinations", status: "noop" },
      { slug: "close", name: "Close", type: "Action Destination", repo: "segmentio/action-destinations", status: "commented-out" },
    ];

    const result = generateMarkdown(destinations);

    expect(result).toContain("| Deletion Status |");
    expect(result).toContain("| Supported |");
    expect(result).toContain("| Stub/No-Op |");
    expect(result).toContain("| Commented Out |");
  });

  it("sorts all destinations alphabetically by name", () => {
    const destinations: ReadonlyArray<Destination> = [
      { slug: "zzz", name: "Zzz", type: "Action Destination", repo: "repo", status: "active" },
      { slug: "aaa", name: "Aaa", type: "Action Destination", repo: "repo", status: "noop" },
      { slug: "mmm", name: "Mmm", type: "Legacy Integration", repo: "repo", status: "active" },
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
      { slug: "a", name: "Alpha", type: "Action Destination", repo: "repo", status: "active" },
      { slug: "b", name: "Beta", type: "Action Destination", repo: "repo", status: "active" },
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
      { slug: "my-dest", name: "My Dest", type: "Action Destination", repo: "repo", status: "active" },
    ];

    const result = generateMarkdown(destinations);

    expect(result).toContain("| `my-dest` |");
  });

  it("includes repository in backticks", () => {
    const destinations: ReadonlyArray<Destination> = [
      { slug: "test", name: "Test", type: "Legacy Integration", repo: "segmentio/integrations", status: "active" },
    ];

    const result = generateMarkdown(destinations);

    expect(result).toContain("| `segmentio/integrations` |");
  });
});
