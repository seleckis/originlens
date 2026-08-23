# Chrome Web Store publication requirements

Reviewed: 2026-08-23

## Primary sources

- [Register a developer account](https://developer.chrome.com/docs/webstore/register)
- [Set up the developer account](https://developer.chrome.com/docs/webstore/set-up-account)
- [Prepare an extension](https://developer.chrome.com/docs/webstore/prepare)
- [Store listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Store image requirements](https://developer.chrome.com/docs/webstore/images)
- [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [2026 Chrome Web Store policy updates](https://developer.chrome.com/blog/cws-policy-updates-2026)
- [Distribution settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [First publication workflow](https://developer.chrome.com/docs/webstore/publish)
- [Review process](https://developer.chrome.com/docs/webstore/review-process)

## Findings applied to OriginLens

- An upload ZIP needs `manifest.json` at its root. The manual-test ZIP's nested
  `chrome-mv3` directory therefore cannot be reused as the Store upload.
- The package requires a 128-pixel icon; the listing requires a 440×280 small
  promotional tile and at least one 1280×800 or 640×400 screenshot.
- Permission, host-access, single-purpose, remote-code, and user-data answers
  must match the exact uploaded artifact.
- Chrome Web Store policy treats website content and current browsing activity
  as handled user data even when processing and storage remain entirely local.
  OriginLens must disclose those categories without claiming that it retains or
  transmits browsing history.
- The July 2026 policy update requires all data collection to be prominently
  disclosed and began enforcement on 2026-08-01. The current User Data FAQ says
  the prominent disclosure and affirmative consent must appear inside the
  product before handling begins; a Store listing or privacy-policy-only notice
  is insufficient.
- OriginLens therefore keeps DOM, identity, behavior, URL, frame, and navigation
  analysis inactive until a versioned first-run consent record exists. The user
  can revoke consent in Options, which stops active analysis and clears
  transient page/navigation state. This is required even though default
  processing is local and value-blind.
- A public item can use deferred publishing after review. Upload, submission,
  and the final publish action remain separate OriginLens approval gates.

These are publication requirements, not authorization to interact with the
Chrome Web Store dashboard.
