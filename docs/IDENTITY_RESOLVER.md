# Self-hosted identity resolver

The resolver is an optional positive-identity protocol. It is disabled by
default and is not a malicious-domain reputation service.

## Local development server

Run:

```bash
pnpm resolver:dev
```

The server binds only to `127.0.0.1:4319`, generates an ephemeral Ed25519 key,
and prints the four values required by OriginLens Options. It never logs request
bodies. Copy the endpoint, key ID, base64url public key, and locale, enable the
resolver, save, then choose **Test fictional identity**. The development server
returns one fictional `northstar.example` candidate for `Northstar Bank`.

## Version 1 request

`POST /v1/resolve` with `Content-Type: application/json`:

```json
{ "version": 1, "organization": "Northstar Bank", "locale": "en-LV" }
```

Keys are exact. Organization is NFKC-normalized, whitespace-collapsed, trimmed,
and capped at 120 characters. Locale is canonical BCP 47. Version is fixed
protocol metadata; organization and locale are the only page-derived fields.

## Signed response

The response has exact `payload` and `signature` keys. `signature` is base64url
Ed25519 over recursively key-sorted compact JSON of `payload`. The payload binds
the request organization/locale, configured key ID, issue/expiry times, and at
most 20 registrable domains. Every candidate has a 0–1 confidence value and one
to five HTTPS provenance records with evidence type, verification date, and
reviewer.

Responses expire within seven days, may not be issued materially in the future,
and are rejected above 64 KiB. Candidate comparison with the visited registrable
domain happens locally. A match requires confidence of at least 0.9 and either
direct official-domain/root-link evidence or two independent provenance origins.
The client caches verified unexpired responses in bounded service-worker memory
and allows at most one uncached request per organization/locale every 30
seconds. The sample server additionally limits each client to 30
requests/minute.

## Production operation

- Replace the ephemeral development key with protected offline-controlled
  signing keys and a documented rotation process.
- Serve only HTTPS; OriginLens permits plaintext HTTP only on loopback.
- Review positive evidence before signing. Never derive candidates from search
  results alone.
- Do not log, enrich, or attempt to infer browsing location from requests.
- Rate limit, cap request bodies, return strict JSON, and monitor aggregate
  service health without organization-level analytics.
- Publish key IDs and public keys through an authenticated out-of-band channel.

Disconnects, 429 responses, invalid schemas, expiry, signature failures, and
oversized responses fall back to the bundled local registry.
