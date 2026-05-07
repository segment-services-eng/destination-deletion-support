import type { GitHubClient } from "./github";
import type { Destination } from "./types";
import { classifyDestination } from "./classifier";
import { toDisplayName } from "./names";

const ACTION_DEST_REPO = "segmentio/action-destinations";
const LEGACY_REPO = "segmentio/integrations";
const ACTION_DEST_PATH = "packages/destination-actions/src/destinations";

const GITHUB_BASE = "https://github.com";

const actionDestSourceUrl = (slug: string, lineNumber?: number): string => {
  const base = `${GITHUB_BASE}/${ACTION_DEST_REPO}/blob/main/${ACTION_DEST_PATH}/${slug}/index.ts`;
  return lineNumber ? `${base}#L${lineNumber}` : base;
};

const legacySourceUrl = (slug: string): string =>
  `${GITHUB_BASE}/${LEGACY_REPO}/blob/master/integrations/${slug}`;

const directIntegrationSourceUrl = (): string =>
  `${GITHUB_BASE}/${LEGACY_REPO}/blob/master/createDirectIntegration/index.js`;

const JQ_EXTRACT_NAMES = '[.items[].path | capture("destinations/(?<name>[^/]+)/") | .name] | unique | .[]';

const buildActionDestQuery = (): string =>
  `onDelete in:file repo:${ACTION_DEST_REPO} path:${ACTION_DEST_PATH} filename:index.ts`;

const buildLegacyPrototypeQuery = (): string =>
  `prototype.delete in:file repo:${LEGACY_REPO} path:integrations`;

const buildLegacyMapperQuery = (): string =>
  `exports.delete in:file repo:${LEGACY_REPO} path:integrations filename:mapper`;

const buildLegacyClassDeleteQuery = (): string =>
  `delete(event) in:file repo:${LEGACY_REPO} path:integrations filename:index`;

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

    const { status, lineNumber } = classifyDestination(content);
    const dest: Destination = {
      slug,
      name: toDisplayName(slug),
      type: "Action Destination",
      repo: ACTION_DEST_REPO,
      sourceUrl: actionDestSourceUrl(slug, lineNumber),
      status,
    };
    return [...acc, dest];
  }, []);
};

export const extractDirectIntegrationSlugs = (content: string): ReadonlyArray<string> =>
  content
    .split("\n")
    .filter((line) => line.includes("createDirectIntegration"))
    .map((line) => {
      const match = line.match(/integration\('([^']+)'/);
      return match ? match[1] : "";
    })
    .filter(Boolean);

export const scanLegacyIntegrations = (client: GitHubClient): ReadonlyArray<Destination> => {
  const prototypeDests = client.searchCode(
    buildLegacyPrototypeQuery(),
    extractDestName("integrations")
  );

  const mapperDests = client.searchCode(
    buildLegacyMapperQuery(),
    extractDestName("integrations")
  );

  const classDeleteDests = client.searchCode(
    buildLegacyClassDeleteQuery(),
    extractDestName("integrations")
  );

  // Direct integrations all support delete via the shared request handler
  const directIntegrationContent = client.getFileContent(
    LEGACY_REPO,
    "integrations/index.js"
  );
  const directDests = extractDirectIntegrationSlugs(directIntegrationContent);

  const directSet = new Set(directDests);
  const allSlugs = [...new Set([...prototypeDests, ...mapperDests, ...classDeleteDests, ...directDests])]
    .filter((d) => d !== "not-implemented")
    .sort();

  return allSlugs.map((slug) => ({
    slug,
    name: toDisplayName(slug),
    type: "Legacy Integration" as const,
    repo: LEGACY_REPO,
    sourceUrl: directSet.has(slug) ? directIntegrationSourceUrl() : legacySourceUrl(slug),
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

// Maps catalog display names to their code-level slugs when they differ
const CATALOG_TO_SLUG_ALIASES: Readonly<Record<string, string>> = {
  "Amplitude (Actions)": "amplitude",
  "Braze Cloud Mode (Actions)": "braze",
  "Customer.io (Actions)": "customerio",
  "Friendbuy (Cloud Destination)": "friendbuy",
  "Fullstory Cloud Mode (Actions)": "fullstory",
  "Intercom Cloud Mode (Actions)": "intercom",
  "Airship (Actions)": "airship",
  "Klaviyo (Actions)": "klaviyo",
  "Loops (Actions)": "loops",
  "Optimizely Feature Experimentation (Actions)": "optimizely-feature-experimentation-actions",
  "Encharge (Actions)": "encharge",
  "Xtremepush (Actions)": "xtremepush",
  "Userpilot Cloud (Actions)": "userpilot",
  "Gleap (Action)": "gleap",
};

const isDetected = (
  name: string,
  detectedNormalized: ReadonlySet<string>,
  detectedSlugs: ReadonlySet<string>
): boolean => {
  const aliasSlug = CATALOG_TO_SLUG_ALIASES[name];
  if (aliasSlug) {
    return detectedSlugs.has(normalizeForComparison(aliasSlug));
  }
  return (
    detectedNormalized.has(normalizeForComparison(name)) ||
    detectedSlugs.has(normalizeForComparison(name))
  );
};

export const mergeWithCatalog = (
  detected: ReadonlyArray<Destination>,
  catalogNames: ReadonlyArray<string>
): ReadonlyArray<Destination> => {
  const detectedNormalized: ReadonlySet<string> = new Set(
    detected.map((d) => normalizeForComparison(d.name))
  );
  const detectedSlugs: ReadonlySet<string> = new Set(
    detected.map((d) => normalizeForComparison(d.slug))
  );

  const catalogOnly = catalogNames
    .filter((name) => !isDetected(name, detectedNormalized, detectedSlugs))
    .map((name): Destination => ({
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      name,
      type: "Catalog Only",
      repo: "-",
      sourceUrl: "-",
      status: "unsupported",
    }));

  return [...detected, ...catalogOnly];
};
