# Roadmap

Each stage is a separately buildable, manually accepted checkpoint. Work does
not proceed until the previous stage's Chrome test is confirmed, committed,
pushed, and tagged.

| Stage | Scope                                                           | Status        |
| ----- | --------------------------------------------------------------- | ------------- |
| 0     | Repository, architecture, documentation, CI, loadable MV3 shell | Complete      |
| 1     | Deterministic URL and origin analysis                           | Complete      |
| 2     | Privacy-bounded sensitive-intent and DOM analysis               | In progress   |
| 3     | Claimed identity and provenance-backed Latvian bank registry    | Planned       |
| 4     | Explicit decision policy and accessible intervention            | Planned       |
| 5     | Bounded behavioral and network-context signals                  | Planned       |
| 6     | Optional self-hostable positive identity resolver               | Planned       |
| 7     | Optional local ML, only if measured gaps justify it             | Decision gate |
| 8     | Hardening and release candidate                                 | Planned       |

The strongest eventual phishing decision is intended to require the conjunction
of a strong identity claim, sensitive-data intent, and a provenance-backed
domain mismatch. No individual weak signal may directly produce a blocking
verdict.
