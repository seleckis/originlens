# Chrome Web Store privacy disclosure draft

Status: draft only — verify against the final uploaded artifact and current
store questionnaire before submission.

- Sensitive field values: not collected, accessed, logged, stored, or sent.
- Authentication, payment, recovery, seed/private-key values: not collected.
- Website content: bounded selected text is inspected locally for known aliases;
  raw content does not leave the content script or device.
- Web history: not collected. Current-navigation origins are transient and are
  not exported by sanitized diagnostics.
- Analytics/telemetry: none.
- Data sale/advertising: none.
- Optional resolver: disabled by default; sends normalized claimed organization
  and locale only to the user-configured endpoint. Visited domain/location and
  page content are excluded, and domain comparison is local.
- Local storage: resolver endpoint, locale, signing key ID, public key, and
  enabled choice only.
- Human review: positive identity records include provenance and review dates.

The published privacy policy should be [PRIVACY.md](../../PRIVACY.md). No store
submission or data-use certification is authorized by this draft.
