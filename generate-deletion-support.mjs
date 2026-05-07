#!/usr/bin/env node

/**
 * Generates a markdown table of all Segment destinations that support deletion requests.
 * Searches segmentio/action-destinations and segmentio/integrations repos via the GitHub API.
 *
 * Prerequisites: gh CLI authenticated with access to segmentio repos
 * Usage: node generate-deletion-support.mjs
 */

import { execSync } from "child_process";

const OUTPUT_FILE = "deletion-support.md";

const gh = (args) => {
  try {
    return execSync(`gh ${args}`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
};

const titleCase = (slug) => {
  const specialNames = {
    "customerio": "Customer.io",
    "customer.io": "Customer.io",
    "fullstory": "FullStory",
    "braze": "Braze",
    "amplitude": "Amplitude",
    "intercom": "Intercom",
    "klaviyo": "Klaviyo",
    "airship": "Airship",
    "pushwoosh": "Pushwoosh",
    "gleap": "Gleap",
    "hilo": "Hilo",
    "loops": "Loops",
    "calliper": "Calliper",
    "recombee": "Recombee",
    "userpilot": "Userpilot",
    "xtremepush": "Xtremepush",
    "friendbuy": "Friendbuy",
    "encharge": "Encharge",
    "iqm": "IQM",
    "tray.io": "tray.io",
    "webhooks": "Webhooks",
    "optimizelyx": "Optimizely Full Stack",
    "appboy": "Braze (Legacy/Appboy)",
    "amazon-eventbridge": "Amazon EventBridge",
    "google-analytics": "Google Analytics",
    "google-cloud-pubsub": "Google Cloud PubSub",
    "google-data-manager": "Google Data Manager",
    "iterable": "Iterable",
    "vero": "Vero",
    "stackadapt-audiences": "StackAdapt Audiences",
    "angler-ai": "Angler AI",
    "app-fit": "AppFit",
    "blackbaud-raisers-edge-nxt": "Blackbaud Raiser's Edge NXT",
    "blend-ai": "Blend AI",
    "magellan-ai": "Magellan AI",
    "optimizely-feature-experimentation-actions": "Optimizely Feature Experimentation (Actions)",
  };

  if (specialNames[slug]) return specialNames[slug];

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const searchGitHubCode = (query, jqExpr) => {
  const result = gh(
    `api search/code -X GET -f q="${query}" -f per_page=100 --jq '${jqExpr}'`
  );
  return result ? result.split("\n").filter(Boolean) : [];
};

const getFileContent = (repo, path) => {
  return gh(`api "repos/${repo}/contents/${path}" --jq '.content' 2>/dev/null | base64 -d`);
};

console.log("Fetching deletion-supporting destinations from segmentio repos...\n");

// Step 1: Find all destinations in action-destinations that reference onDelete
const actionDestPaths = searchGitHubCode(
  "onDelete in:file repo:segmentio/action-destinations path:packages/destination-actions/src/destinations filename:index.ts",
  '[.items[].path | capture("destinations/(?<name>[^/]+)/") | .name] | unique | .[]'
);

console.log(`Found ${actionDestPaths.length} action destinations referencing onDelete`);

// Step 2: Classify each destination
const activeActionDests = [];
const noopActionDests = [];
const commentedOutDests = [];

actionDestPaths.forEach((dest) => {
  const content = getFileContent(
    "segmentio/action-destinations",
    `packages/destination-actions/src/destinations/${dest}/index.ts`
  );

  if (!content) return;

  // Check if onDelete is entirely commented out
  const hasUncommentedOnDelete = content.split("\n").some(
    (line) => line.match(/onDelete/) && !line.match(/^\s*\/\//)
  );

  if (!hasUncommentedOnDelete) {
    commentedOutDests.push(dest);
    return;
  }

  // Extract onDelete block
  const lines = content.split("\n");
  const onDeleteIdx = lines.findIndex(
    (line) => line.match(/onDelete/) && !line.match(/^\s*\/\//)
  );

  if (onDeleteIdx === -1) {
    commentedOutDests.push(dest);
    return;
  }

  // Get the next ~15 lines after onDelete to check implementation
  const block = lines.slice(onDeleteIdx, onDeleteIdx + 15).join("\n");

  // Check if the handler references a separate function (like `onDelete: deleteUser`)
  const isDelegated = lines[onDeleteIdx].match(/onDelete:\s*\w+[^(]/);

  // Check if it actually does something (makes a request, uses payload, etc.)
  const hasImplementation =
    isDelegated ||
    block.match(/request\s*\(/) ||
    block.match(/payload\.(userId|anonymousId)/) ||
    block.match(/payload\[/) ||
    block.match(/fetch\s*\(/) ||
    block.match(/\.delete\s*\(/) ||
    block.match(/\.post\s*\(/) ||
    block.match(/\.put\s*\(/);

  if (hasImplementation) {
    activeActionDests.push(dest);
  } else {
    noopActionDests.push(dest);
  }
});

console.log(`  Active: ${activeActionDests.length}`);
console.log(`  No-op/empty: ${noopActionDests.length}`);
console.log(`  Commented out: ${commentedOutDests.length}`);

// Step 3: Legacy integrations with prototype.delete
const legacyDests = searchGitHubCode(
  "prototype.delete in:file repo:segmentio/integrations path:integrations",
  '[.items[].path | capture("integrations/(?<name>[^/]+)/") | .name] | unique | .[]'
).filter((d) => d !== "not-implemented");

// Also get mapper exports.delete
const legacyMapperDests = searchGitHubCode(
  "exports.delete in:file repo:segmentio/integrations path:integrations filename:mapper",
  '[.items[].path | capture("integrations/(?<name>[^/]+)/") | .name] | unique | .[]'
);

const allLegacy = [...new Set([...legacyDests, ...legacyMapperDests])].sort();
console.log(`\nFound ${allLegacy.length} legacy integrations with delete support`);

// Step 4: Deduplicate - if a destination exists in both action and legacy, mark it
const legacyOnly = allLegacy.filter(
  (d) => !activeActionDests.some((ad) => ad === d || ad.includes(d) || d.includes(ad))
);

// Step 5: Build the markdown
const allDests = [
  ...activeActionDests.sort().map((d) => ({
    slug: d,
    name: titleCase(d),
    type: "Action Destination",
    repo: "segmentio/action-destinations",
  })),
  ...legacyOnly.sort().map((d) => ({
    slug: d,
    name: titleCase(d),
    type: "Legacy Integration",
    repo: "segmentio/integrations",
  })),
];

let md = `# Segment Destinations with Deletion Request Support

> Auto-generated list of destinations that implement user deletion (GDPR/CCPA) handlers.
> Re-run \`node generate-deletion-support.mjs\` to update.

## Summary

This list is derived by scanning source code in:
1. **Action Destinations** (\`segmentio/action-destinations\`): Destinations with an active \`onDelete\` handler
2. **Legacy Integrations** (\`segmentio/integrations\`): Destinations with a \`prototype.delete\` method

## Destinations with Active Deletion Support (${allDests.length})

| # | Destination | Slug | Type | Repository |
|---|-------------|------|------|------------|
`;

allDests.forEach((d, i) => {
  md += `| ${i + 1} | ${d.name} | \`${d.slug}\` | ${d.type} | \`${d.repo}\` |\n`;
});

if (noopActionDests.length > 0) {
  md += `
## Stub/No-Op Implementations (${noopActionDests.length})

These destinations declare an \`onDelete\` handler but have an empty or no-op implementation:

| # | Destination | Slug | Notes |
|---|-------------|------|-------|
`;
  noopActionDests.sort().forEach((d, i) => {
    md += `| ${i + 1} | ${titleCase(d)} | \`${d}\` | Empty/no-op onDelete handler |\n`;
  });
}

if (commentedOutDests.length > 0) {
  md += `
## Commented Out (${commentedOutDests.length})

These destinations have a commented-out \`onDelete\` template but no implementation:

| # | Destination | Slug |
|---|-------------|------|
`;
  commentedOutDests.sort().forEach((d, i) => {
    md += `| ${i + 1} | ${titleCase(d)} | \`${d}\` |\n`;
  });
}

md += `
---

*Generated on: ${new Date().toISOString().replace("T", " ").replace(/\.\d+Z/, " UTC")}*
`;

const { writeFileSync } = await import("fs");
writeFileSync(OUTPUT_FILE, md);

console.log(`\nDone! Output written to ${OUTPUT_FILE}`);
console.log(`Total destinations with active deletion support: ${allDests.length}`);
