import { beforeEach, describe, expect, it } from "vitest";
import {
  compareClaimToUrl,
  extractClaimedIdentity,
  IDENTITY_SIGNAL_LIMIT,
  isPageIdentitySummary
} from "../../lib/claimed-identity";
import {
  benignIdentityContextFixtures,
  mismatchedBankLoginFixture,
  verifiedIdentityFixtures,
  type IdentityDocumentFixture
} from "../fixtures/identity-fixtures";

function loadFixture(fixture: IdentityDocumentFixture): void {
  document.head.innerHTML = "";
  document.body.innerHTML = fixture.body;
  document.title = fixture.title;
}

describe("claimed identity analysis", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.title = "";
  });

  it("extracts only bounded registry IDs and evidence codes without field values", () => {
    document.head.innerHTML = `
      <title>Swedbank secure login</title>
      <meta property="og:site_name" content="Swedbank">
      <link rel="icon" href="/swedbank-icon.svg">
    `;
    document.body.innerHTML = `
      <header class="brand"><img alt="Swedbank"></header>
      <h1>Swedbank internet bank</h1>
      <form><label>Swedbank password <input type="password" value="manual-secret-marker"></label></form>
      <footer>© Swedbank Latvia</footer>
    `;
    const password = document.querySelector<HTMLInputElement>(
      'input[type="password"]'
    );
    Object.defineProperty(password!, "value", {
      get: () => {
        throw new Error("Identity analysis must never read field values");
      }
    });

    const summary = extractClaimedIdentity(document);
    expect(summary.candidates).toHaveLength(1);
    expect(summary.candidates[0]).toMatchObject({
      identityId: "swedbank-latvia",
      confidence: "strong"
    });
    expect(summary.candidates[0]?.sources).toEqual(
      expect.arrayContaining([
        "IDENTITY.SOURCE.TITLE",
        "IDENTITY.SOURCE.METADATA",
        "IDENTITY.SOURCE.FAVICON_METADATA",
        "IDENTITY.SOURCE.ACCESSIBLE_IMAGE",
        "IDENTITY.SOURCE.HEADING",
        "IDENTITY.SOURCE.LOGIN_CONTEXT",
        "IDENTITY.SOURCE.LEGAL_FOOTER"
      ])
    );
    expect(JSON.stringify(summary)).not.toContain("manual-secret-marker");
    expect(isPageIdentitySummary(summary)).toBe(true);
  });

  it("uses token boundaries for short aliases", () => {
    document.title = "Website builder";
    document.body.innerHTML = "<h1>Build accessible websites</h1>";
    expect(extractClaimedIdentity(document).candidates).toEqual([]);
  });

  it("bounds hostile identity surfaces before matching", () => {
    document.title = `${"x".repeat(100_000)} Swedbank`;
    document.body.innerHTML = Array.from(
      { length: 100 },
      () => `<h1>${"y".repeat(1_000)}</h1>`
    ).join("");
    const summary = extractClaimedIdentity(document);
    expect(summary.scannedSignals).toBeLessThanOrEqual(IDENTITY_SIGNAL_LIMIT);
    expect(summary.truncated).toBe(true);
    expect(summary.candidates).toEqual([]);
    expect(isPageIdentitySummary(summary)).toBe(true);
  });

  it.each(verifiedIdentityFixtures)(
    "verifies $name from provenance-backed domain relationships",
    (fixture) => {
      loadFixture(fixture);
      const assessment = compareClaimToUrl(
        extractClaimedIdentity(document),
        fixture.url
      );
      expect(assessment.domainStatus).toBe("verified");
      expect(assessment.evidence).not.toContain("IDENTITY.DOMAIN.MISMATCH");
    }
  );

  it("recognizes documented parent and legacy-redirect relationships", () => {
    document.title = "Swedbank";
    document.body.innerHTML = "<header>Swedbank Latvia</header>";
    expect(
      compareClaimToUrl(
        extractClaimedIdentity(document),
        "https://www.swedbank.com/"
      )
    ).toMatchObject({
      domainStatus: "verified",
      relationship: "parent-organization",
      evidence: ["IDENTITY.DOMAIN.PARENT_ORGANIZATION"]
    });

    document.title = "SEB banka";
    document.body.innerHTML = "<header>SEB</header>";
    expect(
      compareClaimToUrl(extractClaimedIdentity(document), "https://ibanka.lv/")
    ).toMatchObject({
      domainStatus: "verified",
      relationship: "legacy-redirect",
      evidence: ["IDENTITY.DOMAIN.LEGACY_REDIRECT"]
    });
  });

  it.each(benignIdentityContextFixtures)(
    "does not turn $name into a mismatch",
    (fixture) => {
      loadFixture(fixture);
      const assessment = compareClaimToUrl(
        extractClaimedIdentity(document),
        fixture.url
      );
      expect(assessment.domainStatus).toBe("not-applicable");
      expect(assessment.evidence).not.toContain("IDENTITY.DOMAIN.MISMATCH");
      for (const candidate of assessment.summary.candidates)
        expect(candidate.confidence).toBe("weak");
    }
  );

  it("reports an explainable mismatch only for a strong single claim", () => {
    loadFixture(mismatchedBankLoginFixture);
    const assessment = compareClaimToUrl(
      extractClaimedIdentity(document),
      mismatchedBankLoginFixture.url
    );
    expect(assessment).toMatchObject({
      domainStatus: "mismatch",
      organization: "Swedbank Latvia",
      registrableDomain: "example.test",
      evidence: ["IDENTITY.DOMAIN.MISMATCH"],
      candidate: { confidence: "strong" }
    });
    expect(JSON.stringify(assessment)).not.toContain("fake-secret-never-read");
  });

  it("does not let a context label suppress a credential-taking mismatch", () => {
    document.title = "Swedbank account news";
    document.body.innerHTML =
      '<article><h1>Swedbank account update</h1><form><input type="password"></form></article>';
    const assessment = compareClaimToUrl(
      extractClaimedIdentity(document),
      "https://attacker.example/"
    );
    expect(assessment.domainStatus).toBe("mismatch");
    expect(assessment.candidate?.confidence).toBe("strong");
  });

  it("rejects unbounded or page-invented summaries", () => {
    expect(
      isPageIdentitySummary({
        version: 1,
        candidates: [
          {
            identityId: "page-invented-bank",
            confidence: "strong",
            sources: ["IDENTITY.SOURCE.TITLE"],
            contexts: []
          }
        ],
        loginContext: true,
        scannedSignals: IDENTITY_SIGNAL_LIMIT + 1,
        truncated: true,
        evidence: ["IDENTITY.COVERAGE.SCAN_TRUNCATED"]
      })
    ).toBe(false);
  });
});
