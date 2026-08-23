import { parse } from "tldts";

export const RESOLVER_PROTOCOL_VERSION = 1;
export const RESOLVER_RESPONSE_LIMIT = 64 * 1024;
export const RESOLVER_CANDIDATE_LIMIT = 20;
export const RESOLVER_CACHE_LIMIT = 32;
export const RESOLVER_MIN_REQUEST_INTERVAL_MS = 30_000;
export const RESOLVER_MAX_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export type ResolverConfig = {
  version: 1;
  enabled: boolean;
  endpoint: string;
  publicKey: string;
  keyId: string;
  locale: string;
};

export type ResolverRequest = {
  version: 1;
  organization: string;
  locale: string;
};

export type ResolverProvenance = {
  sourceUrl: string;
  evidenceType:
    | "official-domain-guidance"
    | "official-root-link"
    | "regulator-register"
    | "resolver-review";
  verifiedAt: string;
  reviewer: string;
};

export type ResolverCandidate = {
  domain: string;
  confidence: number;
  provenance: ResolverProvenance[];
};

export type ResolverPayload = {
  version: 1;
  organization: string;
  locale: string;
  candidates: ResolverCandidate[];
  issuedAt: string;
  expiresAt: string;
  keyId: string;
};

export type SignedResolverResponse = {
  payload: ResolverPayload;
  signature: string;
};

export type ResolverResult = {
  status: "verified" | "unavailable" | "invalid" | "rate-limited";
  request: ResolverRequest;
  candidates: ResolverCandidate[];
  expiresAt?: string;
  evidenceCode:
    | "RESOLVER.SIGNED_RESPONSE"
    | "RESOLVER.UNAVAILABLE"
    | "RESOLVER.INVALID_RESPONSE"
    | "RESOLVER.RATE_LIMITED";
};

export type ResolverStatus = {
  version: 1;
  enabled: boolean;
  configured: boolean;
  outboundFields: readonly ["organization", "locale"];
  endpointOrigin?: string;
  lastResult?: {
    status: ResolverResult["status"];
    evidenceCode: ResolverResult["evidenceCode"];
    organization: string;
    locale: string;
    candidateCount: number;
    expiresAt?: string;
  };
};

export const disabledResolverConfig: ResolverConfig = {
  version: 1,
  enabled: false,
  endpoint: "",
  publicKey: "",
  keyId: "",
  locale: "en-LV"
};

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

type ClientOptions = {
  fetcher?: FetchLike;
  now?: () => number;
};

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actual = Object.keys(value).sort();
  return (
    actual.length === keys.length &&
    [...keys].sort().every((key, index) => actual[index] === key)
  );
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return undefined;
  try {
    const padded = `${value.replace(/-/g, "+").replace(/_/g, "/")}${"=".repeat((4 - (value.length % 4)) % 4)}`;
    const decoded = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
    for (let index = 0; index < decoded.length; index++)
      bytes[index] = decoded.charCodeAt(index);
    return bytes;
  } catch {
    return undefined;
  }
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

export function normalizeResolverOrganization(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function normalizeResolverLocale(value: string): string | undefined {
  if (!value || value.length > 35) return undefined;
  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch {
    return undefined;
  }
}

export function validateResolverEndpoint(value: string): string | undefined {
  try {
    const url = new URL(value);
    const loopback =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return undefined;
    url.pathname = url.pathname.replace(/\/+$/, "") || "/v1/resolve";
    if (!url.pathname.endsWith("/v1/resolve")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function isResolverConfig(value: unknown): value is ResolverConfig {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "version",
      "enabled",
      "endpoint",
      "publicKey",
      "keyId",
      "locale"
    ])
  )
    return false;
  const enabled = value.enabled === true;
  const locale =
    typeof value.locale === "string"
      ? normalizeResolverLocale(value.locale)
      : undefined;
  const keyBytes =
    typeof value.publicKey === "string"
      ? base64UrlBytes(value.publicKey)
      : undefined;
  return (
    value.version === 1 &&
    typeof value.enabled === "boolean" &&
    typeof value.endpoint === "string" &&
    (!enabled || validateResolverEndpoint(value.endpoint) === value.endpoint) &&
    typeof value.publicKey === "string" &&
    (!enabled || keyBytes?.length === 32) &&
    typeof value.keyId === "string" &&
    (!enabled || /^[A-Za-z0-9._-]{1,64}$/.test(value.keyId)) &&
    value.endpoint.length <= 2048 &&
    value.publicKey.length <= 128 &&
    value.keyId.length <= 64 &&
    locale === value.locale
  );
}

function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function validCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function validDomain(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 253) return false;
  try {
    const url = new URL(`https://${value}`);
    const parsed = parse(url.hostname, { allowPrivateDomains: true });
    return (
      url.hostname === value &&
      parsed.isIp === false &&
      parsed.domain === value &&
      !value.endsWith(".")
    );
  } catch {
    return false;
  }
}

