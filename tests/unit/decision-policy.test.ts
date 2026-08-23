import { beforeEach, describe, expect, it } from "vitest";
import {
  combineFrameBehaviorSummaries,
  createBehaviorTracker
} from "../../lib/behavior-analysis";
import {
  compareClaimToUrl,
  extractClaimedIdentity
} from "../../lib/claimed-identity";
import { evaluateDecision, isDecisionSummary } from "../../lib/decision-policy";
import {
  analyzeDocument,
  combineFrameStructuralSummaries
} from "../../lib/dom-analysis";
import { analyzeUrl } from "../../lib/url-analysis";
import { mismatchedBankLoginFixture } from "../fixtures/identity-fixtures";

function decisionFor(url: string, body: string, title: string) {
  document.body.innerHTML = body;
  document.title = title;
  const identity = compareClaimToUrl(extractClaimedIdentity(document), url);
  const structural = combineFrameStructuralSummaries([
    analyzeDocument(document)
  ]);
  return evaluateDecision({
    identity,
    structural,
    behavior: undefined,
    url: analyzeUrl(url)
  });
}

describe("explicit decision policy", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.title = "";
  });

  it("requires all three independent gates for danger", () => {
    const result = decisionFor(
      mismatchedBankLoginFixture.url,
      mismatchedBankLoginFixture.body,
      mismatchedBankLoginFixture.title
    );
    expect(result).toMatchObject({
      state: "danger",
      gates: {
        strongIdentityClaim: true,
        sensitiveDataIntent: true,
        verifiedDomainMismatch: true
      },
      intervention: "required",
      organization: "Swedbank Latvia",
      registrableDomain: "example.test"
    });
    expect(result.evidence).toContain("POLICY.DANGER.THREE_GATES");
    expect(isDecisionSummary(result)).toBe(true);
  });

  it("does not warn for the same sensitive login on a verified domain", () => {
    const result = decisionFor(
      "https://www.swedbank.lv/private",
      mismatchedBankLoginFixture.body,
      mismatchedBankLoginFixture.title
    );
    expect(result.state).toBe("no-strong-indicators");
    expect(result.gates).toMatchObject({
      strongIdentityClaim: true,
      sensitiveDataIntent: true,
      verifiedDomainMismatch: false
    });
    expect(result.intervention).toBe("not-required");
  });

  it("keeps a strong mismatch without sensitive intent at caution", () => {
    const result = decisionFor(
      "https://login.example.test/",
      "<header>Swedbank</header><h1>Swedbank company information</h1>",
      "Swedbank"
    );
    expect(result.state).toBe("caution");
    expect(result.gates.sensitiveDataIntent).toBe(false);
    expect(result.intervention).toBe("not-required");
  });

  it("does not turn an unknown brand login into danger", () => {
    const result = decisionFor(
      "https://login.example.test/",
      '<h1>Example Credit Union</h1><form><input autocomplete="username"><input type="password"></form>',
      "Example Credit Union login"
    );
    expect(result.state).toBe("no-strong-indicators");
    expect(result.gates).toMatchObject({
      strongIdentityClaim: false,
      sensitiveDataIntent: true,
      verifiedDomainMismatch: false
    });
    expect(result.intervention).toBe("not-required");
  });

  it("records a deliberate bypass without weakening the danger state", () => {
    document.body.innerHTML = mismatchedBankLoginFixture.body;
    document.title = mismatchedBankLoginFixture.title;
    const url = mismatchedBankLoginFixture.url;
    const result = evaluateDecision({
      identity: compareClaimToUrl(extractClaimedIdentity(document), url),
      structural: combineFrameStructuralSummaries([analyzeDocument(document)]),
      behavior: undefined,
      url: analyzeUrl(url),
      bypassed: true
    });
    expect(result.state).toBe("danger");
    expect(result.intervention).toBe("bypassed");
  });

  it("uses unknown for partial visibility without the three danger facts", () => {
    document.body.innerHTML = "<h1>Ordinary page</h1>";
    const url = "https://example.test/";
    const result = evaluateDecision({
      identity: compareClaimToUrl(extractClaimedIdentity(document), url),
      structural: combineFrameStructuralSummaries([analyzeDocument(document)], {
        unavailableFrames: 1
      }),
      behavior: undefined,
      url: analyzeUrl(url)
    });
    expect(result.state).toBe("unknown");
    expect(result.evidence).toContain("POLICY.UNKNOWN.INCOMPLETE_VISIBILITY");
  });

  it("uses behavioral context for caution without changing the danger gates", () => {
    document.body.innerHTML = `
      <a href="/security-update.exe">Download update</a>
    `;
    const url = "https://example.test/";
    const tracker = createBehaviorTracker(document);
    tracker.observeClick(document.querySelector("a"));
    const result = evaluateDecision({
      identity: compareClaimToUrl(extractClaimedIdentity(document), url),
      structural: combineFrameStructuralSummaries([analyzeDocument(document)]),
      behavior: combineFrameBehaviorSummaries([tracker.current()]),
      url: analyzeUrl(url)
    });
    expect(result.state).toBe("caution");
    expect(result.evidence).toContain("POLICY.CAUTION.BEHAVIORAL_CONTEXT");
    expect(result.intervention).toBe("not-required");
  });

  it("uses unknown when canvas text makes identity visibility partial", () => {
    document.body.innerHTML = "<canvas></canvas>";
    const url = "https://example.test/";
    const result = evaluateDecision({
      identity: compareClaimToUrl(extractClaimedIdentity(document), url),
      structural: combineFrameStructuralSummaries([analyzeDocument(document)]),
      behavior: combineFrameBehaviorSummaries([
        createBehaviorTracker(document).current()
      ]),
      url: analyzeUrl(url)
    });
    expect(result.state).toBe("unknown");
  });

  it("rejects unbounded or invented decision messages", () => {
    const valid = decisionFor(
      mismatchedBankLoginFixture.url,
      mismatchedBankLoginFixture.body,
      mismatchedBankLoginFixture.title
    );
    expect(
      isDecisionSummary({
        ...valid,
        organization: "x".repeat(161)
      })
    ).toBe(false);
    expect(isDecisionSummary({ ...valid, evidence: ["POLICY.INVENTED"] })).toBe(
      false
    );
  });
});
