# Chrome Web Store submission worksheet — OriginLens v0.1.0

This is the authoritative dashboard worksheet for the first publication. It does
not authorize uploading, submitting, or publishing. Each external action
requires the approval recorded in the release workflow.

## Account

- Developer account: existing registered account
- Publisher name: OriginLens
- Contact email: verified and monitored before upload
- Review notifications: enabled
- Official verified publisher URL: none
- Physical address: not required because the extension is free and sells no
  features or subscriptions

## Package

- Upload: `dist/originlens-0.1.0-chrome-web-store.zip`
- Checksum: `dist/originlens-0.1.0-chrome-web-store.zip.sha256`
- SBOM, kept outside the upload: `dist/SBOM.cdx.json`
- Expected manifest: Manifest V3, version 0.1.0
- Upload only bytes that passed all automated and manual gates

## Store listing

- Name: OriginLens
- Summary and detailed description: copy exactly from `LISTING.md`
- Category: Privacy & Security
- Language: English
- Homepage: https://github.com/seleckis/originlens
- Support: https://github.com/seleckis/originlens/issues
- Privacy: https://github.com/seleckis/originlens/blob/main/PRIVACY.md
- Store icon: packaged `icon/128.png`
- Small promo tile: `assets/generated/promo-440x280.png`
- Screenshots, in order: all four files under `assets/generated/screenshots/`
- Promotional video and marquee tile: leave empty

## Privacy practices

- Single purpose and data-use selections: copy exactly from
  `PRIVACY_DISCLOSURE.md`
- `activeTab`: Displays the active page origin and current OriginLens result
  when the user opens the popup.
- `scripting`: Requests the same bundled, value-blind structural analyzer on
  eligible pages, including a page opened before installation.
- `storage`: Retains only the explicitly entered optional resolver endpoint,
  locale, signing key ID, public key, and enabled choice.
- `webNavigation`: Resets per-navigation state, enumerates eligible frames, and
  derives bounded redirect evidence without request-body access.
- `http://*/*` and `https://*/*`: Runs proactive analysis on ordinary websites
  and eligible frames before sensitive-data entry. It excludes restricted
  browser pages and never grants access to field values.
- Remote code: No.

## Distribution

- Payment: free; no in-extension purchases
- Visibility: public
- Regions: all regions
- Publishing: deferred after review
- A separate explicit approval is required both before **Submit for review** and
  before the final **Publish** action.

## Reviewer instructions

No account, credentials, purchase, or form submission is needed.

1. Install the extension and leave the optional resolver disabled.
2. Open https://fixtures.example.invalid/fixtures/identity-mismatch.html and
   confirm **Possible phishing page** appears before field entry.
3. Open `harmful-delayed-login.html`; it starts without a warning and warns when
   the synthetic login form appears.
4. Open `harmful-click-login.html`; it warns only after **Continue to login**.
5. Open `unknown-brand-login.html` and `shared-hosting-login.html`; neither may
   show an interrupting warning.
6. Use only the inert synthetic controls. Do not enter or submit credentials.

## External-state record

Before submission, append the candidate commit, tag, upload SHA-256, dashboard
item ID, and submission time. After review, append the review outcome. After an
approved publication, append the listing URL, publication time, and signed-store
installation result. Never reuse a version number for different bytes.
