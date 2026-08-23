# Decision policy

## Current behavior

The release candidate evaluates URL, bounded structure, claimed identity,
verified-domain relationships, and bounded behavioral context through explicit
logical gates. `danger` requires all three positive predicates below. A strong
verified-domain mismatch without sensitive intent, weak deterministic URL
signals, or supported behavioral evidence may produce `caution`. Unavailable or
partial analysis produces `unknown` unless the three positive danger facts are
already established. Otherwise the state is
`no strong phishing indicators detected`. None of these states is a safety
claim.

## User-facing states

- `danger`
- `caution`
- `unknown`
- `no strong phishing indicators detected`

The final state must never be presented as green or as “safe.” Every warning
must show stable, inspectable reasons and distinguish observed facts from weak
inferences.

## High-confidence policy

Danger requires all three independently established predicates:

1. a strong organization or brand identity claim;
2. sensitive-data collection intent;
3. a provenance-backed mismatch between the registrable domain and that
   organization's verified domains or relationships.

The policy engine uses explicit logical gates, not a naïve additive score. A
single weak URL, hosting, security-header, domain-age, TLD, or transport signal
cannot directly block.

The three stable gate codes are `POLICY.GATE.STRONG_IDENTITY_CLAIM`,
`POLICY.GATE.SENSITIVE_DATA_INTENT`, and `POLICY.GATE.VERIFIED_DOMAIN_MISMATCH`.
Their conjunction produces `POLICY.DANGER.THREE_GATES`. The popup and
diagnostics expose every gate and the actual registrable domain. Badge colors
are red for danger, amber for caution, gray for unknown, and never green.

Danger opens an accessible pre-entry modal in the top frame. The least
destructive leave action receives initial focus. **Continue anyway** bypasses
the modal only for the current navigation; the danger decision and badge remain
unchanged. Caution and unknown do not interrupt ordinary browsing.

Behavioral evidence never substitutes for a danger gate. Canvas presence,
inaccessible content, and scan bounds can make coverage partial/unknown. A
verified signed resolver candidate can establish a positive domain relationship
and prevent a mismatch; invalid, expired, unavailable, or non-matching resolver
results leave the local registry assessment unchanged.
