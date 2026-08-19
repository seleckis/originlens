# Threat model

## Security objective

Help a user recognize high-confidence identity impersonation before entering
sensitive data, while treating false warnings on legitimate sites as security
failures.

## Adversaries

Assume an attacker can:

- read all source, bundled data, models, rules, evidence codes, and thresholds;
- repeatedly test mutations against the extension;
- control page DOM, styles, scripts, frames, navigation, redirects, and timing;
- use Unicode, IDNs, shared hosting, redirects, SPAs, overlays, shadow DOM,
  canvas, split text, and delayed insertion;
- imitate brand language and assets or remove them to force ambiguity;
- attempt to forge or replay messages at the page/extension boundary.

## Protected assets

- sensitive field values and browsing data;
- integrity of domain-to-organization evidence;
- warning correctness, provenance, and timing;
- extension execution and message boundaries;
- user trust, especially avoidance of false reassurance and false alarms.

## Out of scope and limitations

OriginLens cannot prove a site safe, inspect every JavaScript exfiltration path,
see inaccessible browser UI, or guarantee analysis of closed shadow roots and
inaccessible frames. Unknown visibility must remain unknown, not benign.
Compromised browsers, operating systems, and extension signing infrastructure
are outside the extension's enforcement boundary.

## Stage 2 attack surface

Stage 2 injects a bundled isolated-world script into HTTP(S) pages. The script
considers the DOM hostile, inspects only bounded form structure, and sends a
validated aggregate to the service worker. It never reads field values and has
no input, keyboard, clipboard, or page-message bridge. A page cannot directly
call extension messaging; the worker additionally accepts structural summaries
only when Chrome identifies the sender as OriginLens's own content script.

Closed shadow roots and inaccessible frames are not evidence of benignness. They
remain unobserved and must become `unknown` in later policy stages.
