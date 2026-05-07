import type { GitHubClient } from "./github";
import type { Destination } from "./types";
import { classifyDestination } from "./classifier";
import { toDisplayName } from "./names";

const ACTION_DEST_REPO = "segmentio/action-destinations";
const LEGACY_REPO = "segmentio/integrations";
const ACTION_DEST_PATH = "packages/destination-actions/src/destinations";

const JQ_EXTRACT_NAMES = '[.items[].path | capture("destinations/(?<name>[^/]+)/") | .name] | unique | .[]';

const buildActionDestQuery = (): string =>
  `onDelete in:file repo:${ACTION_DEST_REPO} path:${ACTION_DEST_PATH} filename:index.ts`;

const buildLegacyPrototypeQuery = (): string =>
  `prototype.delete in:file repo:${LEGACY_REPO} path:integrations`;

const buildLegacyMapperQuery = (): string =>
  `exports.delete in:file repo:${LEGACY_REPO} path:integrations filename:mapper`;

const extractDestName = (prefix: string): string =>
  `[.items[].path | capture("${prefix}/(?<name>[^/]+)/") | .name] | unique | .[]`;

export const scanActionDestinations = (client: GitHubClient): ReadonlyArray<Destination> => {
  const slugs = client.searchCode(buildActionDestQuery(), JQ_EXTRACT_NAMES);

  return slugs.reduce<ReadonlyArray<Destination>>((acc, slug) => {
    const content = client.getFileContent(
      ACTION_DEST_REPO,
      `${ACTION_DEST_PATH}/${slug}/index.ts`
    );

    if (!content) return acc;

    const status = classifyDestination(content);
    const dest: Destination = {
      slug,
      name: toDisplayName(slug),
      type: "Action Destination",
      repo: ACTION_DEST_REPO,
      status,
    };
    return [...acc, dest];
  }, []);
};

export const scanLegacyIntegrations = (client: GitHubClient): ReadonlyArray<Destination> => {
  const prototypeDests = client.searchCode(
    buildLegacyPrototypeQuery(),
    extractDestName("integrations")
  );

  const mapperDests = client.searchCode(
    buildLegacyMapperQuery(),
    extractDestName("integrations")
  );

  const allSlugs = [...new Set([...prototypeDests, ...mapperDests])]
    .filter((d) => d !== "not-implemented")
    .sort();

  return allSlugs.map((slug) => ({
    slug,
    name: toDisplayName(slug),
    type: "Legacy Integration" as const,
    repo: LEGACY_REPO,
    status: "active" as const,
  }));
};

export const normalizeForComparison = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const deduplicateLegacy = (
  actionDests: ReadonlyArray<Destination>,
  legacyDests: ReadonlyArray<Destination>
): ReadonlyArray<Destination> => {
  const actionSlugs = new Set(actionDests.map((d) => d.slug));
  const normalizedActionSlugs = new Set(actionDests.map((d) => normalizeForComparison(d.slug)));

  return legacyDests.filter(
    (d) =>
      !actionSlugs.has(d.slug) &&
      !normalizedActionSlugs.has(normalizeForComparison(d.slug))
  );
};

export const mergeWithCatalog = (
  detected: ReadonlyArray<Destination>,
  catalogNames: ReadonlyArray<string>
): ReadonlyArray<Destination> => {
  const detectedNormalized = new Set(
    detected.map((d) => normalizeForComparison(d.name))
  );
  const detectedSlugs = new Set(
    detected.map((d) => normalizeForComparison(d.slug))
  );

  const catalogOnly = catalogNames
    .filter(
      (name) =>
        !detectedNormalized.has(normalizeForComparison(name)) &&
        !detectedSlugs.has(normalizeForComparison(name))
    )
    .map((name): Destination => ({
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      name,
      type: "Catalog Only",
      repo: "-",
      status: "unsupported",
    }));

  return [...detected, ...catalogOnly];
};
