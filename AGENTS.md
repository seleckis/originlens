# OriginLens engineering instructions

These rules apply to the entire repository.

## Stage gates

- Implement one roadmap stage at a time and keep Chrome-loadable builds.
- At every stage end, run lint, formatting checks, strict type checking, unit
  and integration tests, relevant Playwright tests, and a production build.
- Provide exact Chrome acceptance steps and wait for the user's confirmation.
  Run `pnpm test:fixtures` and use its loopback-only fixture index for local
  manual acceptance. Never commit, publish, or place an internal/private
  hostname or fixture endpoint in repository documentation, release artifacts,
  or Chrome Web Store metadata. Store reviewer instructions must not depend on
  access to a private fixture service.
- Only after confirmation: commit, push the checkpoint and its `stage-N` tag,
  then begin the next stage. Never publish to the Chrome Web Store without
  explicit approval.
- Keep README capabilities honest; planned work is never described as shipped.

## Security and privacy

- Use Chrome Manifest V3 and bundled local executable code only.
- Do not use malicious-domain blocklists or reputation APIs, including Safe
  Browsing, VirusTotal, URLScan, PhishTank, or OpenPhish.
- Never read, retain, log, transmit, hash, or inspect values entered into
  password, OTP, card, recovery, seed-phrase, private-key, or other sensitive
  fields. Analyze structure and types only.
- Local analysis is the default. Never upload screenshots, page HTML, page text,
  full URLs, query strings, browsing history, cookies, or tokens.
- Telemetry is off by default; initial versions have no analytics.
- Sanitize and bound all page-controlled model inputs. Treat every analyzed page
  as adversarial and assume attackers know source, models, and thresholds.
- HTTPS is only a weak transport signal, never identity proof.
- Fail open during ordinary browsing, but fail safely before high-confidence
  sensitive-data entry. Explain warnings with stable, inspectable evidence.
- User-facing states are `danger`, `caution`, `unknown`, and
  `no strong phishing indicators detected`; never display a green “safe” state.
- No single weak heuristic may block. Newness, shared hosting, missing CSP or
  DMARC, unfamiliar TLDs, and TLS alone are never sufficient.
- Minimize permissions and document every permission increase in an ADR.

## Identity evidence

- Positive identity records must be versioned, human-readable, and contain
  organization, domains, aliases, authoritative source URL, evidence type,
  verification date, reviewer, and optional re-verification date.
- Search results alone are insufficient. Require two independent evidence
  sources for unfamiliar aliases unless an official root directly links them.
- False phishing warnings on verified legitimate banks are release blockers.

## Testing

- Keep deterministic unit, synthetic benign, synthetic phishing, adversarial
  mutation, extension integration, real-browser manual, and optional live-bank
  tests distinct.
- Add regression tests before fixing discovered false positives.
- Synthetic phishing uses fake credentials and may submit only to a local
  discard server that does not log bodies.
- Live-bank tests are opt-in (`RUN_LIVE_BANK_TESTS=1`), nondestructive,
  conservative, never enter/submit credentials, never bypass access controls,
  and sanitize diagnostics. Automation blocks may be documented skips.
- Use temporal and site-family separation if ML is introduced.

## Engineering practice

- Use strict TypeScript, small modules, explicit interfaces, deterministic
  outputs, stable evidence codes, and human-readable reasons.
- Prefer pnpm, WXT/React, Vitest, Playwright, ESLint, and Prettier unless an ADR
  records evidence for a change.
- Add no backend before Stage 6. Keep the extension useful without one.
- Consult primary research sources before implementing the corresponding
  component and record concise notes under `docs/research/`.
- Record major choices under `docs/adr/`; preserve previous accepted behavior.
- Document non-MPL datasets and model weights separately, with provenance and
  licenses. Never silently weaken privacy to improve detection.
