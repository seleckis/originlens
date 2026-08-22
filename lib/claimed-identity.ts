import {
  domainRelationshipFor,
  findIdentityById,
  identityRegistry,
  type DomainRelationship
} from "./identity-registry";
import { analyzeUrl } from "./url-analysis";

export const IDENTITY_SIGNAL_LIMIT = 64;
export const IDENTITY_TEXT_LIMIT = 160;
const IDENTITY_TEXT_NODE_LIMIT = 32;

export type IdentitySourceCode =
  | "IDENTITY.SOURCE.ACCESSIBLE_IMAGE"
  | "IDENTITY.SOURCE.FAVICON_METADATA"
  | "IDENTITY.SOURCE.HEADING"
  | "IDENTITY.SOURCE.HIGH_SALIENCE"
  | "IDENTITY.SOURCE.LEGAL_FOOTER"
  | "IDENTITY.SOURCE.LOGIN_CONTEXT"
  | "IDENTITY.SOURCE.METADATA"
  | "IDENTITY.SOURCE.TITLE";

export type IdentityContextCode =
  | "IDENTITY.CONTEXT.ARTICLE"
  | "IDENTITY.CONTEXT.COMPARISON"
  | "IDENTITY.CONTEXT.CUSTOMER_LOGOS"
  | "IDENTITY.CONTEXT.DOCUMENTATION"
  | "IDENTITY.CONTEXT.OAUTH_SSO"
  | "IDENTITY.CONTEXT.PAYMENT";

export type IdentityCoverageCode =
  "IDENTITY.COVERAGE.BOUNDED" | "IDENTITY.COVERAGE.SCAN_TRUNCATED";

export type IdentityCandidate = {
  identityId: string;
  confidence: "strong" | "weak";
  sources: IdentitySourceCode[];
  contexts: IdentityContextCode[];
};

export type PageIdentitySummary = {
  version: 1;
  candidates: IdentityCandidate[];
  loginContext: boolean;
  scannedSignals: number;
  truncated: boolean;
  evidence: IdentityCoverageCode[];
};

export type IdentityComparisonEvidenceCode =
  | "IDENTITY.CLAIM.INSUFFICIENT"
  | "IDENTITY.CLAIM.MULTIPLE_ORGANIZATIONS"
  | "IDENTITY.DOMAIN.CANONICAL"
  | "IDENTITY.DOMAIN.LEGACY_REDIRECT"
  | "IDENTITY.DOMAIN.MISMATCH"
  | "IDENTITY.DOMAIN.OFFICIAL_LOGIN"
  | "IDENTITY.DOMAIN.PARENT_ORGANIZATION";

export type IdentityAssessment = {
  summary: PageIdentitySummary;
  domainStatus: "mismatch" | "not-applicable" | "verified";
  evidence: IdentityComparisonEvidenceCode[];
  candidate?: IdentityCandidate;
  organization?: string;
  registrableDomain?: string;
  relationship?: DomainRelationship;
};

type IdentitySignal = {
  source: IdentitySourceCode;
  text: string;
};

const sourceCodes = new Set<IdentitySourceCode>([
  "IDENTITY.SOURCE.ACCESSIBLE_IMAGE",
  "IDENTITY.SOURCE.FAVICON_METADATA",
  "IDENTITY.SOURCE.HEADING",
  "IDENTITY.SOURCE.HIGH_SALIENCE",
  "IDENTITY.SOURCE.LEGAL_FOOTER",
  "IDENTITY.SOURCE.LOGIN_CONTEXT",
  "IDENTITY.SOURCE.METADATA",
  "IDENTITY.SOURCE.TITLE"
]);

