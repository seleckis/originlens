# Browser compatibility

The release candidate targets current desktop Google Chrome with Manifest V3,
service workers, `chrome.scripting`, `chrome.webNavigation`, local extension
storage, modal dialog support, and Web Crypto Ed25519 verification.

Automated extension tests use Playwright's bundled Chromium. Manual release
acceptance must use a current stable Chrome build. Chromium-derived browsers may
work but are not release-qualified. Firefox/Safari, Chrome for Android/iOS,
managed policy installation, and non-Chrome stores are not currently qualified.
The v0.1.0 Chrome Web Store package is separately validated and remains
unpublished until its external approval gates are completed.

If Ed25519 is unavailable, signed resolver responses are rejected and local
analysis continues. Restricted browser pages remain unknown. CSP, enterprise
policy, inaccessible frames, closed shadow roots, and automation blocks may
reduce coverage without producing a benign claim.
