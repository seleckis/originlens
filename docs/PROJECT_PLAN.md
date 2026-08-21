# OriginLens project plan

## Product objective

**OriginLens — See who a site really is.**

OriginLens is a local-first Chrome extension that detects phishing from the
combination of a page's claimed identity, sensitive-data intent, independently
verified domain relationships, and bounded behavioral evidence. It does not use
malicious-URL blocklists or reputation APIs.

## Enduring constraints

- Chrome Manifest V3; TypeScript strict mode; bundled local executable code.
- Never read, store, log, hash, transmit, or inspect values typed into sensitive
  fields. Inspect only bounded field structure and relationships.
- Never upload page HTML/text, screenshots, URLs, query strings, browsing
  history, cookies, tokens, or diagnostics containing personal data.
- No telemetry or analytics by default; no backend before Stage 6.
- HTTPS and certificates are transport signals, never identity proof.
- Never display a green safe verdict. User states are `danger`, `caution`,
  `unknown`, and `no strong phishing indicators detected`.
- No single weak heuristic may block. Legitimate new domains, shared hosting,
  unfamiliar TLDs, CSP/DMARC absence, or TLS do not prove phishing.
- A false warning on a verified legitimate bank is release-blocking.

## Stage gates

Every stage must keep a Chrome-loadable production build. At its end: run lint,
format checks, strict type checking, unit/integration tests, relevant Playwright
tests, and the production build; provide exact Chrome acceptance steps; wait for
manual confirmation; then commit, push, and create `stage-N` tag before the next
stage begins. Manual Chrome acceptance uses the canonical hosted fixture index
at `https://fixtures.example.invalid/fixtures/`. The loopback fixture server is an
optional developer fallback, not the acceptance URL presented to the user.

## Stages

| Stage | Scope                                                  | Required outcome                                                                                                                                                   |
| ----- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Repository, architecture, documentation, CI, MV3 shell | Popup, options, diagnostics, no network or analysis.                                                                                                               |
| 1     | URL and origin analysis                                | PSL registrable domain, canonicalization, IDN/UTS #39, IP, user-info, ports, depth, brand-token placement, bounded redirect origins. Weak signals at most caution. |
| 2     | Sensitive-intent and DOM analysis                      | Value-free detection of credentials, OTP, cards, recovery, seed/private-key requests, form context, overlays, iframes, mutations, and SPA navigation.              |
| 3     | Claimed identity and positive bank registry            | Deterministic identity extraction; provenance-backed Latvian bank domains and aliases; identity/domain comparison; local and opt-in live-bank regressions.         |
| 4     | Decision policy and intervention                       | Explicit logical policy, badge, explanations, accessible warning before high-confidence credential entry, and bypass flow.                                         |
| 5     | Behavioral and network context                         | Bounded delayed-form, action mutation, redirect, destination, download, clipboard, and permission signals with documented visibility limits.                       |
| 6     | Dynamic identity resolver                              | Optional self-hostable resolver that receives only normalized organization and locale; signed/cacheable provenance; local fallback.                                |
| 7     | Optional local ML                                      | Begin only after deterministic-gap review; locally bundled, bounded, offline model with abstention and measured performance.                                       |
| 8     | Hardening and release candidate                        | Permissions/CSP/supply-chain review, SBOM, reproducibility, privacy/store drafts, accessibility/performance matrix, release packaging.                             |

### Stage 0 — repository, architecture, and loadable shell

- Create and connect the public GitHub repository; add `AGENTS.md`, required
  documentation, ADRs, CI, strict TypeScript, linting, formatting, Vitest, and
  Playwright.
- Build a polished popup with OriginLens name/tagline, current origin, honest
  unimplemented state, options page, diagnostics view, no network calls, and no
  analytics.
- Acceptance: unpacked extension loads without errors; popup shows current
  origin but makes no security claim; service worker has no uncaught errors.

### Stage 1 — URL and origin analysis

- Implement maintained-PSL registrable-domain extraction, host canonicalization
  and Punycode visibility.
- Apply UTS #39 script/confusable analysis; detect IP literals, user-info `@`
  confusion, unusual ports, excess subdomains, brand-like token placement, and
  redirect-origin tracking where MV3 permits it.
- Give every signal a stable evidence code; weak signals remain at most caution.
- Add unit tests and local benign/suspicious URL fixtures.
- Acceptance: fixture evidence is understandable, ordinary sites remain neutral,
  and no blocking occurs.

### Stage 2 — sensitive-intent and DOM analyzer

- Detect password, authentication username/email, OTP, card, recovery,
  seed/private-key fields, login/confirmation controls, cross-origin actions,
  iframe nesting, hidden/overlay credential forms, dynamic forms, and SPA DOM
  changes.
- Never observe field values or register input/keylogging handlers. Send only
  bounded structural summaries across a hardened extension message boundary.
- Treat closed shadow roots and inaccessible frames as unknown rather than
  benign. Add local benign, malicious, and mutation fixtures.
- Acceptance: structural intent is visible; fake typed text is not captured;
  ordinary search/newsletter forms remain neutral.

