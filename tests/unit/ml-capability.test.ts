import { describe, expect, it } from "vitest";

import { localMlCapability } from "../../lib/ml-capability";

describe("local ML decision gate", () => {
  it("ships no model or runtime when evidence does not justify one", () => {
    expect(localMlCapability).toMatchObject({
      version: 1,
      included: false,
      enabled: false,
      decision: "not-justified",
      deterministicFallback: true,
      modelBytes: 0,
      runtimeDependencies: []
    });
    expect(localMlCapability.reason).toContain("no representative, licensed");
  });
});
