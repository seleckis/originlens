export const NAVIGATION_ORIGIN_LIMIT = 8;

export type NavigationEvidenceCode =
  | "NAVIGATION.CLIENT_REDIRECT"
  | "NAVIGATION.ORIGIN_CHANGED"
  | "NAVIGATION.SERVER_REDIRECT";

export type NavigationSummary = {
  origins: string[];
  evidence: NavigationEvidenceCode[];
};

function webOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

export function createNavigationSummary(
  values: readonly string[],
  qualifiers: readonly string[] = []
): NavigationSummary {
  const origins: string[] = [];
  for (const value of values.slice(-NAVIGATION_ORIGIN_LIMIT)) {
    const origin = webOrigin(value);
    if (origin && origins.at(-1) !== origin) origins.push(origin);
  }

  const evidence = new Set<NavigationEvidenceCode>();
  if (origins.length > 1) evidence.add("NAVIGATION.ORIGIN_CHANGED");
  if (qualifiers.includes("server_redirect"))
    evidence.add("NAVIGATION.SERVER_REDIRECT");
  if (qualifiers.includes("client_redirect"))
    evidence.add("NAVIGATION.CLIENT_REDIRECT");
  return { origins, evidence: [...evidence] };
}

export function isNavigationSummary(
  value: unknown
): value is NavigationSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  return (
    Array.isArray(summary.origins) &&
    summary.origins.length <= NAVIGATION_ORIGIN_LIMIT &&
    summary.origins.every(
      (origin) =>
        typeof origin === "string" &&
        origin.length <= 255 &&
        webOrigin(origin) === origin
    ) &&
    Array.isArray(summary.evidence) &&
    summary.evidence.length <= 3 &&
    summary.evidence.every((code) =>
      [
        "NAVIGATION.CLIENT_REDIRECT",
        "NAVIGATION.ORIGIN_CHANGED",
        "NAVIGATION.SERVER_REDIRECT"
      ].includes(String(code))
    )
  );
}
