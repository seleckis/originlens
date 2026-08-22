export const IDENTITY_REGISTRY_SCHEMA_VERSION = 1;
export const IDENTITY_REGISTRY_RELEASE = "2026-08-22";

export type IdentityEvidenceType =
  | "official-domain-guidance"
  | "official-organization-page"
  | "official-root-link"
  | "regulator-register";

export type IdentityEvidence = {
  id: string;
  sourceUrl: string;
  type: IdentityEvidenceType;
  verifiedAt: string;
  reviewer: string;
  reverifyAfter?: string;
};

export type IdentityAlias = {
  value: string;
  evidenceIds: readonly string[];
};

export type DomainRelationship =
  "canonical" | "legacy-redirect" | "official-login" | "parent-organization";

export type VerifiedIdentityDomain = {
  domain: string;
  relationship: DomainRelationship;
  evidenceIds: readonly string[];
  relatedOrganization?: string;
};

export type OrganizationRelationship = {
  organization: string;
  type: "parent" | "subsidiary";
  evidenceIds: readonly string[];
};

export type IdentityRecord = {
  id: string;
  organization: string;
  legalName: string;
  aliases: readonly IdentityAlias[];
  domains: readonly VerifiedIdentityDomain[];
  relationships: readonly OrganizationRelationship[];
  evidence: readonly IdentityEvidence[];
  liveCheckUrl: string;
};

export type IdentityRegistry = {
  schemaVersion: typeof IDENTITY_REGISTRY_SCHEMA_VERSION;
  release: string;
  records: readonly IdentityRecord[];
};

const regulatorEvidence = (id: string): IdentityEvidence => ({
  id,
  sourceUrl:
    "https://www.bank.lv/darbibas-jomas/monetaras-politikas-istenosana/vertspapiru-un-nodrosinajuma-sistema",
  type: "regulator-register",
  verifiedAt: IDENTITY_REGISTRY_RELEASE,
  reviewer: "OriginLens maintainers",
  reverifyAfter: "2027-02-22"
});

