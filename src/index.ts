import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { createGitHubClient } from "./github";
import { scanActionDestinations, scanLegacyIntegrations, deduplicateLegacy, mergeWithCatalog } from "./scanner";
import { generateMarkdown } from "./markdown";
import { generateCsv } from "./csv";
import { FALLBACK_CATALOG } from "./catalog";
import { MANUAL_OVERRIDES } from "./overrides";

const OUTPUT_MD = "deletion-support.md";
const OUTPUT_CSV = "deletion-support.csv";

const execute = (args: string): string => {
  try {
    return execSync(`gh ${args}`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
};

const main = (): void => {
  console.log("Fetching deletion-supporting destinations from segmentio repos...\n");

  const client = createGitHubClient(execute);

  const actionDests = scanActionDestinations(client);
  const legacyDests = scanLegacyIntegrations(client);

  if (actionDests.length === 0) {
    console.error("ERROR: No action destinations found. Check that SEGMENTIO_TOKEN has access to segmentio/action-destinations.");
    process.exit(1);
  }

  if (legacyDests.length === 0) {
    console.error("ERROR: No legacy integrations found. Check that SEGMENTIO_TOKEN has access to segmentio/integrations.");
    process.exit(1);
  }

  const uniqueLegacy = deduplicateLegacy(actionDests, legacyDests);
  const detected = [...actionDests, ...uniqueLegacy, ...MANUAL_OVERRIDES];
  const allDestinations = mergeWithCatalog(detected, FALLBACK_CATALOG);

  const activeCount = allDestinations.filter((d) => d.status === "active").length;
  console.log(`Total catalog destinations: ${allDestinations.length}`);
  console.log(`Destinations with active deletion support: ${activeCount}`);

  if (activeCount < 30) {
    console.error(`ERROR: Only ${activeCount} destinations detected as supported. Expected at least 30. Results are likely incomplete.`);
    process.exit(1);
  }

  const markdown = generateMarkdown(allDestinations);
  const csv = generateCsv(allDestinations);
  writeFileSync(OUTPUT_MD, markdown);
  writeFileSync(OUTPUT_CSV, csv);

  console.log(`\nDone! Output written to ${OUTPUT_MD} and ${OUTPUT_CSV}`);
};

main();
