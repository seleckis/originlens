# ADR 0009: Bounded behavioral context

- Status: accepted
- Date: 2026-08-23

## Context

Pages can delay or mutate sensitive interfaces, but Manifest V3 does not make
all JavaScript execution, request bodies, closed trees, browser permission
decisions, or download outcomes visible without substantially broader access.

## Decision

Keep a per-frame, per-navigation tracker capped at 64 observations and aggregate
at most 32 frames. Observe value-free DOM mutations, sensitive action
categories, SPA transitions, identity-surface removal, canvas presence, and
click structure. Do not request downloads, clipboard, page permission,
webRequest body, or debugger privileges. Mark unobservable content
partial/unknown. These signals may contribute caution but never satisfy the
identity, sensitive-intent, or verified-mismatch danger gates.

## Consequences

Supported mutations are inspectable and testable without capturing user data.
Some malicious execution remains invisible by design, and diagnostics state that
limit instead of implying coverage.
