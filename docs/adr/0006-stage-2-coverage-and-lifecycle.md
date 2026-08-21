# ADR 0006: Stage 2 frame coverage and content-script lifecycle

- Status: Accepted
- Date: 2026-08-21
- Supersedes: operational details in ADR 0005

## Context

The original Stage 2 script ran only in the top frame, listened only for
`popstate`, and installed native observers and listeners without cleanup when
the packaged fallback script was reinjected. Redirect origins also accumulated
across unrelated top-level navigations, which was not an acceptable
current-navigation boundary.

## Decision

Run the isolated content script in all eligible HTTP(S) and related child
frames. Keep every per-frame summary schema-validated and bounded, aggregate at
most 32 frames, and emit stable evidence when enumeration, access, or scan
limits prevent complete supported coverage. Closed shadow roots are explicitly
documented as unobservable rather than treated as empty.

Use WXT's `ContentScriptContext` for timers and SPA location changes. Disconnect
the mutation observer and remove the extension message listener when the context
is invalidated. On-demand inspection first contacts an existing script and
injects the bundled fallback only when no valid response is available.

Track at most eight origins for only the current top-level navigation. Reset DOM
and navigation state at the next navigation, retain no path or query, and expose
redirect qualifiers as inspectable facts rather than a phishing verdict.

## Consequences

Nested eligible frames, mutations, HTML history navigation, hidden ancestors,
and fixed/sticky credential overlays become inspectable without reading field
values. Unsupported frames, closed shadow roots, deep visibility ancestry, and
resource caps produce partial-coverage evidence. Stage 2 still does not issue a
phishing verdict or block user interaction.
