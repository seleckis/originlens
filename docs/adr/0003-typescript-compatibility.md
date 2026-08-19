# ADR 0003: Pin TypeScript 5.9 for lint compatibility

- Status: Accepted
- Date: 2026-08-18

## Context

On 2026-08-18 the npm registry reported TypeScript 7.0.2 as current, while
`typescript-eslint` 8.67.0 declares support for TypeScript versions below 6.1.
Node 22.22.3 is installed and satisfies WXT, ESLint, Vitest, and Playwright.

## Decision

Pin TypeScript 5.9.3, the latest stable TypeScript 5 release, rather than use an
unsupported TypeScript/linter combination. Pin the initial toolchain versions to
make the Stage 0 build reproducible. ESLint core 10.8.1 and its independently
versioned `@eslint/js` configuration package 10.0.1 are recorded separately.

## Consequences

Review TypeScript 7 only after the lint toolchain explicitly supports it. This
is a compatibility choice, not a permanent rejection of newer TypeScript.
