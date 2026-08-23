# ADR 0011: Do not package local ML without valid evidence

- Status: accepted
- Date: 2026-08-23

## Context

Deterministic fixtures expose canvas, split-text, unknown-identity, and visual
mutation gaps. They do not form a representative training or evaluation corpus.
Published systems often require screenshots, OCR/page text, large knowledge
bases, remote services, or data assumptions outside OriginLens's privacy model.

## Decision

Complete the Stage 7 decision gate with no model, runtime, weights, toggle, or
accuracy claim. Record the gaps and prerequisites. Deterministic analysis is the
only shipped path and remains functional without optional network resolution.

## Consequences

The build avoids unjustified false confidence, model supply-chain cost, and
unmeasured browser overhead. ML can be reconsidered only with licensed data,
valid temporal/site-family evaluation, abstention/OOD behavior, adversarial
testing, and reproducible performance measurements.
