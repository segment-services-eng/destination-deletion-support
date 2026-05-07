import { describe, it, expect } from "vitest";
import { toDisplayName } from "./names";

describe("toDisplayName", () => {
  it("returns special name for known slugs", () => {
    expect(toDisplayName("customerio")).toBe("Customer.io");
    expect(toDisplayName("fullstory")).toBe("FullStory");
    expect(toDisplayName("iqm")).toBe("IQM");
    expect(toDisplayName("tray.io")).toBe("tray.io");
    expect(toDisplayName("appboy")).toBe("Braze (Legacy/Appboy)");
    expect(toDisplayName("amazon-eventbridge")).toBe("Amazon EventBridge");
    expect(toDisplayName("optimizely-feature-experimentation-actions")).toBe(
      "Optimizely Feature Experimentation (Actions)"
    );
  });

  it("title-cases unknown slugs by splitting on hyphens", () => {
    expect(toDisplayName("some-new-dest")).toBe("Some New Dest");
  });

  it("capitalizes single-word slugs", () => {
    expect(toDisplayName("mixpanel")).toBe("Mixpanel");
  });

  it("handles multi-word unknown slugs", () => {
    expect(toDisplayName("my-cool-destination")).toBe("My Cool Destination");
  });
});
