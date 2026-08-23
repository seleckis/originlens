import type {
  IdentityAssessment,
  IdentityCandidate,
  IdentityContextCode,
  IdentitySourceCode
} from "./claimed-identity";
import { findIdentityById, type DomainRelationship } from "./identity-registry";

const sourceLabels: Record<IdentitySourceCode, string> = {
  "IDENTITY.SOURCE.ACCESSIBLE_IMAGE": "accessible image label",
  "IDENTITY.SOURCE.FAVICON_METADATA": "favicon metadata",
  "IDENTITY.SOURCE.HEADING": "heading",
  "IDENTITY.SOURCE.HIGH_SALIENCE": "high-salience region",
  "IDENTITY.SOURCE.LEGAL_FOOTER": "legal/footer identity",
  "IDENTITY.SOURCE.LOGIN_CONTEXT": "login-related text",
  "IDENTITY.SOURCE.METADATA": "page metadata",
  "IDENTITY.SOURCE.TITLE": "page title"
};

const contextLabels: Record<IdentityContextCode, string> = {
  "IDENTITY.CONTEXT.ARTICLE": "article",
  "IDENTITY.CONTEXT.COMPARISON": "comparison/review",
  "IDENTITY.CONTEXT.CUSTOMER_LOGOS": "customer/partner logos",
  "IDENTITY.CONTEXT.DOCUMENTATION": "documentation/help",
  "IDENTITY.CONTEXT.OAUTH_SSO": "OAuth/SSO chooser",
  "IDENTITY.CONTEXT.PAYMENT": "payment/checkout"
};

const relationshipLabels: Record<DomainRelationship, string> = {
  canonical: "canonical domain",
  "legacy-redirect": "documented legacy redirect",
  "official-login": "official login domain",
  "parent-organization": "documented parent organization",
  "resolver-candidate": "signed resolver candidate"
};

export function identityOrganization(candidate: IdentityCandidate): string {
  return (
    findIdentityById(candidate.identityId)?.organization ??
    "Unknown registry record"
  );
}

export function identitySourceText(candidate: IdentityCandidate): string {
  return candidate.sources.map((code) => sourceLabels[code]).join(", ");
}

export function identityContextText(candidate: IdentityCandidate): string {
  return candidate.contexts.map((code) => contextLabels[code]).join(", ");
}

export function identityComparisonText(assessment: IdentityAssessment): string {
  const domain = assessment.registrableDomain ?? "an unavailable web domain";
  if (assessment.domainStatus === "verified")
    return `${assessment.organization ?? "The organization"} is linked to ${domain} as a ${relationshipLabels[assessment.relationship ?? "canonical"]}.`;
  if (assessment.domainStatus === "mismatch")
    return `${assessment.organization ?? "The organization"} is strongly claimed, but ${domain} is not in its verified domain relationships. This is one required danger gate and does not cause intervention without sensitive-data intent.`;
  if (assessment.summary.candidates.length > 1)
    return "Multiple registry organizations appear on this contextual page, so no identity/domain mismatch is applied.";
  if (assessment.candidate)
    return `${identityOrganization(assessment.candidate)} appears only as weak or contextual evidence, so no identity/domain mismatch is applied.`;
  return "No provenance-backed organization claim was detected.";
}
