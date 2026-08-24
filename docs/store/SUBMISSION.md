# Chrome Web Store submission worksheet — OriginLens v0.1.2

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

- Upload: `dist/originlens-0.1.2-chrome-web-store.zip`
- Checksum: `dist/originlens-0.1.2-chrome-web-store.zip.sha256`
- SBOM, kept outside the upload: `dist/SBOM.cdx.json`
- Expected manifest: Manifest V3, version 0.1.2
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
- Screenshots, in order: all five files under `assets/generated/screenshots/`:
  `01-onboarding.png`, `02-warning.png`, `03-popup-danger.png`,
  `04-diagnostics.png`, and `05-options.png`
- Promotional video and marquee tile: leave empty

## Privacy practices

- Copy the single purpose, every permission justification, all data-category
  selections, all three data-use certifications, remote-code answer, and
  privacy-policy URL exactly from `PRIVACY_DISCLOSURE.md`.
- Confirm the uploaded package does not display an `activeTab` justification
  field. If it does, the wrong package was uploaded.

## Distribution

- Payment: free; no in-extension purchases
- Visibility: public
- Regions: all regions
- Publishing: deferred after review
- A separate explicit approval is required both before **Submit for review** and
  before the final **Publish** action.

## Reviewer instructions

No account, credentials, purchase, or form submission is needed.

1. Install the extension and leave the optional resolver disabled. Confirm the
   first-run disclosure states **Website content**, **Web history**, and **User
   activity**, and that analysis remains off until the consent checkbox and
   **Enable OriginLens protection** are selected.
2. Before enabling, open
   https://fixtures.example.invalid/fixtures/identity-mismatch.html and confirm it
   does not warn. Enable protection and confirm the already-open page displays
   **Possible phishing page** before field entry.
3. Disable protection in Options; confirm the warning disappears and Popup says
   **Protection is off**. Re-enable protection for the remaining steps.
4. Open `harmful-delayed-login.html`; it starts without a warning and warns when
   the synthetic login form appears.
5. Open `harmful-click-login.html`; it warns only after **Continue to login**.
6. Open `unknown-brand-login.html` and `shared-hosting-login.html`; neither may
   show an interrupting warning.
7. Use only the inert synthetic controls. Do not enter or submit credentials.

## External-state record

Before submission, append the candidate commit, tag, upload SHA-256, dashboard
item ID, and submission time. After review, append the review outcome. After an
approved publication, append the listing URL, publication time, and signed-store
installation result. Never reuse a version number for different bytes.
