import { describe, expect, it } from "vitest";
import {
  domainRelationshipFor,
  findIdentity,
  findIdentityById,
  identityRegistry
} from "../../lib/identity-registry";

describe("positive identity registry", () => {
  it("contains the five required Latvian bank records", () => {
    expect(identityRegistry.schemaVersion).toBe(1);
    expect(identityRegistry.records.map((record) => record.id)).toEqual([
      "swedbank-latvia",
      "seb-latvia",
      "citadele-latvia",
      "luminor-latvia",
      "rietumu-banka"
    ]);
  });

  it("keeps every alias, domain, and relationship tied to record evidence", () => {
    const domains = new Set<string>();
    for (const record of identityRegistry.records) {
      const evidenceIds = new Set(record.evidence.map((item) => item.id));
      expect(record.organization).not.toBe("");
      expect(record.legalName).not.toBe("");
      expect(record.evidence.length).toBeGreaterThanOrEqual(2);
      expect(
        record.evidence.some((item) => item.type === "regulator-register")
      ).toBe(true);
      for (const evidence of record.evidence) {
        expect(evidence.sourceUrl).toMatch(/^https:\/\//);
        expect(evidence.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(evidence.reviewer).not.toBe("");
        expect(evidence.reverifyAfter).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      for (const alias of record.aliases) {
        expect(alias.value).not.toBe("");
        expect(alias.evidenceIds.length).toBeGreaterThan(0);
        expect(alias.evidenceIds.every((id) => evidenceIds.has(id))).toBe(true);
      }
      for (const domain of record.domains) {
        expect(domains.has(domain.domain)).toBe(false);
        domains.add(domain.domain);
        expect(domain.evidenceIds.every((id) => evidenceIds.has(id))).toBe(
          true
        );
      }
      for (const relationship of record.relationships)
        expect(
          relationship.evidenceIds.every((id) => evidenceIds.has(id))
        ).toBe(true);
    }
  });

  it("looks up aliases, IDs, and verified domains deterministically", () => {
    expect(findIdentity("SEB banka")?.id).toBe("seb-latvia");
    expect(findIdentityById("rietumu-banka")?.organization).toBe(
      "Rietumu Banka"
    );
    const rietumu = findIdentityById("rietumu-banka")!;
    expect(domainRelationshipFor(rietumu, "rietumu.lv")?.relationship).toBe(
      "official-login"
    );
    expect(domainRelationshipFor(rietumu, "example.test")).toBeUndefined();
  });
});
