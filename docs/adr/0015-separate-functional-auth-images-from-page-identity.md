# ADR 0015: separate functional authentication images from page identity

- Status: Accepted
- Date: 2026-08-28

## Context

A legitimate service can offer both a local password form and federated bank or
electronic-identity authentication controls. A provider logo can be the only
content of one such link. The previous identity extractor treated its
alternative text as a page-level provider claim and promoted that single signal
to strong because an unrelated password field existed elsewhere. For a known
bank on an unrelated service domain, that could satisfy all three danger gates.

The HTML Standard and W3C accessibility guidance define alternative text in a
link or button as the functional equivalent of that control. In this context it
identifies the action or destination, not the owner of the surrounding page.
Document-wide benign-context labels are not a safe remedy because an attacker
can add those labels around a credential form.

## Decision

Exclude accessible-image identity signals when the image is inside a link,
non-submit button, or button-role control. This remains true when a framework
wraps authentication options and password fields in one form. Keep the image
eligible when it labels a native submit button belonging to the password/OTP
form. Continue to use bounded title, metadata, heading, high-salience, legal,
credential-form, and multiple-source evidence without change.

Do not add a trusted-site exception, remote lookup, authentication-provider
allowlist, new permission, or page-text suppression rule. Cover the distinction
with deterministic unit and Chrome extension fixtures.

## Consequences

Federated authentication choices no longer impersonate their providers in the
identity comparison merely because the service also offers local credentials. A
page whose only known-brand surface is a functional linked image will abstain
from a strong identity claim unless independent evidence exists. Image-only
brand imitation can already evade DOM text analysis by omitting accessible text;
screenshot or OCR analysis remains outside the accepted local detector.
