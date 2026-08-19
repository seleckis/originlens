# Architecture

## Stage 2 topology

OriginLens is a Chrome Manifest V3 extension built with WXT and React.

```text
page DOM (untrusted) ──► isolated-world content script ── bounded aggregate ──► MV3 service worker
       ▲                              │                                      │
       │                              └── no field values / input listeners   ├── popup
       │                                                                       └── diagnostics
active browser tab ── activeTab URL ─► popup

Diagnostics uses the bundled `scripting` API path for the inspected tab before
requesting a current structural aggregate. This covers tabs already open when
the extension was installed; only the packaged content-script file is used.

network/backend: none
storage: none
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
