# Contributing

OriginLens welcomes narrowly scoped security, privacy, accessibility,
documentation, and test improvements.

Before proposing a change:

1. Read [AGENTS.md](AGENTS.md), [SECURITY.md](SECURITY.md), and the relevant
   architecture decision records.
2. Open an issue for architectural changes, permission increases, backends,
   datasets, model weights, or decision-policy changes.
3. Add a regression test first for false-positive fixes.
4. Do not include real credentials, captured page data, proprietary bank assets,
   or unlicensed datasets.

Run before submitting:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Contributions to browser-extension and shared code are accepted under MPL-2.0.
Datasets and model weights require explicit provenance and separate license
documentation.
