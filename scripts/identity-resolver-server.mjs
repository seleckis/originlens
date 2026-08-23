import { generateKeyPairSync, sign } from "node:crypto";
import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import process from "node:process";

const host = "127.0.0.1";
const port = 4319;
const keyId = "originlens-local-dev-ephemeral";
const requestLimit = 4 * 1024;
const rateLimit = 30;
const rateWindowMs = 60_000;
const requestsByClient = new Map();
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicJwk = publicKey.export({ format: "jwk" });

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function respond(response, status, body) {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function normalizedRequest(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "locale,organization,version" ||
    value.version !== 1 ||
    typeof value.organization !== "string" ||
    typeof value.locale !== "string"
  )
    return undefined;
  const organization = value.organization
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  let locale;
  try {
    locale = Intl.getCanonicalLocales(value.locale)[0];
  } catch {
    return undefined;
  }
  if (
    !organization ||
    organization !== value.organization ||
    locale !== value.locale
  )
    return undefined;
  return { version: 1, organization, locale };
}

function allowed(remoteAddress) {
  const now = Date.now();
  const active = (requestsByClient.get(remoteAddress) ?? []).filter(
    (timestamp) => now - timestamp < rateWindowMs
  );
  if (active.length >= rateLimit) return false;
  active.push(now);
  requestsByClient.set(remoteAddress, active);
  return true;
}

const server = createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*"
    });
    response.end();
    return;
  }
  if (request.method === "GET" && request.url === "/v1/config") {
    respond(response, 200, {
      endpoint: `http://${host}:${port}/v1/resolve`,
      keyId,
      publicKey: publicJwk.x,
      locale: "en-LV"
    });
    return;
  }
  if (request.method !== "POST" || request.url !== "/v1/resolve") {
    respond(response, 404, { error: "not-found" });
    return;
  }
  if (!allowed(request.socket.remoteAddress ?? "unknown")) {
    respond(response, 429, { error: "rate-limited" });
    return;
  }

  let size = 0;
  const chunks = [];
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size <= requestLimit) chunks.push(chunk);
  });
  request.on("end", () => {
    if (size > requestLimit) {
      respond(response, 413, { error: "request-too-large" });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      respond(response, 400, { error: "invalid-json" });
      return;
    }
    const resolverRequest = normalizedRequest(parsed);
    if (!resolverRequest) {
      respond(response, 400, { error: "invalid-request" });
      return;
    }
    const now = new Date();
    const expires = new Date(now.getTime() + 60 * 60 * 1000);
    const payload = {
      version: 1,
      organization: resolverRequest.organization,
      locale: resolverRequest.locale,
      candidates:
        resolverRequest.organization === "Northstar Bank"
          ? [
              {
                domain: "northstar.example",
                confidence: 0.95,
                provenance: [
                  {
                    sourceUrl: "https://northstar.example/security/domains",
                    evidenceType: "resolver-review",
                    verifiedAt: now.toISOString().slice(0, 10),
                    reviewer: "OriginLens fictional development fixture"
                  }
                ]
              }
            ]
          : [],
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      keyId
    };
    const signature = sign(
      null,
      Buffer.from(canonicalJson(payload)),
      privateKey
    ).toString("base64url");
    respond(response, 200, { payload, signature });
  });
});

server.listen(port, host, () => {
  process.stdout.write(
    `${JSON.stringify(
      {
        endpoint: `http://${host}:${port}/v1/resolve`,
        keyId,
        publicKey: publicJwk.x,
        locale: "en-LV"
      },
      null,
      2
    )}\n`
  );
});
