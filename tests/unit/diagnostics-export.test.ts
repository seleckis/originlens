import { describe, expect, it } from "vitest";

import { createSanitizedDiagnostics } from "../../lib/diagnostics-export";

describe("sanitized diagnostics export", () => {
  it("omits visited locations, endpoints, page text, and field values", () => {
    const exported = createSanitizedDiagnostics({
      decision: {
        version: 1,
        state: "danger",
        gates: {
          strongIdentityClaim: true,
          sensitiveDataIntent: true,
          verifiedDomainMismatch: true
        },
        evidence: ["POLICY.DANGER.THREE_GATES"],
        sensitiveIntents: ["credential"],
        intervention: "required",
        organization: "Swedbank Latvia",
        registrableDomain: "private.example"
      },
      resolver: {
        version: 1,
        enabled: true,
        configured: true,
        endpointOrigin: "https://private-resolver.example",
        outboundFields: ["organization", "locale"]
      }
    });
    const serialized = JSON.stringify(exported);

    expect(serialized).not.toContain("private.example");
    expect(serialized).not.toContain("private-resolver.example");
    expect(serialized).not.toMatch(/passwordValue|pageText|visitedUrl/);
    expect(exported).toMatchObject({
      privacy: {
        containsFieldValues: false,
        containsPageText: false,
        containsVisitedLocation: false,
        containsHistory: false
      },
      decision: { hasRegistrableDomain: true }
    });
  });
});
