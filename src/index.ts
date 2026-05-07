import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { createGitHubClient } from "./github";
import { scanActionDestinations, scanLegacyIntegrations, deduplicateLegacy, mergeWithCatalog } from "./scanner";
import { generateMarkdown } from "./markdown";
import { FALLBACK_CATALOG } from "./catalog";
import { MANUAL_OVERRIDES } from "./overrides";

const OUTPUT_FILE = "deletion-support.md";

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
  const uniqueLegacy = deduplicateLegacy(actionDests, legacyDests);
  const detected = [...actionDests, ...uniqueLegacy, ...MANUAL_OVERRIDES];
  const allDestinations = mergeWithCatalog(detected, FALLBACK_CATALOG);

  const activeCount = allDestinations.filter((d) => d.status === "active").length;
  console.log(`Total catalog destinations: ${allDestinations.length}`);
  console.log(`Destinations with active deletion support: ${activeCount}`);

  const markdown = generateMarkdown(allDestinations);
  writeFileSync(OUTPUT_FILE, markdown);

  console.log(`\nDone! Output written to ${OUTPUT_FILE}`);
};

main();
