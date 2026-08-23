# Performance budgets

Release-candidate budgets are deliberately simple and reproducible:

| Budget                         | Limit     | Check                        |
| ------------------------------ | --------- | ---------------------------- |
| Entire unpacked extension      | 1,500 KiB | `pnpm performance:check`     |
| Background service-worker JS   | 350 KiB   | `pnpm performance:check`     |
| Content-script JS              | 250 KiB   | `pnpm performance:check`     |
| Synthetic warning availability | 2,500 ms  | Playwright multilingual test |

The browser timing includes navigation, content-script analysis, background
aggregation, decision publication, and dialog visibility on local synthetic
fixtures. It is a regression budget, not a claim about every device or website.
There is no model, so model memory/cold-start/p95 metrics are not applicable.
