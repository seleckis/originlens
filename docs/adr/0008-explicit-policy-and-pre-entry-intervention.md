# ADR 0008: Explicit policy and pre-entry intervention

- Status: accepted
- Date: 2026-08-22

## Context

Stage 3 exposes strong claimed-identity and verified-domain mismatch facts, but
does not combine them with sensitive-data intent or intervene. Stage 4 must warn
before high-confidence sensitive entry without turning a weak heuristic, an
incomplete scan, or a static brand mention into a blocking verdict. It must also
work across the already supported bounded frame aggregation and preserve the
rule that field values never cross or enter analysis.

## Decision

Add a deterministic decision module with three named gates:

1. one strong registry-backed identity claim;
2. value-blind structural sensitive-data intent; and
3. a provenance-backed registrable-domain mismatch for that identity.

Only their conjunction produces `danger`. A strong mismatch without sensitive
intent and existing weak URL evidence may produce `caution`. Missing or partial
visibility produces `unknown` unless the three positive danger facts are already
established. All other analyzed cases use
`no strong phishing indicators detected`; this is never presented as “safe.”

The background service worker combines bounded per-frame structural summaries
with the top-frame registry-ID identity summary. It retains the resulting
decision only in per-tab memory, sets a per-tab action badge and accessible
title, and sends the validated decision to the top-frame content script. No new
permission, endpoint, persistent storage, or raw page-controlled text is added.

For `danger`, the top frame displays a native modal `dialog` with `alertdialog`
semantics before entry. It names the registry organization, actual registrable
domain, sensitive-intent categories, and the three-gate reason. Initial focus is
the safe leave action. Keyboard focus remains in the modal; Escape leaves the
page. Capture-phase focus, input, and submit guards restore the warning if page
code removes its host.

The user may choose **Continue anyway**. This bypass is held only in transient
tab state for the current navigation. It dismisses the modal but leaves the
decision and danger badge unchanged. Reload, top-level navigation, or SPA
navigation clears it.

## Consequences

- Danger decisions are stable, testable logical outcomes rather than score
  thresholds.
- Legitimate registry domains cannot warn merely because they contain a login
  form; unknown brands cannot warn merely because they request a password.
- Warnings are reserved for high-confidence cases, reducing habituation and
  avoiding interruption on articles, comparisons, OAuth, and payment contexts.
- A hostile page can attempt to remove extension-created DOM. The isolated
  warning uses an isolated shadow root, a native top-layer dialog, reinsertion,
  and capture guards, but it is not a browser-owned interstitial. This
  limitation remains explicit and is a future hardening consideration.
