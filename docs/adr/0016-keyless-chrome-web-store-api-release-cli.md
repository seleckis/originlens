# ADR 0016: Keyless Chrome Web Store API release CLI

Date: 2026-09-03

## Status

Accepted

## Context

Manual dashboard uploads made package identity, version comparison, and release
state difficult to verify consistently from a remote development server. Chrome
Web Store API V2 supports service accounts and separates package upload from the
`publish` method that submits a revision. The API also distinguishes
`STAGED_PUBLISH` from `DEFAULT_PUBLISH`.

Long-lived service-account JSON keys would create avoidable credential risk. The
existing release process also requires explicit approval boundaries and must
never silently turn a staged review into automatic publication.

## Decision

Use a dedicated service account registered with the Chrome Web Store publisher.
The active human `gcloud` identity receives Token Creator only on that service
account. Repository commands call `gcloud auth print-access-token` with service
account impersonation and a Chrome Web Store scope, capture the short-lived
token in memory, and send it through Node's built-in HTTPS client. Tokens and
human credentials are never written by OriginLens or printed.

Version the non-secret Cloud project, publisher, extension, and service-account
identifiers in `store.config.json`. Keep successful upload receipts in ignored
`dist/` state, bound to the exact item, version, and checksum.

Expose six commands:

- read-only status;
- complete package verification;
- draft-only upload;
- explicitly staged review submission;
- publication of an already approved staged revision; and
- an explicitly automatic release after review.

Every mutating command presents its exact mode and requires a version-specific
interactive phrase. `store:submit` always uses `STAGED_PUBLISH`; `store:release`
always uses `DEFAULT_PUBLISH`. No cancellation or rollout API method is
implemented.

## Consequences

- CI-style packaging and remote status checks are reproducible without a stored
  service-account key.
- An attacker still needs the authenticated human `gcloud` session plus the
  per-service-account Token Creator grant to mint a short-lived token.
- Listing and privacy metadata remain dashboard-managed because API V2 does not
  expose update methods for them.
- Google review remains asynchronous. A successful submission is not evidence of
  approval or publication.
- Staged and automatic release modes require visibly different commands and
  confirmation phrases.
