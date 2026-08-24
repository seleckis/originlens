# Roadmap

Each stage is a separately buildable, manually accepted checkpoint. Work does
not proceed until the previous stage's Chrome test is confirmed, committed,
pushed, and tagged.

| Stage | Scope                                                           | Status                  |
| ----- | --------------------------------------------------------------- | ----------------------- |
| 0     | Repository, architecture, documentation, CI, loadable MV3 shell | Complete                |
| 1     | Deterministic URL and origin analysis                           | Complete                |
| 2     | Privacy-bounded sensitive-intent and DOM analysis               | Complete                |
| 3     | Claimed identity and provenance-backed Latvian bank registry    | Complete                |
| 4     | Explicit decision policy and accessible intervention            | Complete                |
| 5     | Bounded behavioral and network-context signals                  | Complete                |
| 6     | Optional self-hostable positive identity resolver               | Complete                |
| 7     | Optional local ML, only if measured gaps justify it             | Complete: not justified |
| 8     | Hardening and release candidate                                 | Complete                |
| 9     | First-run privacy disclosure and affirmative consent            | Complete                |
| 10    | Complete data disclosure and minimum-permission correction      | Complete                |

The v0.1.0 checkpoint was not uploaded after a newly enforced Chrome Web Store
disclosure rule was identified. Stage 9 prepares a v0.1.1 candidate that keeps
all page and navigation analysis inactive until affirmative consent. Store
upload, review submission, and publication remain independent approval gates.

The v0.1.1 candidate must not be submitted for review. Dashboard preparation
identified bounded click/focus/input/submit event handling as the Chrome Web
Store **User activity** category and identified `activeTab` as redundant beside
broad HTTP(S) host access. Stage 10 prepares v0.1.2 with version 2 renewed
consent, complete category disclosure, and the narrower API-permission set.

The strongest phishing decision requires the conjunction of a strong identity
claim, sensitive-data intent, and a provenance-backed domain mismatch. No
individual weak signal may directly produce a blocking verdict.
