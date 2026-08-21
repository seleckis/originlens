# Architecture

## Stage 2 topology

OriginLens is a Chrome Manifest V3 extension built with WXT and React.

```text
page/frame DOM (untrusted) ──► isolated-world content scripts ── bounded per-frame aggregate
       ▲                                      │                                      │
       │                                      └── no field values / input listeners  ▼
active browser tab ◄──────────────────────── frame-aware on-demand collector ──► popup/diagnostics
                                                                                       │
webNavigation ── current navigation origins only ──► MV3 service worker ────────────────┘
active browser tab ── activeTab URL ─► popup

Popup and Diagnostics first request current summaries from eligible frames. If a
tab or frame predates installation, the collector injects the same bundled file
into only that frame and retries. At most 32 frame summaries are aggregated.
Unavailable or excess frames and bounded-scan limits produce explicit partial
coverage evidence. Closed shadow roots remain explicitly unobservable.

The service worker stores per-frame summaries transiently so mutation and SPA
updates remain inspectable. It also retains at most eight origins from only the
current top-level navigation. A new navigation clears the prior state; URL paths
and queries are never stored.

network/backend: none
persistent storage: none
```

The popup reduces the tab URL to `URL.origin` before display. Paths, query
strings, and fragments are neither rendered nor persisted. Restricted browser
pages are reported as restricted rather than interpreted as websites.

## Planned trust boundaries

Page analysis runs in an isolated-world content script. Page input is untrusted
even across the isolated-world boundary because the page controls the shared
DOM. Only bounded, validated structural aggregates cross into the service
worker. Raw field values are outside the permitted data model.

The service worker will coordinate deterministic analyzers and UI state. It is
event-driven and must not assume in-memory state survives suspension. No backend
is permitted before Stage 6; remote identity resolution remains optional when
introduced.

## Module principles

- Shared logic has explicit typed inputs and outputs independent of UI.
- Evidence codes and explanations are deterministic and testable.
- Facts remain distinguishable from weak signals and policy outcomes.
- Permission additions require implementation need, tests, documentation, and an
  architecture decision record.
