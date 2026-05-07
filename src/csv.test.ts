import { describe, it, expect } from "vitest";
import { generateCsv } from "./csv";
import type { Destination } from "./types";

const makeDest = (overrides: Partial<Destination> = {}): Destination => ({
  slug: "braze",
  name: "Braze",
  type: "Action Destination",
  repo: "segmentio/action-destinations",
  sourceUrl: "https://github.com/segmentio/action-destinations/blob/main/packages/destination-actions/src/destinations/braze/index.ts#L42",
  status: "active",
  ...overrides,
});

describe("generateCsv", () => {
  it("generates header row followed by data rows", () => {
    const csv = generateCsv([makeDest()]);
    const lines = csv.trim().split("\n");

    expect(lines[0]).toBe("#,Destination,Slug,Type,Source,Deletion Status");
    expect(lines[1]).toContain("1,Braze,braze,Action Destination,");
    expect(lines[1]).toContain(",Supported");
  });

  it("sorts destinations alphabetically by name", () => {
    const dests = [
      makeDest({ name: "Zendesk", slug: "zendesk" }),
      makeDest({ name: "Amplitude", slug: "amplitude" }),
    ];
    const csv = generateCsv(dests);
    const lines = csv.trim().split("\n");

    expect(lines[1]).toContain("1,Amplitude,");
    expect(lines[2]).toContain("2,Zendesk,");
  });

  it("escapes names containing commas", () => {
    const csv = generateCsv([makeDest({ name: "Raiser's Edge, NXT" })]);
    const lines = csv.trim().split("\n");

    expect(lines[1]).toContain('"Raiser\'s Edge, NXT"');
  });

  it("escapes names containing double quotes", () => {
    const csv = generateCsv([makeDest({ name: 'Say "Hello"' })]);
    const lines = csv.trim().split("\n");

    expect(lines[1]).toContain('"Say ""Hello"""');
  });

  it("maps all status values to labels", () => {
    const dests = [
      makeDest({ name: "A", slug: "a", status: "active" }),
      makeDest({ name: "B", slug: "b", status: "noop" }),
      makeDest({ name: "C", slug: "c", status: "commented-out" }),
      makeDest({ name: "D", slug: "d", status: "unsupported" }),
    ];
    const csv = generateCsv(dests);

    expect(csv).toContain(",Supported\n");
    expect(csv).toContain(",Stub/No-Op\n");
    expect(csv).toContain(",Commented Out\n");
    expect(csv).toContain(",Not Detected\n");
  });

  it("ends with a newline", () => {
    const csv = generateCsv([makeDest()]);
    expect(csv.endsWith("\n")).toBe(true);
  });

  it("returns only header for empty input", () => {
    const csv = generateCsv([]);
    expect(csv).toBe("#,Destination,Slug,Type,Source,Deletion Status\n");
  });
});
