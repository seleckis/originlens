# ADR 0002: Minimal Stage 0 permission surface

- Status: Accepted
- Date: 2026-08-18

## Context

The popup must display the current origin, while Stage 0 does not analyze page
content. Broad host or `tabs` permission would exceed this need.

## Decision

Request only `activeTab`. Do not define content scripts, host permissions,
storage, network endpoints, or analytics. Reduce the active tab URL to its
origin for display and do not persist it.

## Consequences

Chrome-restricted pages and situations where the active URL is unavailable are
displayed as restricted or unavailable. Later permissions require a new ADR and
a directly implemented, tested need.
