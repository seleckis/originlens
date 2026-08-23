# Architecture

## Release-candidate topology

OriginLens is a Chrome Manifest V3 extension built with WXT, strict TypeScript,
and React.

```text
hostile page/frame DOM
  │ isolated-world, bounded/value-free inspection
  ▼
structure + registry IDs + behavior counts/codes
  │ validated private extension messages
  ▼
MV3 service worker ── local registry + URL/PSL + explicit decision gates
  ├── transient per-tab aggregate, redirect origins, bypass, badge
  ├── top-frame accessible warning
  ├── popup and diagnostics
  └── optional signed resolver ── organization + locale only
                                      │
                                      └── candidate domains/provenance
                                           (comparison stays local)
```

Content scripts run in eligible HTTP(S) frames and report at most 32 bounded
frame summaries. A frame tracker caps behavior events at 64. Closed shadow
roots, inaccessible/excess frames, canvas text, arbitrary JavaScript data flow,
and request bodies are not treated as benign; supported limits produce explicit
partial/unknown evidence. Sensitive field values are never read.

The top frame scans at most 64 selected identity strings, each capped at 160
characters and 32 text nodes. It matches them locally against registry aliases
and sends only registry IDs, source/context codes, confidence, and bounds. Raw
page strings do not cross the content boundary.

The service worker retains only current-navigation facts in memory: per-frame
summaries, top-frame identity, resolver result/cache, decision, bypass, and at
most eight redirect origins. Paths and queries are discarded. A top-level/SPA
navigation resets analysis and bypass state. Options persist only resolver
configuration in `storage.local`; no page state or browsing history is stored.

Danger requires strong identity, value-free sensitive intent, and a verified
domain mismatch. Behavior cannot substitute for a gate. Danger shows a red `!`
badge and an accessible modal warning; bypass is navigation-scoped and does not
change the verdict. Caution is amber, unknown is gray, and no state is green.

## Optional resolver

The disabled-by-default resolver accepts a strict request containing a fixed
version plus normalized organization and locale. Fetch omits credentials and
referrer, rejects redirects, and times out. Responses are size/schema bounded,
Ed25519 signed, request/key-bound, short-lived, cached in bounded memory, and
rate-limited. Candidate matching to the actual registrable domain occurs only in
the service worker. Failure preserves the bundled local decision.

## Trust and packaging boundaries

- Page-controlled DOM, attributes, events, URLs, and resolver responses are
  hostile inputs.
- Only explicit schemas, counts, enum codes, and registry IDs cross message
  boundaries.
- Extension code is packaged locally under an explicit MV3 CSP; no remote code,
  analytics, model runtime, or model weights are included.
- Sanitized exports omit visited locations, resolver endpoints, raw content,
  field values, and history.
- Build output is budgeted, has a CycloneDX SBOM, and is packaged reproducibly.
- Every permission increase requires an ADR. Current permissions are
  `activeTab`, `scripting`, `storage`, and `webNavigation`, with HTTP(S) host
  access needed for proactive all-frame analysis.
