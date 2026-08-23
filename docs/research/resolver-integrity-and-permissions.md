# Resolver integrity and extension permissions

Reviewed: 2026-08-23

## Primary sources

- Chrome distinguishes required permissions and host permissions and recommends
  minimizing warning-bearing access:
  <https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions>
- Chrome's storage permission provides extension-local storage suitable for
  configuration that must survive service-worker suspension:
  <https://developer.chrome.com/docs/extensions/reference/api/storage>
- Chrome requires host permissions for cross-origin extension fetches:
  <https://developer.chrome.com/docs/extensions/develop/concepts/network-requests>
- Web Cryptography defines Ed25519 import and verification:
  <https://www.w3.org/TR/WebCryptoAPI/>
- RFC 8785 defines deterministic JSON canonicalization for repeatable signing:
  <https://www.rfc-editor.org/rfc/rfc8785>

## OriginLens decisions

The resolver is disabled by default. Its request has exactly three keys: fixed
protocol version, normalized organization, and locale. Only the latter two are
page-derived. The visited URL, domain, path, query, DOM, page text, screenshot,
and history are not in the protocol. Responses are schema-bounded, short-lived,
Ed25519-signed, tied to the exact request and configured key ID, and capped at
20 registrable candidate domains. Comparison to the actual domain remains in the
service worker.

Resolver configuration uses the `storage` permission so an explicit user choice
survives MV3 service-worker suspension. The extension already requires HTTP(S)
host access for its content script, so Stage 6 adds no broader host pattern.
Plain HTTP resolver endpoints are rejected except loopback development.
