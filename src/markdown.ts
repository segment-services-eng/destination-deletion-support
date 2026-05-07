import type { Destination, DeletionStatus } from "./types";

const STATUS_LABELS: Readonly<Record<DeletionStatus, string>> = {
  "active": "Supported",
  "noop": "Stub/No-Op",
  "commented-out": "Commented Out",
  "unsupported": "Not Detected",
};

const header = (total: number, activeCount: number): string => `# Segment Destinations with Deletion Request Support

> Auto-generated list of destinations that reference user deletion (GDPR/CCPA) handlers.
> Re-run \`npm run generate\` to update.

## Summary

This list is derived by scanning source code in:
1. **Action Destinations** (\`segmentio/action-destinations\`): Destinations with an \`onDelete\` handler
2. **Legacy Integrations** (\`segmentio/integrations\`): Destinations with a \`prototype.delete\` method

**Total: ${total}** | **Supported: ${activeCount}**

## All Destinations (${total})

| # | Destination | Slug | Type | Repository | Deletion Status |
|---|-------------|------|------|------------|-----------------|`;

const toRow = (dest: Destination, index: number): string =>
  `| ${index + 1} | ${dest.name} | \`${dest.slug}\` | ${dest.type} | \`${dest.repo}\` | ${STATUS_LABELS[dest.status]} |`;

const footer = (timestamp: string): string => `
---

### Status Legend

| Status | Meaning |
|--------|---------|
| Supported | Has a working \`onDelete\` handler that makes API calls |
| Stub/No-Op | Declares \`onDelete\` but the handler is empty |
| Commented Out | Has a commented-out \`onDelete\` template |
| Not Detected | No deletion handler found in source code |

*Generated on: ${timestamp}*
`;

export const generateMarkdown = (destinations: ReadonlyArray<Destination>): string => {
  const sorted = [...destinations].sort((a, b) => a.name.localeCompare(b.name));
  const activeCount = sorted.filter((d) => d.status === "active").length;
  const timestamp = new Date().toISOString().replace("T", " ").replace(/\.\d+Z/, " UTC");

  return [
    header(sorted.length, activeCount),
    sorted.map(toRow).join("\n"),
    footer(timestamp),
  ].join("\n");
};
