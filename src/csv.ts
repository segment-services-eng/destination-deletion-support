import type { Destination, DeletionStatus } from "./types";

const STATUS_LABELS: Readonly<Record<DeletionStatus, string>> = {
  "active": "Supported",
  "noop": "Stub/No-Op",
  "commented-out": "Commented Out",
  "unsupported": "Not Detected",
};

const escapeCsv = (value: string): string =>
  value.includes(",") || value.includes('"') || value.includes("\n")
    ? `"${value.replace(/"/g, '""')}"`
    : value;

const HEADERS = ["#", "Destination", "Slug", "Type", "Source", "Deletion Status"];

const toRow = (dest: Destination, index: number): string =>
  [
    String(index + 1),
    escapeCsv(dest.name),
    dest.slug,
    dest.type,
    dest.sourceUrl,
    STATUS_LABELS[dest.status],
  ].join(",");

export const generateCsv = (destinations: ReadonlyArray<Destination>): string => {
  const sorted = [...destinations].sort((a, b) => a.name.localeCompare(b.name));

  return [HEADERS.join(","), ...sorted.map(toRow)].join("\n") + "\n";
};
