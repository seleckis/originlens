# ADR 0001: WXT, React, and explicit MV3 builds

- Status: Accepted
- Date: 2026-08-18

## Context

OriginLens needs strict TypeScript, repeatable Chrome Manifest V3 builds, an
event-driven service worker, multiple extension pages, and later isolated-world
content scripts. The framework must bundle executable code locally.

## Decision

Use WXT 0.21.4 with React 19.2.8 and explicit `--mv3` build/dev commands. WXT is
actively maintained, supports file-based extension entrypoints and Chrome MV3,
and generates an inspectable production manifest. Keep security logic outside
React components in small typed modules.

## Consequences

WXT-generated `.wxt` types are prepared before type checking and its output
directory is `.output/chrome-mv3`. Framework upgrades require verifying the
generated manifest, CSP, permissions, and extension smoke test.
