import { describe, it, expect } from "vitest";
import { scanActionDestinations, scanLegacyIntegrations, deduplicateLegacy, mergeWithCatalog, normalizeForComparison, extractDirectIntegrationSlugs } from "./scanner";
import type { GitHubClient } from "./github";
import type { Destination } from "./types";

const createMockClient = (overrides: Partial<GitHubClient> = {}): GitHubClient => ({
  searchCode: overrides.searchCode ?? (() => []),
  getFileContent: overrides.getFileContent ?? (() => ""),
});

describe("scanActionDestinations", () => {
  it("returns active destinations with proper classification", () => {
    const client = createMockClient({
      searchCode: () => ["braze", "dawn"],
      getFileContent: (_repo, path) => {
        if (path.includes("braze")) {
          return `
  onDelete: async (request, { payload, settings }) => {
    return request('https://rest.iad-01.braze.com/users/delete', {
      method: 'POST',
      json: { external_ids: [payload.userId] }
    })
  },`;
        }
        return `
  // onDelete: async (request, { settings, payload }) => {
  // },`;
      },
    });

    const results = scanActionDestinations(client);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      slug: "braze",
      name: "Braze",
      type: "Action Destination",
      status: "active",
    });
    expect(results[0].sourceUrl).toContain("braze/index.ts");
    expect(results[1]).toMatchObject({
      slug: "dawn",
      name: "Dawn",
      type: "Action Destination",
      status: "commented-out",
    });
    expect(results[1].sourceUrl).toContain("dawn/index.ts");
  });

  it("skips destinations with empty file content", () => {
    const client = createMockClient({
      searchCode: () => ["missing-dest"],
      getFileContent: () => "",
    });

    const results = scanActionDestinations(client);
    expect(results).toHaveLength(0);
  });

  it("returns empty array when no destinations found", () => {
    const client = createMockClient();
    expect(scanActionDestinations(client)).toEqual([]);
  });
});

describe("scanLegacyIntegrations", () => {
  it("combines prototype.delete, mapper, class delete, and direct integration results", () => {
    const directContent = `
integration('appcues', '554926390a20f4e22f0fb38a', createDirectIntegration('Appcues'))
integration('castle', '56a8f566e954a874ca44d3b0', createDirectIntegration('Castle'))
    `;
    const client = createMockClient({
      searchCode: (_query) => {
        if (_query.includes("prototype.delete")) return ["amplitude", "intercom"];
        if (_query.includes("exports.delete")) return ["intercom", "vero"];
        if (_query.includes("delete(event)")) return ["vero"];
        return [];
      },
      getFileContent: (_repo, path) => {
        if (path === "integrations/index.js") return directContent;
        return "";
      },
    });

    const results = scanLegacyIntegrations(client);

    expect(results).toHaveLength(5);
    expect(results.map((d) => d.slug)).toEqual(["amplitude", "appcues", "castle", "intercom", "vero"]);
    expect(results[0].type).toBe("Legacy Integration");
    expect(results[0].status).toBe("active");
  });

  it("filters out not-implemented placeholder", () => {
    const client = createMockClient({
      searchCode: () => ["not-implemented", "amplitude"],
      getFileContent: () => "",
    });

    const results = scanLegacyIntegrations(client);
    expect(results.map((d) => d.slug)).toEqual(["amplitude"]);
  });

  it("returns empty array when no results", () => {
    const client = createMockClient({
      getFileContent: () => "",
    });
    expect(scanLegacyIntegrations(client)).toEqual([]);
  });
});

describe("deduplicateLegacy", () => {
  const makeActionDest = (slug: string): Destination => ({
    slug,
    name: slug,
    type: "Action Destination",
    repo: "segmentio/action-destinations",
    sourceUrl: "https://github.com/segmentio/action-destinations/blob/main/packages/destination-actions/src/destinations/braze/index.ts",
    status: "active",
  });

  const makeLegacyDest = (slug: string): Destination => ({
    slug,
    name: slug,
    type: "Legacy Integration",
    repo: "segmentio/integrations",
    sourceUrl: `https://github.com/segmentio/integrations/blob/master/integrations/${slug}`,
    status: "active",
  });

  it("removes legacy destinations that match action destination slugs exactly", () => {
    const action = [makeActionDest("amplitude")];
    const legacy = [makeLegacyDest("amplitude"), makeLegacyDest("vero")];

    const result = deduplicateLegacy(action, legacy);
    expect(result.map((d) => d.slug)).toEqual(["vero"]);
  });

  it("removes legacy destinations where normalized slug matches action slug", () => {
    const action = [makeActionDest("customerio")];
    const legacy = [makeLegacyDest("customer.io"), makeLegacyDest("tray.io")];

    const result = deduplicateLegacy(action, legacy);
    expect(result.map((d) => d.slug)).toEqual(["tray.io"]);
  });

  it("normalizes slugs by stripping non-alphanumeric characters for comparison", () => {
    const action = [makeActionDest("google-analytics")];
    const legacy = [makeLegacyDest("google-analytics"), makeLegacyDest("vero")];

    const result = deduplicateLegacy(action, legacy);
    expect(result.map((d) => d.slug)).toEqual(["vero"]);
  });

  it("returns all legacy destinations when no overlap", () => {
    const action = [makeActionDest("braze")];
    const legacy = [makeLegacyDest("vero"), makeLegacyDest("tray.io")];

    const result = deduplicateLegacy(action, legacy);
    expect(result).toEqual(legacy);
  });
});

