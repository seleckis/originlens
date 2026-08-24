# ADR 0014: disclose bounded user activity and remove redundant activeTab

- Status: Accepted
- Date: 2026-08-24

## Context

Chrome Web Store dashboard preparation exposed two mismatches in the v0.1.1
publication worksheet. The privacy form classifies click and similar interaction
facts as **User activity**, while OriginLens's disclosure named only Website
content and Web history. The manifest also retained `activeTab` from an earlier
stage after broad HTTP(S) host access had become necessary. Chrome documents
`activeTab` as unnecessary when broad host access already grants the relevant
tab access.

OriginLens observes bounded click target structure to recognize a
click-triggered sensitive-form insertion. After a danger decision, it observes
focus, `beforeinput`, and submit event types and target structure to intervene
before entry. It never reads field values, keystrokes, or pointer coordinates.
These facts remain necessary for the existing user-facing warning behavior.

Broad HTTP(S) access also remains necessary. A phishing page can appear on any
ordinary origin, and protection must operate before the user clicks the
extension action. A predetermined site list or temporary `activeTab` grant would
change the accepted proactive protection model.

## Decision

- Add User activity to the first-run disclosure, privacy policy, Store listing,
  dashboard answers, diagnostics, and settings copy.
- Advance protection consent to version 2. A version 1 record fails closed and
  requires the user to review and affirm the complete disclosure.
- Remove `activeTab` from the required API permissions.
- Retain `scripting`, `storage`, `webNavigation`, and HTTP(S) host access, with
  a field-specific public justification for each dashboard permission.
- Select Web history, User activity, and Website content in the Store data-usage
  form; leave unrelated data categories unselected and certify all three
  dashboard Limited Use statements.

## Consequences

The v0.1.1 candidate is not eligible for review submission. v0.1.2 requires a
new build and manual acceptance. Existing version 1 consent is deliberately not
migrated, so an update returns protection to off until the user makes a new
choice. Broad host access can still cause an in-depth Chrome Web Store review;
that review cost is accepted because narrowing it would remove the extension's
single proactive purpose.
