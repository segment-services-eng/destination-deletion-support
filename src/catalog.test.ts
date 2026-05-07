import { describe, it, expect } from "vitest";
import { FALLBACK_CATALOG, fetchCatalogDestinations } from "./catalog";

describe("FALLBACK_CATALOG", () => {
  it("contains a large list of destination names", () => {
    expect(FALLBACK_CATALOG.length).toBeGreaterThan(300);
  });

  it("includes well-known destinations", () => {
    expect(FALLBACK_CATALOG).toContain("Amplitude");
    expect(FALLBACK_CATALOG).toContain("Braze");
    expect(FALLBACK_CATALOG).toContain("Google Cloud PubSub");
    expect(FALLBACK_CATALOG).toContain("Intercom");
  });

  it("is sorted and contains no duplicates", () => {
    const unique = [...new Set(FALLBACK_CATALOG)];
    expect(FALLBACK_CATALOG.length).toBe(unique.length);
  });
});

describe("fetchCatalogDestinations", () => {
  it("returns fallback catalog when fetch fails", async () => {
    const execute = (): string => "";
    const result = await fetchCatalogDestinations(execute);
    expect(result).toEqual(FALLBACK_CATALOG);
  });

  it("returns fallback catalog when response has no destination content", async () => {
    const execute = (): string => "<html><body>Error page</body></html>";
    const result = await fetchCatalogDestinations(execute);
    expect(result).toEqual(FALLBACK_CATALOG);
  });

  it("extracts names from HTML with destination class links", async () => {
    const html = `<html><body>
      <a class="destination-link" href="/dest1">Amplitude</a>
      <a class="destination-card" href="/dest2">Braze</a>
    </body></html>`;
    const execute = (): string => html;
    const result = await fetchCatalogDestinations(execute);
    expect(result).toEqual(["Amplitude", "Braze"]);
  });

  it("falls back to list item extraction when no destination class links found", async () => {
    const html = `<html><body class="destination">
      <ul>
        <li><a href="/d1">Mixpanel</a></li>
        <li><a href="/d2">Klaviyo</a></li>
      </ul>
    </body></html>`;
    const execute = (): string => html;
    const result = await fetchCatalogDestinations(execute);
    expect(result).toEqual(["Mixpanel", "Klaviyo"]);
  });

  it("filters out empty names from destination class links", async () => {
    const html = `<html><body>
      <a class="destination-link" href="/dest1">Amplitude</a>
      <a class="destination-link" href="/dest2">   </a>
    </body></html>`;
    const execute = (): string => html;
    const result = await fetchCatalogDestinations(execute);
    expect(result).toEqual(["Amplitude"]);
  });

  it("filters out empty names from list item fallback", async () => {
    const html = `<html><body class="destination">
      <ul>
        <li><a href="/d1">  </a></li>
        <li><a href="/d2">Klaviyo</a></li>
      </ul>
    </body></html>`;
    const execute = (): string => html;
    const result = await fetchCatalogDestinations(execute);
    expect(result).toEqual(["Klaviyo"]);
  });
});