describe("extractDirectIntegrationSlugs", () => {
  it("extracts slugs from createDirectIntegration lines", () => {
    const content = `
const createDirectIntegration = require('../createDirectIntegration')
integration('appcues', '554926390a20f4e22f0fb38a', createDirectIntegration('Appcues'))
integration('castle', '56a8f566e954a874ca44d3b0', createDirectIntegration('Castle'))
integration('chameleon', '555a14f80a20f4e22f0fb38d', createDirectIntegration('Chameleon'))
    `;

    const result = extractDirectIntegrationSlugs(content);
    expect(result).toEqual(["appcues", "castle", "chameleon"]);
  });

  it("ignores non-createDirectIntegration lines", () => {
    const content = `
const createDirectIntegration = require('../createDirectIntegration')
integration('amplitude', '123', require('./integrations/amplitude'))
integration('appcues', '456', createDirectIntegration('Appcues'))
    `;

    const result = extractDirectIntegrationSlugs(content);
    expect(result).toEqual(["appcues"]);
  });

  it("returns empty array for empty content", () => {
    expect(extractDirectIntegrationSlugs("")).toEqual([]);
  });

  it("handles the require line without matching", () => {
    const content = "const createDirectIntegration = require('../createDirectIntegration')";
    const result = extractDirectIntegrationSlugs(content);
    expect(result).toEqual([]);
  });
});

describe("normalizeForComparison", () => {
  it("lowercases and strips non-alphanumeric characters", () => {
    expect(normalizeForComparison("Customer.io")).toBe("customerio");
    expect(normalizeForComparison("Google Cloud PubSub")).toBe("googlecloudpubsub");
    expect(normalizeForComparison("tray.io")).toBe("trayio");
  });

  it("handles slugs with hyphens", () => {
    expect(normalizeForComparison("angler-ai")).toBe("anglerai");
  });
});

describe("mergeWithCatalog", () => {
  const makeDetected = (slug: string, name: string): Destination => ({
    slug,
    name,
    type: "Action Destination",
    repo: "segmentio/action-destinations",
    sourceUrl: "https://github.com/segmentio/action-destinations/blob/main/packages/destination-actions/src/destinations/braze/index.ts",
    status: "active",
  });

  it("adds catalog entries not found in detected destinations", () => {
    const detected = [makeDetected("braze", "Braze")];
    const catalog = ["Braze", "Amplitude", "Mixpanel"];

    const result = mergeWithCatalog(detected, catalog);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(detected[0]);
    expect(result[1].name).toBe("Amplitude");
    expect(result[1].status).toBe("unsupported");
    expect(result[1].type).toBe("Catalog Only");
    expect(result[2].name).toBe("Mixpanel");
  });

  it("matches by normalized name to avoid duplicates", () => {
    const detected = [makeDetected("customerio", "Customer.io")];
    const catalog = ["Customer.io", "Customer.io (Actions)"];

    const result = mergeWithCatalog(detected, catalog);

    // Both "Customer.io" (normalized match) and "Customer.io (Actions)" (alias match)
    // are recognized as already detected
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Customer.io");
  });

  it("matches by normalized slug against catalog name", () => {
    const detected = [makeDetected("google-cloud-pubsub", "Google Cloud PubSub")];
    const catalog = ["Google Cloud PubSub", "Google Sheets"];

    const result = mergeWithCatalog(detected, catalog);

    expect(result).toHaveLength(2);
    expect(result[1].name).toBe("Google Sheets");
  });

  it("generates slug from catalog name", () => {
    const detected: ReadonlyArray<Destination> = [];
    const catalog = ["Facebook Conversions API (Actions)"];

    const result = mergeWithCatalog(detected, catalog);

    expect(result[0].slug).toBe("facebook-conversions-api-actions");
  });

  it("trims leading and trailing hyphens from generated slugs", () => {
    const detected: ReadonlyArray<Destination> = [];
    const catalog = ["(Actions) Test"];

    const result = mergeWithCatalog(detected, catalog);

    expect(result[0].slug).toBe("actions-test");
  });

  it("returns only detected destinations when catalog is empty", () => {
    const detected = [makeDetected("braze", "Braze")];

    const result = mergeWithCatalog(detected, []);

    expect(result).toEqual(detected);
  });

  it("sets repo to '-' for catalog-only destinations", () => {
    const result = mergeWithCatalog([], ["Mixpanel"]);

    expect(result[0].repo).toBe("-");
  });

  it("uses alias mapping to match catalog names to detected slugs", () => {
    const detected = [makeDetected("braze", "Braze")];
    const catalog = ["Braze Cloud Mode (Actions)", "Mixpanel"];

    const result = mergeWithCatalog(detected, catalog);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Braze");
    expect(result[1].name).toBe("Mixpanel");
    expect(result[1].status).toBe("unsupported");
  });

  it("excludes aliased catalog entries that map to detected destinations", () => {
    const detected = [
      makeDetected("amplitude", "Amplitude"),
      makeDetected("fullstory", "FullStory"),
    ];
    const catalog = ["Amplitude (Actions)", "Fullstory Cloud Mode (Actions)", "New Dest"];

    const result = mergeWithCatalog(detected, catalog);

    expect(result).toHaveLength(3);
    expect(result[2].name).toBe("New Dest");
  });
});
