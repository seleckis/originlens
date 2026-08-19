# ADR 0005: bounded isolated-world structural analysis

- Status: Accepted
- Date: 2026-08-19

## Context

Stage 2 needs to identify sensitive-data intent without inspecting what a person
types. Static content scripts need web host access, and page-controlled DOM is
hostile even when a script runs in Chrome's isolated world.

## Decision

OriginLens injects a bundled isolated-world content script on HTTP(S) pages. It
examines at most 500 `input` and `textarea` nodes per analysis pass and reports
only bounded numeric counts and booleans: credential and payment field
types/attributes, form destination origin relation, visibility context, and
whether it is in a nested frame. It observes DOM mutations with a 250 ms
debounce and SPA history navigation.

The analyzer does not access `value`, use input/keyboard/clipboard event
listeners, retain page strings, or communicate with the page. The service worker
accepts summaries only from OriginLens's own content script and checks the
complete message schema before storing a tab-local aggregate.

This requires `http://*/*` and `https://*/*` host patterns. The increase is
documented in the manifest and diagnostics. The extension remains local-only;
the fixture server is a development tool and is not product infrastructure.

## Consequences

The extension can recognize sensitive form structure and dynamic insertion but
cannot claim complete visibility into closed shadow roots, inaccessible frames,
or canvas-rendered controls. These gaps must feed an `unknown` state later,
never a benign conclusion. Structural signals are not a phishing verdict and
cannot block by themselves.
