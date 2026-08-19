# Decision policy

## Current behavior

Stage 0 produces no security verdict. “Analysis not implemented yet” is a
capability statement, not `unknown` and not a claim that the page is safe.

## Required future states

- `danger`
- `caution`
- `unknown`
- `no strong phishing indicators detected`

The final state must never be presented as green or as “safe.” Every warning
must show stable, inspectable reasons and distinguish observed facts from weak
inferences.

## High-confidence policy direction

Danger should normally require all three independently established predicates:

1. a strong organization or brand identity claim;
2. sensitive-data collection intent;
3. a provenance-backed mismatch between the registrable domain and that
   organization's verified domains or relationships.

The policy engine must use explicit logical gates, not a naïve additive score as
its sole mechanism. A single weak URL, hosting, security-header, domain-age,
TLD, or transport signal cannot directly block.

Incomplete visibility, inaccessible frames, or insufficient identity evidence
must produce an appropriate `unknown` or `caution` result rather than a benign
assumption.
