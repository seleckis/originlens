import { describe, expect, it } from "vitest";

import {
  createNavigationSummary,
  isNavigationSummary
} from "../../lib/navigation-analysis";

describe("current-navigation analysis", () => {
  it("retains only origins and stable redirect evidence", () => {
    const summary = createNavigationSummary(
      [
        "https://start.example/private?token=discarded",
        "https://start.example/other",
        "https://final.example/login#discarded"
      ],
      ["server_redirect"]
    );

    expect(summary).toEqual({
      origins: ["https://start.example", "https://final.example"],
      evidence: ["NAVIGATION.ORIGIN_CHANGED", "NAVIGATION.SERVER_REDIRECT"]
    });
    expect(JSON.stringify(summary)).not.toContain("token");
    expect(isNavigationSummary(summary)).toBe(true);
  });

  it("rejects page paths and unbounded payloads at the message boundary", () => {
    expect(
      isNavigationSummary({
        origins: ["https://example.test/private"],
        evidence: []
      })
    ).toBe(false);
    expect(
      isNavigationSummary({
        origins: Array.from({ length: 9 }, () => "https://example.test"),
        evidence: []
      })
    ).toBe(false);
  });
});
