import { parse } from "tldts";
import { toUnicode } from "punycode/";

export type UrlEvidenceCode =
  | "URL.PUNYCODE_VISIBLE"
  | "URL.MIXED_SCRIPT"
  | "URL.CONFUSABLE"
  | "URL.IP_LITERAL"
  | "URL.USERINFO"
  | "URL.UNUSUAL_PORT"
  | "URL.SUBDOMAIN_DEPTH"
  | "URL.BRAND_TOKEN_PLACEMENT";

export type UrlEvidence = {
  code: UrlEvidenceCode;
  detail: string;
  strength: "fact" | "weak";
};

export type UrlAnalysis = {
  state: "caution" | "unknown" | "no-strong-indicators";
  canonicalHostname?: string;
  displayHostname?: string;
  registrableDomain?: string;
  evidence: UrlEvidence[];
};

const scriptMatchers = {
  Cyrillic: /\p{Script=Cyrillic}/u,
  Greek: /\p{Script=Greek}/u,
  Han: /\p{Script=Han}/u,
  Hebrew: /\p{Script=Hebrew}/u,
  Latin: /\p{Script=Latin}/u,
  Arabic: /\p{Script=Arabic}/u
} as const;

const confusables: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  х: "x",
  у: "y",
  і: "i",
  ј: "j",
  ԁ: "d",
  ԛ: "q",
  Α: "a",
  Β: "b",
  Ε: "e",
  Ζ: "z",
  Η: "h",
  Ι: "i",
  Κ: "k",
  Μ: "m",
  Ν: "n",
  Ο: "o",
  Ρ: "p",
  Τ: "t",
  Υ: "y",
  Χ: "x",
  α: "a",
  β: "b",
  ε: "e",
  ι: "i",
  κ: "k",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "u",
  χ: "x"
};

const brandTokens = [
  "apple",
  "amazon",
  "google",
  "microsoft",
  "paypal",
  "swedbank",
  "seb",
  "citadele",
  "luminor"
];

function scriptsOf(value: string): string[] {
  return Object.entries(scriptMatchers)
    .filter(([, matcher]) => matcher.test(value))
    .map(([script]) => script);
}

function skeleton(value: string): string {
  return [...value.normalize("NFD").toLowerCase()]
    .map((character) => confusables[character] ?? character)
    .join("");
}

function isIpLiteral(
  hostname: string,
  parsed: ReturnType<typeof parse>
): boolean {
  return (
    parsed.isIp ||
    hostname.startsWith("[") ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)
  );
}

export function analyzeUrl(rawUrl: string | undefined): UrlAnalysis {
  if (!rawUrl) return { state: "unknown", evidence: [] };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { state: "unknown", evidence: [] };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return { state: "unknown", evidence: [] };

  const canonicalHostname = url.hostname.toLowerCase();
  const displayHostname = toUnicode(canonicalHostname);
  const parsed = parse(canonicalHostname, { allowPrivateDomains: false });
  const evidence: UrlEvidence[] = [];
  const weak = (code: UrlEvidenceCode, detail: string) =>
    evidence.push({ code, detail, strength: "weak" });

  if (canonicalHostname.includes("xn--"))
    evidence.push({
      code: "URL.PUNYCODE_VISIBLE",
      detail: `Punycode hostname: ${canonicalHostname}`,
      strength: "fact"
    });
  if (isIpLiteral(canonicalHostname, parsed))
    weak("URL.IP_LITERAL", "The host is an IP literal, not a named domain.");
  if (url.username || url.password)
    weak(
      "URL.USERINFO",
      "The URL contains user-info before the host, which can visually mislead."
    );
  if (
    url.port &&
    !(
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    )
  )
    weak("URL.UNUSUAL_PORT", `The URL uses non-default port ${url.port}.`);

  const scripts = scriptsOf(displayHostname);
  if (scripts.length > 1)
    weak(
      "URL.MIXED_SCRIPT",
      `Hostname contains multiple scripts: ${scripts.join(", ")}.`
    );
  const hasNonAscii = [...displayHostname].some(
    (character) => character.codePointAt(0)! > 0x7f
  );
  if (
    skeleton(displayHostname) !==
      displayHostname.normalize("NFD").toLowerCase() &&
    hasNonAscii
  )
    weak(
      "URL.CONFUSABLE",
      "Hostname contains characters with UTS #39-derived confusable mappings."
    );

  const labels = canonicalHostname.split(".");
  const registrableLabels = (parsed.domain ?? canonicalHostname).split(
    "."
  ).length;
  const subdomainLabels = Math.max(0, labels.length - registrableLabels);
  if (subdomainLabels >= 4)
    weak(
      "URL.SUBDOMAIN_DEPTH",
      `Hostname has ${subdomainLabels} subdomain labels before the registrable domain.`
    );
  const leftLabels = labels.slice(0, subdomainLabels).join("-");
  const token = brandTokens.find(
    (brand) =>
      leftLabels.includes(brand) && !(parsed.domain ?? "").includes(brand)
  );
  if (token)
    weak(
      "URL.BRAND_TOKEN_PLACEMENT",
      `Brand-like token “${token}” appears before an unrelated registrable domain.`
    );

  const result: UrlAnalysis = {
    state: evidence.some((item) => item.strength === "weak")
      ? "caution"
      : "no-strong-indicators",
    canonicalHostname,
    displayHostname,
    evidence
  };
  if (parsed.domain) result.registrableDomain = parsed.domain;
  return result;
}
