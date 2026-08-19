# Architecture

## Stage 0 topology

OriginLens is a Chrome Manifest V3 extension built with WXT and React.

```text
active browser tab
      │ activeTab: URL exposed only after user opens action
      ▼
popup ───────────────► options page
  │
  └──────────────────► diagnostics page

MV3 service worker: packaged and inert in Stage 0
network/backend: none
content scripts: none
storage: none
```

The popup reduces the tab URL to `URL.origin` before display. Paths, query
strings, and fragments are neither rendered nor persisted. Restricted browser
pages are reported as restricted rather than interpreted as websites.

## Planned trust boundaries

Later page analysis will run in an isolated-world content script. Page input is
untrusted even across the isolated-world boundary because the page controls the
shared DOM. Only bounded, validated structural messages may cross into the
service worker. Raw field values are outside the permitted data model.

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
