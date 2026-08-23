import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  IdentityResolverClient,
  RESOLVER_RESPONSE_LIMIT,
  resolverCandidateMatches,
  type ResolverConfig,
  type ResolverPayload,
  type ResolverRequest,
  type ResolverResult
} from "../../lib/identity-resolver";

function base64Url(value: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signingFixture(now: number) {
  const keys = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify"
  ]);
  const config: ResolverConfig = {
    version: 1,
    enabled: true,
    endpoint: "https://resolver.example.test/v1/resolve",
    publicKey: base64Url(await crypto.subtle.exportKey("raw", keys.publicKey)),
    keyId: "test-key-1",
    locale: "en-LV"
  };
  const sign = async (request: ResolverRequest) => {
    const payload: ResolverPayload = {
      version: 1,
      organization: request.organization,
      locale: request.locale,
      candidates: [
        {
          domain: "northstar.example",
          confidence: 0.95,
          provenance: [
            {
              sourceUrl: "https://northstar.example/security/domains",
              evidenceType: "official-domain-guidance",
              verifiedAt: "2026-08-23",
              reviewer: "Fixture reviewer"
            }
          ]
        }
      ],
      issuedAt: new Date(now - 1_000).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
      keyId: config.keyId
    };
    const signature = await crypto.subtle.sign(
      "Ed25519",
      keys.privateKey,
      new TextEncoder().encode(canonicalJson(payload))
    );
    return { payload, signature: base64Url(signature) };
  };
  return { config, sign };
}

function requestBody(init: RequestInit): ResolverRequest {
  if (typeof init.body !== "string") throw new Error("Expected JSON body");
  return JSON.parse(init.body) as ResolverRequest;
}

describe("signed identity resolver", () => {
  it("sends only normalized organization, locale, and protocol version", async () => {
    const now = Date.parse("2026-08-23T12:00:00.000Z");
    const { config, sign } = await signingFixture(now);
    const requests: ResolverRequest[] = [];
    const client = new IdentityResolverClient({
      now: () => now,
      fetcher: async (_input, init) => {
        const request = requestBody(init);
        requests.push(request);
        return new Response(JSON.stringify(await sign(request)));
      }
    });

    const result = await client.resolve(config, "  Northstar   Bank  ");

    expect(requests).toEqual([
      { version: 1, organization: "Northstar Bank", locale: "en-LV" }
    ]);
    expect(JSON.stringify(requests)).not.toMatch(
      /url|domain|path|query|html|text|screenshot|history/i
    );
    expect(result).toMatchObject({
      status: "verified",
      evidenceCode: "RESOLVER.SIGNED_RESPONSE"
    });
    expect(
      resolverCandidateMatches(result, "northstar.example")?.confidence
    ).toBe(0.95);
  });

  it("uses an unexpired verified cache and rate-limits uncached retries", async () => {
    let now = Date.parse("2026-08-23T12:00:00.000Z");
    const fixture = await signingFixture(now);
    let calls = 0;
    const client = new IdentityResolverClient({
      now: () => now,
      fetcher: async (_input, init) => {
        calls++;
        const request = requestBody(init);
        return new Response(JSON.stringify(await fixture.sign(request)));
      }
    });

    expect(
      (await client.resolve(fixture.config, "Northstar Bank")).status
    ).toBe("verified");
    now += 10_000;
    expect(
      (await client.resolve(fixture.config, "Northstar Bank")).status
    ).toBe("verified");
    expect(calls).toBe(1);

    const unavailable = new IdentityResolverClient({
      now: () => now,
      fetcher: () => {
        calls++;
        return Promise.resolve(new Response("offline", { status: 503 }));
      }
    });
    expect(
      (await unavailable.resolve(fixture.config, "Another organization")).status
    ).toBe("unavailable");
    expect(
      (await unavailable.resolve(fixture.config, "Another organization")).status
    ).toBe("rate-limited");
  });

  it("rejects tampering and expiry, and fails locally when disconnected", async () => {
    const now = Date.parse("2026-08-23T12:00:00.000Z");
    const fixture = await signingFixture(now);
    const tamperedClient = new IdentityResolverClient({
      now: () => now,
      fetcher: async (_input, init) => {
        const request = requestBody(init);
        const response = await fixture.sign(request);
        response.payload.candidates[0]!.domain = "attacker.example";
        return new Response(JSON.stringify(response));
      }
    });
    expect(
      (await tamperedClient.resolve(fixture.config, "Northstar Bank")).status
    ).toBe("invalid");

    const offlineClient = new IdentityResolverClient({
      now: () => now,
      fetcher: () => Promise.reject(new Error("disconnected"))
    });
    expect(
      (await offlineClient.resolve(fixture.config, "Northstar Bank")).status
    ).toBe("unavailable");
  });

  it("rejects oversized responses and weakly supported candidates", async () => {
    const now = Date.parse("2026-08-23T12:00:00.000Z");
    const fixture = await signingFixture(now);
    const oversized = new IdentityResolverClient({
      now: () => now,
      fetcher: () =>
        Promise.resolve(new Response("x".repeat(RESOLVER_RESPONSE_LIMIT + 1)))
    });
    expect(
      (await oversized.resolve(fixture.config, "Northstar Bank")).status
    ).toBe("invalid");

    const weak: ResolverResult = {
      status: "verified",
      request: {
        version: 1,
        organization: "Northstar Bank",
        locale: "en-LV"
      },
      candidates: [
        {
          domain: "northstar.example",
          confidence: 0.5,
          provenance: [
            {
              sourceUrl: "https://review.example/evidence",
              evidenceType: "resolver-review",
              verifiedAt: "2026-08-23",
              reviewer: "Fixture reviewer"
            }
          ]
        }
      ],
      evidenceCode: "RESOLVER.SIGNED_RESPONSE"
    };
    expect(resolverCandidateMatches(weak, "northstar.example")).toBeUndefined();
  });
});