function isProvenance(value: unknown): value is ResolverProvenance {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["sourceUrl", "evidenceType", "verifiedAt", "reviewer"])
  )
    return false;
  let source: URL;
  try {
    source = new URL(String(value.sourceUrl));
  } catch {
    return false;
  }
  return (
    source.protocol === "https:" &&
    String(value.sourceUrl).length <= 2048 &&
    [
      "official-domain-guidance",
      "official-root-link",
      "regulator-register",
      "resolver-review"
    ].includes(String(value.evidenceType)) &&
    validCalendarDate(value.verifiedAt) &&
    typeof value.reviewer === "string" &&
    value.reviewer.length > 0 &&
    value.reviewer.length <= 120
  );
}

function isCandidate(value: unknown): value is ResolverCandidate {
  return (
    isRecord(value) &&
    exactKeys(value, ["domain", "confidence", "provenance"]) &&
    validDomain(value.domain) &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    Array.isArray(value.provenance) &&
    value.provenance.length > 0 &&
    value.provenance.length <= 5 &&
    value.provenance.every(isProvenance)
  );
}

function validatePayload(
  value: unknown,
  request: ResolverRequest,
  config: ResolverConfig,
  now: number
): value is ResolverPayload {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "version",
      "organization",
      "locale",
      "candidates",
      "issuedAt",
      "expiresAt",
      "keyId"
    ])
  )
    return false;
  if (
    value.version !== 1 ||
    value.organization !== request.organization ||
    value.locale !== request.locale ||
    value.keyId !== config.keyId ||
    !Array.isArray(value.candidates) ||
    value.candidates.length > RESOLVER_CANDIDATE_LIMIT ||
    !value.candidates.every(isCandidate) ||
    !validDate(value.issuedAt) ||
    !validDate(value.expiresAt)
  )
    return false;
  const issuedAt = Date.parse(value.issuedAt);
  const expiresAt = Date.parse(value.expiresAt);
  return (
    new Set(value.candidates.map((candidate) => candidate.domain)).size ===
      value.candidates.length &&
    issuedAt <= now + 5 * 60_000 &&
    expiresAt > now &&
    expiresAt > issuedAt &&
    expiresAt - issuedAt <= RESOLVER_MAX_LIFETIME_MS
  );
}

async function verifyResponse(
  value: unknown,
  request: ResolverRequest,
  config: ResolverConfig,
  now: number
): Promise<SignedResolverResponse | undefined> {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["payload", "signature"]) ||
    typeof value.signature !== "string" ||
    !validatePayload(value.payload, request, config, now)
  )
    return undefined;
  const publicKey = base64UrlBytes(config.publicKey);
  const signature = base64UrlBytes(value.signature);
  if (publicKey?.length !== 32 || signature?.length !== 64) return undefined;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      publicKey,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "Ed25519",
      key,
      signature,
      new TextEncoder().encode(canonicalJson(value.payload))
    );
    return valid ? (value as SignedResolverResponse) : undefined;
  } catch {
    return undefined;
  }
}

async function readBoundedResponse(response: Response): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > RESOLVER_RESPONSE_LIMIT)
      throw new Error("resolver response too large");
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > RESOLVER_RESPONSE_LIMIT) {
      await reader.cancel();
      throw new Error("resolver response too large");
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}

export class IdentityResolverClient {
  private readonly fetcher: FetchLike;
  private readonly now: () => number;
  private readonly cache = new Map<string, ResolverResult>();
  private readonly lastRequests = new Map<string, number>();

  constructor(options: ClientOptions = {}) {
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? Date.now;
  }

  clear(): void {
    this.cache.clear();
    this.lastRequests.clear();
  }