const contextCodes = new Set<IdentityContextCode>([
  "IDENTITY.CONTEXT.ARTICLE",
  "IDENTITY.CONTEXT.COMPARISON",
  "IDENTITY.CONTEXT.CUSTOMER_LOGOS",
  "IDENTITY.CONTEXT.DOCUMENTATION",
  "IDENTITY.CONTEXT.OAUTH_SSO",
  "IDENTITY.CONTEXT.PAYMENT"
]);

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAlias(value: string, alias: string): boolean {
  const normalizedValue = normalize(value);
  const normalizedAlias = normalize(alias);
  if (!normalizedValue || !normalizedAlias) return false;
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedAlias)}($|[^\\p{L}\\p{N}])`,
    "u"
  ).test(normalizedValue);
}

function boundedAttribute(element: Element, name: string): string {
  return (element.getAttribute(name) ?? "").slice(0, IDENTITY_TEXT_LIMIT);
}

function boundedNodeText(node: Node): string {
  const document = node.ownerDocument;
  if (!document) return "";
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let text = "";
  let scanned = 0;
  while (
    scanned < IDENTITY_TEXT_NODE_LIMIT &&
    text.length < IDENTITY_TEXT_LIMIT
  ) {
    const current = walker.nextNode();
    if (!current) break;
    scanned++;
    const parent = current.parentElement;
    if (parent?.closest("script, style, noscript, template")) continue;
    text += ` ${current.nodeValue?.slice(0, IDENTITY_TEXT_LIMIT - text.length) ?? ""}`;
  }
  return text.slice(0, IDENTITY_TEXT_LIMIT);
}

function boundedDocumentTitle(document: Document): string {
  const title = document.querySelector("title");
  return title ? boundedNodeText(title) : "";
}

function boundedElements(
  document: Document,
  selector: string,
  maximum: number
): { elements: Element[]; truncated: boolean } {
  const collection = document.querySelectorAll(selector);
  return {
    elements: [...collection].slice(0, maximum),
    truncated: collection.length > maximum
  };
}

function documentContexts(document: Document): IdentityContextCode[] {
  const context = new Set<IdentityContextCode>();
  const headingText = boundedElements(document, "h1, h2", 8)
    .elements.map(boundedNodeText)
    .join(" ");
  const descriptor = normalize(
    `${boundedDocumentTitle(document)} ${headingText}`
  );
  const ogType = normalize(
    document
      .querySelector('meta[property="og:type"]')
      ?.getAttribute("content") ?? ""
  );

  if (document.querySelector("article, [role=article]") || ogType === "article")
    context.add("IDENTITY.CONTEXT.ARTICLE");
  if (/\b(compare|comparison|versus|vs\.?|review)\b/.test(descriptor))
    context.add("IDENTITY.CONTEXT.COMPARISON");
  if (/\b(documentation|docs|guide|help centre|help center)\b/.test(descriptor))
    context.add("IDENTITY.CONTEXT.DOCUMENTATION");
  if (/\b(checkout|payment|pay with|payment provider)\b/.test(descriptor))
    context.add("IDENTITY.CONTEXT.PAYMENT");
  if (
    /\b(oauth|single sign-on|sso|continue with|sign in with)\b/.test(descriptor)
  )
    context.add("IDENTITY.CONTEXT.OAUTH_SSO");

  const labeledRegions = boundedElements(
    document,
    "[class], [id], [aria-label]",
    64
  ).elements;
  if (
    labeledRegions.some((element) =>
      /\b(customer|partner|trusted.?by).?logo/.test(
        normalize(
          `${boundedAttribute(element, "class")} ${boundedAttribute(element, "id")} ${boundedAttribute(element, "aria-label")}`
        )
      )
    )
  )
    context.add("IDENTITY.CONTEXT.CUSTOMER_LOGOS");
  return [...context];
}

function collectSignals(document: Document): {
  signals: IdentitySignal[];
  truncated: boolean;
} {
  const signals: IdentitySignal[] = [];
  let truncated = false;
  const add = (source: IdentitySourceCode, value: string) => {
    const text = value.slice(0, IDENTITY_TEXT_LIMIT);
    if (!normalize(text)) return;
    if (signals.length >= IDENTITY_SIGNAL_LIMIT) {
      truncated = true;
      return;
    }
    signals.push({ source, text });
  };
  const addElements = (
    selector: string,
    maximum: number,
    source: IdentitySourceCode,
    values: (element: Element) => string[] = (element) => [
      boundedNodeText(element)
    ]
  ) => {
    const result = boundedElements(document, selector, maximum);
    truncated ||= result.truncated;
    for (const element of result.elements)
      for (const value of values(element)) add(source, value);
  };

  add("IDENTITY.SOURCE.TITLE", boundedDocumentTitle(document));
  addElements("h1, h2", 8, "IDENTITY.SOURCE.HEADING");
  addElements(
    'meta[name="application-name"], meta[property="og:site_name"], meta[property="og:title"], meta[name="twitter:title"]',
    12,
    "IDENTITY.SOURCE.METADATA",
    (element) => [boundedAttribute(element, "content")]
  );
  addElements(
    'link[rel~="icon"]',
    8,
    "IDENTITY.SOURCE.FAVICON_METADATA",
    (element) => [
      boundedAttribute(element, "href"),
      boundedAttribute(element, "title"),
      boundedAttribute(element, "aria-label")
    ]
  );
  addElements(
    'img[alt], img[aria-label], img[title], [role="img"]',
    16,
    "IDENTITY.SOURCE.ACCESSIBLE_IMAGE",
    (element) => [
      boundedAttribute(element, "alt"),
      boundedAttribute(element, "aria-label"),
      boundedAttribute(element, "title")
    ]
  );
  addElements(
    'header, [role="banner"], [class*="brand" i], [class*="logo" i]',
    16,
    "IDENTITY.SOURCE.HIGH_SALIENCE"
  );
  addElements(
    'footer, [role="contentinfo"], [class*="legal" i]',
    8,
    "IDENTITY.SOURCE.LEGAL_FOOTER"
  );
  addElements(
    "form:has(input[type=password], input[autocomplete=one-time-code])",
    8,
    "IDENTITY.SOURCE.LOGIN_CONTEXT"
  );
  return { signals, truncated };
}

export function extractClaimedIdentity(
  document: Document
): PageIdentitySummary {
  const { signals, truncated } = collectSignals(document);
  const loginContext =
    document.querySelector(
      'input[type="password"], input[autocomplete="one-time-code"]'
    ) !== null;
  const contexts = documentContexts(document);
  const candidates: IdentityCandidate[] = [];

  for (const record of identityRegistry.records) {
    const sources = new Set<IdentitySourceCode>();
    for (const signal of signals)
      if (
        record.aliases.some((alias) => containsAlias(signal.text, alias.value))
      )
        sources.add(signal.source);
    if (sources.size === 0) continue;
    const strong = loginContext || sources.size >= 2;
    candidates.push({
      identityId: record.id,
      confidence:
        strong && (contexts.length === 0 || loginContext) ? "strong" : "weak",
      sources: [...sources],
      contexts: [...contexts]
    });
  }

  if (candidates.length > 1)
    for (const candidate of candidates) candidate.confidence = "weak";

  return {
    version: 1,
    candidates,
    loginContext,
    scannedSignals: signals.length,
    truncated,
    evidence: [
      truncated
        ? "IDENTITY.COVERAGE.SCAN_TRUNCATED"
        : "IDENTITY.COVERAGE.BOUNDED"
    ]
  };
}

export function isPageIdentitySummary(
  value: unknown
): value is PageIdentitySummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  if (
    summary.version !== 1 ||
    typeof summary.loginContext !== "boolean" ||
    typeof summary.scannedSignals !== "number" ||
    !Number.isInteger(summary.scannedSignals) ||
    summary.scannedSignals < 0 ||
    summary.scannedSignals > IDENTITY_SIGNAL_LIMIT ||
    typeof summary.truncated !== "boolean" ||
    !Array.isArray(summary.candidates) ||
    summary.candidates.length > identityRegistry.records.length ||
    !Array.isArray(summary.evidence) ||
    summary.evidence.length !== 1 ||
    !["IDENTITY.COVERAGE.BOUNDED", "IDENTITY.COVERAGE.SCAN_TRUNCATED"].includes(
      String(summary.evidence[0])
    )
  )
    return false;

  return summary.candidates.every((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const item = candidate as Record<string, unknown>;
    return (
      typeof item.identityId === "string" &&
      findIdentityById(item.identityId) !== undefined &&
      (item.confidence === "strong" || item.confidence === "weak") &&
      Array.isArray(item.sources) &&
      item.sources.length <= sourceCodes.size &&
      item.sources.every((code) =>
        sourceCodes.has(code as IdentitySourceCode)
      ) &&
      Array.isArray(item.contexts) &&
      item.contexts.length <= contextCodes.size &&
      item.contexts.every((code) =>
        contextCodes.has(code as IdentityContextCode)
      )
    );
  });
}

function relationshipEvidence(
  relationship: DomainRelationship
): IdentityComparisonEvidenceCode {
  switch (relationship) {
    case "canonical":
      return "IDENTITY.DOMAIN.CANONICAL";
    case "legacy-redirect":
      return "IDENTITY.DOMAIN.LEGACY_REDIRECT";
    case "official-login":
      return "IDENTITY.DOMAIN.OFFICIAL_LOGIN";
    case "parent-organization":
      return "IDENTITY.DOMAIN.PARENT_ORGANIZATION";
  }
}

export function compareClaimToUrl(
  summary: PageIdentitySummary,
  rawUrl: string | undefined
): IdentityAssessment {
  const registrableDomain = analyzeUrl(rawUrl).registrableDomain;
  const domainMatches = registrableDomain
    ? summary.candidates.flatMap((candidate) => {
        const record = findIdentityById(candidate.identityId);
        if (!record) return [];
        const relationship = domainRelationshipFor(record, registrableDomain);
        return relationship ? [{ candidate, record, relationship }] : [];
      })
    : [];

  if (domainMatches.length === 1) {
    const { candidate, record, relationship } = domainMatches[0]!;
    return {
      summary,
      domainStatus: "verified",
      evidence: [relationshipEvidence(relationship.relationship)],
      candidate,
      organization: record.organization,
      ...(registrableDomain ? { registrableDomain } : {}),
      relationship: relationship.relationship
    };
  }

  if (summary.candidates.length !== 1) {
    return {
      summary,
      domainStatus: "not-applicable",
      evidence: [
        summary.candidates.length > 1
          ? "IDENTITY.CLAIM.MULTIPLE_ORGANIZATIONS"
          : "IDENTITY.CLAIM.INSUFFICIENT"
      ],
      ...(registrableDomain ? { registrableDomain } : {})
    };
  }

  const candidate = summary.candidates[0]!;
  const record = findIdentityById(candidate.identityId);
  if (!record || candidate.confidence !== "strong" || !registrableDomain) {
    return {
      summary,
      domainStatus: "not-applicable",
      evidence: ["IDENTITY.CLAIM.INSUFFICIENT"],
      candidate,
      ...(record ? { organization: record.organization } : {}),
      ...(registrableDomain ? { registrableDomain } : {})
    };
  }

  return {
    summary,
    domainStatus: "mismatch",
    evidence: ["IDENTITY.DOMAIN.MISMATCH"],
    candidate,
    organization: record.organization,
    registrableDomain
  };
}