export const identityRegistry: IdentityRegistry = {
  schemaVersion: IDENTITY_REGISTRY_SCHEMA_VERSION,
  release: IDENTITY_REGISTRY_RELEASE,
  records: [
    {
      id: "swedbank-latvia",
      organization: "Swedbank Latvia",
      legalName: '"Swedbank" AS',
      aliases: [
        {
          value: "Swedbank",
          evidenceIds: ["swedbank-regulator", "swedbank-domain-guidance"]
        },
        {
          value: "Swedbank Latvia",
          evidenceIds: ["swedbank-regulator", "swedbank-governance"]
        }
      ],
      domains: [
        {
          domain: "swedbank.lv",
          relationship: "canonical",
          evidenceIds: ["swedbank-domain-guidance"]
        },
        {
          domain: "swedbank.com",
          relationship: "parent-organization",
          relatedOrganization: "Swedbank AB",
          evidenceIds: ["swedbank-governance"]
        }
      ],
      relationships: [
        {
          organization: "Swedbank Baltics AS",
          type: "parent",
          evidenceIds: ["swedbank-governance"]
        },
        {
          organization: "Swedbank AB",
          type: "parent",
          evidenceIds: ["swedbank-governance"]
        }
      ],
      evidence: [
        regulatorEvidence("swedbank-regulator"),
        {
          id: "swedbank-domain-guidance",
          sourceUrl:
            "https://www.swedbank.lv/business/useful/useful/internetbank?language=ENG",
          type: "official-domain-guidance",
          verifiedAt: IDENTITY_REGISTRY_RELEASE,
          reviewer: "OriginLens maintainers",
          reverifyAfter: "2027-02-22"
        },
        {
          id: "swedbank-governance",
          sourceUrl: "https://www.swedbank.lv/about/governance?language=ENG",
          type: "official-organization-page",
          verifiedAt: IDENTITY_REGISTRY_RELEASE,
          reviewer: "OriginLens maintainers",
          reverifyAfter: "2027-02-22"
        }
      ],
      liveCheckUrl: "https://www.swedbank.lv/about?language=ENG"
    },
    {
      id: "seb-latvia",
      organization: "SEB Latvia",
      legalName: 'AS "SEB banka"',
      aliases: [
        {
          value: "SEB",
          evidenceIds: ["seb-regulator", "seb-domain-guidance"]
        },
        {
          value: "SEB banka",
          evidenceIds: ["seb-regulator", "seb-domain-guidance"]
        }
      ],
      domains: [
        {
          domain: "seb.lv",
          relationship: "canonical",
          evidenceIds: ["seb-domain-guidance"]
        },
        {
          domain: "ibanka.lv",
          relationship: "legacy-redirect",
          evidenceIds: ["seb-domain-guidance"]
        }
      ],
      relationships: [],
      evidence: [
        regulatorEvidence("seb-regulator"),
        {
          id: "seb-domain-guidance",
          sourceUrl:
            "https://www.seb.lv/info/pazinojumi/mainas-seb-bankas-logo-majaslapa-un-internetbanka",
          type: "official-domain-guidance",
          verifiedAt: IDENTITY_REGISTRY_RELEASE,
          reviewer: "OriginLens maintainers",
          reverifyAfter: "2027-02-22"
        }
      ],
      liveCheckUrl: "https://www.seb.lv/en/private"
    },
    {
      id: "citadele-latvia",
      organization: "Citadele",
      legalName: 'AS "Citadele banka"',
      aliases: [
        {
          value: "Citadele",
          evidenceIds: ["citadele-regulator", "citadele-domain-guidance"]
        },
        {
          value: "Citadele banka",
          evidenceIds: ["citadele-regulator", "citadele-domain-guidance"]
        },
        {
          value: "Banka Citadele",
          evidenceIds: ["citadele-regulator", "citadele-domain-guidance"]
        }
      ],
      domains: [
        {
          domain: "citadele.lv",
          relationship: "canonical",
          evidenceIds: ["citadele-domain-guidance"]
        }
      ],
      relationships: [],
      evidence: [
        regulatorEvidence("citadele-regulator"),
        {
          id: "citadele-domain-guidance",
          sourceUrl: "https://www.citadele.lv/en/useful/security/",
          type: "official-domain-guidance",
          verifiedAt: IDENTITY_REGISTRY_RELEASE,
          reviewer: "OriginLens maintainers",
          reverifyAfter: "2027-02-22"
        }
      ],
      liveCheckUrl: "https://www.citadele.lv/en/private/"
    },
    {
      id: "luminor-latvia",
      organization: "Luminor",
      legalName: "Luminor Bank AS Latvijas filiāle",
      aliases: [
        {
          value: "Luminor",
          evidenceIds: ["luminor-regulator", "luminor-domain-guidance"]
        },
        {
          value: "Luminor Bank",
          evidenceIds: ["luminor-regulator", "luminor-domain-guidance"]
        }
      ],
      domains: [
        {
          domain: "luminor.lv",
          relationship: "canonical",
          evidenceIds: ["luminor-domain-guidance"]
        }
      ],
      relationships: [],
      evidence: [
        regulatorEvidence("luminor-regulator"),
        {
          id: "luminor-domain-guidance",
          sourceUrl:
            "https://www.luminor.lv/lv/jaunumi/izmainas-luminor-internetbankas-adrese",
          type: "official-domain-guidance",
          verifiedAt: IDENTITY_REGISTRY_RELEASE,
          reviewer: "OriginLens maintainers",
          reverifyAfter: "2027-02-22"
        }
      ],
      liveCheckUrl: "https://www.luminor.lv/en/private"
    },
    {
      id: "rietumu-banka",
      organization: "Rietumu Banka",
      legalName: 'AS "Rietumu Banka"',
      aliases: [
        {
          value: "Rietumu",
          evidenceIds: ["rietumu-regulator", "rietumu-root-link"]
        },
        {
          value: "Rietumu Banka",
          evidenceIds: ["rietumu-regulator", "rietumu-root-link"]
        },
        {
          value: "iRietumu",
          evidenceIds: ["rietumu-root-link"]
        }
      ],
      domains: [
        {
          domain: "rietumu.com",
          relationship: "canonical",
          evidenceIds: ["rietumu-root-link"]
        },
        {
          domain: "rietumu.lv",
          relationship: "official-login",
          evidenceIds: ["rietumu-root-link"]
        }
      ],
      relationships: [],
      evidence: [
        regulatorEvidence("rietumu-regulator"),
        {
          id: "rietumu-root-link",
          sourceUrl:
            "https://www.rietumu.com/lv/person/accounts/remote/onpc/irietumu",
          type: "official-root-link",
          verifiedAt: IDENTITY_REGISTRY_RELEASE,
          reviewer: "OriginLens maintainers",
          reverifyAfter: "2027-02-22"
        }
      ],
      liveCheckUrl: "https://www.rietumu.com/lv"
    }
  ]
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().trim();
}

export function findIdentityById(id: string): IdentityRecord | undefined {
  return identityRegistry.records.find((record) => record.id === id);
}

export function findIdentity(alias: string): IdentityRecord | undefined {
  const normalized = normalize(alias);
  return identityRegistry.records.find((record) =>
    record.aliases.some(
      (candidate) => normalize(candidate.value) === normalized
    )
  );
}

export function domainRelationshipFor(
  record: IdentityRecord,
  registrableDomain: string
): VerifiedIdentityDomain | undefined {
  const normalized = normalize(registrableDomain);
  return record.domains.find((candidate) => candidate.domain === normalized);
}
