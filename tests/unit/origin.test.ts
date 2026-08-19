import { describe, expect, it } from "vitest";

import { toDisplayOrigin } from "../../lib/origin";

describe("toDisplayOrigin", () => {
  it("keeps only the origin of an HTTPS URL", () => {
    expect(
      toDisplayOrigin("https://example.test/account?token=not-retained#private")
    ).toEqual({ kind: "web", label: "https://example.test" });
  });

  it("retains an explicit non-default port as part of the origin", () => {
    expect(toDisplayOrigin("http://localhost:4173/login")).toEqual({
      kind: "web",
      label: "http://localhost:4173"
    });
  });

  it("labels browser pages as restricted", () => {
    expect(toDisplayOrigin("chrome://settings/privacy")).toEqual({
      kind: "restricted",
      label: "chrome://"
    });
  });

  it("does not present unsupported or malformed URLs as origins", () => {
    expect(toDisplayOrigin("not a url")).toEqual({
      kind: "unavailable",
      label: "Origin unavailable"
    });
    expect(toDisplayOrigin("mailto:security@example.test")).toEqual({
      kind: "unavailable",
      label: "Origin unavailable"
    });
  });

  it("handles a missing tab URL", () => {
    expect(toDisplayOrigin(undefined)).toEqual({
      kind: "unavailable",
      label: "Origin unavailable"
    });
  });
});
