# Architecture

## Stage 3 topology

OriginLens is a Chrome Manifest V3 extension built with WXT and React.

```text
page/frame DOM (untrusted) ──► isolated-world content scripts ── bounded per-frame structure
       ▲                                      │                                  │
       │                                      ├── no field values / listeners    ▼
       │                                      └── top-frame registry IDs ──► on-demand collector
active browser tab ◄────────────────────────────────────────────────────────► popup/diagnostics
                                                                                     │
positive registry ── aliases + provenance + domain relationships ────────────────────┤
webNavigation ── current navigation origins only ──► MV3 service worker ──────────────┘
active browser tab ── ephemeral activeTab URL ─► local registrable-domain comparison

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

Claimed identity is inspected on demand in the top frame. The content script
scans at most 64 selected strings, each bounded to 160 characters and 32 text
nodes, and matches only aliases in the bundled registry. The response contains
registry IDs and stable codes, never matched strings. The extension page reduces
the active URL to a registrable domain, compares it locally, and does not retain
the full URL.

The popup reduces the tab URL to `URL.origin` before display. Paths, query
strings, and fragments are neither rendered nor persisted. Restricted browser
pages are reported as restricted rather than interpreted as websites.

## Trust boundaries

Page analysis runs in an isolated-world content script. Page input is untrusted
even across the isolated-world boundary because the page controls the shared
DOM. Only bounded, validated structural aggregates and claimed-identity registry
IDs cross the extension boundary. Raw page strings and field values are outside
the permitted data model.

The service worker coordinates deterministic analyzers and UI state. It is
event-driven and does not assume in-memory state survives suspension. No backend
is permitted before Stage 6; remote identity resolution remains optional when
introduced.

## Module principles

- Shared logic has explicit typed inputs and outputs independent of UI.
- Evidence codes and explanations are deterministic and testable.
- Facts remain distinguishable from weak signals and policy outcomes.
- Permission additions require implementation need, tests, documentation, and an
  architecture decision record.
