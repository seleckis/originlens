export type DisplayOrigin = {
  kind: "web" | "restricted" | "unavailable";
  label: string;
};

const RESTRICTED_PROTOCOLS = new Set([
  "about:",
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "edge:"
]);

export function toDisplayOrigin(rawUrl: string | undefined): DisplayOrigin {
  if (!rawUrl) {
    return { kind: "unavailable", label: "Origin unavailable" };
  }

  try {
    const url = new URL(rawUrl);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return { kind: "web", label: url.origin };
    }

    if (RESTRICTED_PROTOCOLS.has(url.protocol)) {
      return { kind: "restricted", label: `${url.protocol}//` };
    }

    return { kind: "unavailable", label: "Origin unavailable" };
  } catch {
    return { kind: "unavailable", label: "Origin unavailable" };
  }
}