### Stage 3 — claimed identity and positive bank registry

- Extract identity candidates from title, headings, high-salience text,
  metadata, favicon metadata, accessible image labels, legal/footer identity,
  and login-related text; do not add OCR or large ML yet.
- Build the provenance-backed registry and seed verified Latvian-bank records.
- Compare claimed organization with actual registrable domain, canonical
  domains, aliases, and documented parent/subsidiary relationships.
- Protect against news, comparison, documentation, customer-logo, payment, and
  OAuth/SSO false positives. A static brand token alone cannot produce danger.
- Add fixtures for legitimate banks, articles, comparisons, payment redirects,
  OAuth/SSO, and fake local mismatched bank logins.
- Add `pnpm test:banks:live`: opt-in through `RUN_LIVE_BANK_TESTS=1`, navigation
  only, conservative rate, no credential entry/submission/CAPTCHA bypass, safe
  skips, sanitized diagnostics, and failure on high-confidence warning for a
  verified bank origin.
- Acceptance: verified fixtures and manually navigated official bank pages do
  not warn; fake mismatches are explainable; news/comparison pages do not warn.

### Stage 4 — decision policy and user intervention

- Require strong identity claim, sensitive-data intent, and provenance-backed
  domain mismatch for normal high-confidence danger; use explicit gates rather
  than a naive score.
- Add badge states, popup explanations, accessible page warning, pre-entry
  warning for dangerous credential forms, bypass flow, actual domain and claimed
  organization display, keyboard and screen-reader support.
- Acceptance: test phishing flow, bypass, unknown brand, legitimate banks, and
  warning timing before fake credential entry.

### Stage 5 — behavioral and network-context signals

- Add bounded delayed insertion, action mutation, login transitions, redirect
  chains, destination patterns, raw-IP submissions, suspicious downloads, and
  unexpected clipboard/permission requests where MV3 permits.
- Document inability to inspect every JavaScript exfiltration path. Never
  collect request bodies.
- Add SPA, delayed-render, nested-frame, canvas-label, logo-removal, split-text,
  hidden-form, action-mutation, and click-triggered fixtures.
- Acceptance: supported changes are detected, unsupported visibility becomes
  unknown, and bank regressions pass.

### Stage 6 — dynamic identity resolver

- Define an open, self-hostable protocol and local development server.
- By default transmit only normalized claimed organization and locale; never a
  visited URL/domain/path/query, DOM, page text, screenshot, or history.
- Return candidate domains with provenance/confidence/date/evidence type;
  compare locally. Add integrity protection, cache/expiry, rate limiting,
  poisoning resistance, mocked tests, and self-hosting guide.
- Acceptance: fictional resolver response works locally; disconnect falls back
  locally; diagnostics prove no visited-page data was transmitted.

### Stage 7 — optional local ML decision gate

- First establish measurable deterministic detection gaps. If justified, bundle
  a small offline model using ONNX Runtime Web/WASM/WebGPU as appropriate.
- Use sanitized bounded structure, strict resource limits, abstention/OOD
  behavior, adversarial mutations, provenance/license documentation, and
  baseline comparison. Model output is one signal, never final authority.
- Measure model size, memory, cold start, and p95 inference latency; do not make
  unverifiable accuracy claims.
- Acceptance: compare deterministic-only and assisted results offline; bank
  regression passes; disabling ML remains functional.

### Stage 8 — hardening and release candidate

- Complete threat model, permission and CSP review, dependency/supply-chain
  review, reproducible build instructions, SBOM, release/signing workflow,
  private vulnerability reporting, sanitized exports, accessibility tests,
  performance budgets, compatibility notes, and store privacy/listing drafts.
- Run the final matrix: synthetic phishing, benign long-tail, IDN, SSO/OAuth,
  hosting, multilingual Latvian/Russian/English, banks, slow/offline pages,
  resolver failure, and extension update/migration.
- Do not publish to the Chrome Web Store without explicit approval. Create the
  release-candidate tag only after final browser-test confirmation.

## Positive identity registry requirements

The registry is not a malicious-domain list. Each record must be versioned and
human-readable, with organization, canonical domains, aliases, official source,
evidence type, verification date, reviewer, and optional expiry. An unfamiliar
alias needs two independent authoritative sources unless an official root
directly links to it. The initial set covers Swedbank Latvia, SEB Latvia,
Citadele, Luminor, and Rietumu Banka.

## Research and testing requirements

Research notes must use primary sources and inform design. The baseline includes
Unicode UTS #39; Chrome MV3/content-script/permission documentation; Phishpedia;
PhishIntention; DynaPhish; PhishLLM or PhishVLM; PhishLang; KnowPhish; the 2025
USENIX evaluation of visual phishing detectors; and PHILTER (USENIX Security
2026).

Tests remain distinct: deterministic unit tests; synthetic benign, phishing, and
adversarial fixtures; extension integration; manual browser checks; and opt-in
nondestructive live-bank smoke checks. Fixtures use only fake values and never
submit credentials to live systems.