  async resolve(
    config: ResolverConfig,
    organizationValue: string,
    localeValue = config.locale
  ): Promise<ResolverResult> {
    const organization = normalizeResolverOrganization(organizationValue);
    const locale = normalizeResolverLocale(localeValue);
    const request: ResolverRequest = {
      version: RESOLVER_PROTOCOL_VERSION,
      organization,
      locale: locale ?? "und"
    };
    const cacheKey = canonicalJson({
      endpoint: config.endpoint,
      keyId: config.keyId,
      publicKey: config.publicKey,
      request
    });
    const now = this.now();
    const cached = this.cache.get(cacheKey);
    if (
      cached?.status === "verified" &&
      cached.expiresAt &&
      Date.parse(cached.expiresAt) > now
    )
      return cached;
    const previous = this.lastRequests.get(cacheKey);
    if (
      previous !== undefined &&
      now - previous < RESOLVER_MIN_REQUEST_INTERVAL_MS
    )
      return {
        status: "rate-limited",
        request,
        candidates: [],
        evidenceCode: "RESOLVER.RATE_LIMITED"
      };
    this.lastRequests.set(cacheKey, now);
    while (this.lastRequests.size > RESOLVER_CACHE_LIMIT)
      this.lastRequests.delete(this.lastRequests.keys().next().value as string);

    if (
      !config.enabled ||
      !isResolverConfig(config) ||
      !organization ||
      !locale
    )
      return {
        status: "invalid",
        request,
        candidates: [],
        evidenceCode: "RESOLVER.INVALID_RESPONSE"
      };

    let response: Response;
    try {
      response = await this.fetcher(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(3_000)
      });
    } catch {
      return {
        status: "unavailable",
        request,
        candidates: [],
        evidenceCode: "RESOLVER.UNAVAILABLE"
      };
    }
    if (response.status === 429)
      return {
        status: "rate-limited",
        request,
        candidates: [],
        evidenceCode: "RESOLVER.RATE_LIMITED"
      };
    if (!response.ok)
      return {
        status: "unavailable",
        request,
        candidates: [],
        evidenceCode: "RESOLVER.UNAVAILABLE"
      };
    try {
      const text = await readBoundedResponse(response);
      const verified = await verifyResponse(
        JSON.parse(text) as unknown,
        request,
        config,
        now
      );
      if (!verified)
        return {
          status: "invalid",
          request,
          candidates: [],
          evidenceCode: "RESOLVER.INVALID_RESPONSE"
        };
      const result: ResolverResult = {
        status: "verified",
        request,
        candidates: verified.payload.candidates,
        expiresAt: verified.payload.expiresAt,
        evidenceCode: "RESOLVER.SIGNED_RESPONSE"
      };
      this.cache.set(cacheKey, result);
      while (this.cache.size > RESOLVER_CACHE_LIMIT)
        this.cache.delete(this.cache.keys().next().value as string);
      return result;
    } catch {
      return {
        status: "invalid",
        request,
        candidates: [],
        evidenceCode: "RESOLVER.INVALID_RESPONSE"
      };
    }
  }
}

export function resolverCandidateMatches(
  result: ResolverResult,
  registrableDomain: string | undefined
): ResolverCandidate | undefined {
  if (result.status !== "verified" || !registrableDomain) return undefined;
  return result.candidates.find((candidate) => {
    const directOfficialEvidence = candidate.provenance.some((evidence) =>
      ["official-domain-guidance", "official-root-link"].includes(
        evidence.evidenceType
      )
    );
    const independentOrigins = new Set(
      candidate.provenance.map((evidence) => new URL(evidence.sourceUrl).origin)
    );
    return (
      candidate.domain === registrableDomain &&
      candidate.confidence >= 0.9 &&
      (directOfficialEvidence || independentOrigins.size >= 2)
    );
  });
}

export function isResolverResult(value: unknown): value is ResolverResult {
  if (!isRecord(value) || !isRecord(value.request)) return false;
  const status = String(value.status);
  const expectedEvidence = {
    verified: "RESOLVER.SIGNED_RESPONSE",
    unavailable: "RESOLVER.UNAVAILABLE",
    invalid: "RESOLVER.INVALID_RESPONSE",
    "rate-limited": "RESOLVER.RATE_LIMITED"
  }[status];
  return (
    expectedEvidence !== undefined &&
    value.evidenceCode === expectedEvidence &&
    value.request.version === 1 &&
    typeof value.request.organization === "string" &&
    typeof value.request.locale === "string" &&
    Array.isArray(value.candidates) &&
    value.candidates.length <= RESOLVER_CANDIDATE_LIMIT &&
    value.candidates.every(isCandidate) &&
    (value.expiresAt === undefined || validDate(value.expiresAt))
  );
}

export function isResolverStatus(value: unknown): value is ResolverStatus {
  if (!isRecord(value)) return false;
  const last = value.lastResult;
  return (
    value.version === 1 &&
    typeof value.enabled === "boolean" &&
    typeof value.configured === "boolean" &&
    Array.isArray(value.outboundFields) &&
    value.outboundFields.join(",") === "organization,locale" &&
    (value.endpointOrigin === undefined ||
      typeof value.endpointOrigin === "string") &&
    (last === undefined ||
      (isRecord(last) &&
        ["verified", "unavailable", "invalid", "rate-limited"].includes(
          String(last.status)
        ) &&
        typeof last.organization === "string" &&
        typeof last.locale === "string" &&
        typeof last.candidateCount === "number"))
  );
}
