# Chrome Web Store submission worksheet — OriginLens v0.1.3

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

- Upload: `dist/originlens-0.1.3-chrome-web-store.zip`
- Checksum: `dist/originlens-0.1.3-chrome-web-store.zip.sha256`
- SBOM, kept outside the upload: `dist/SBOM.cdx.json`
- Expected manifest: Manifest V3, version 0.1.3
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

- Credentials — username: leave blank
- Credentials — password: leave blank
- Additional instructions (maximum 500 characters; paste exactly):

> No account or credentials are required. Install OriginLens and review the
> first-run Website content, Web history, and User activity disclosure. Select
> the consent checkbox and choose Enable OriginLens protection, then inspect the
> popup and Options controls. Analysis runs locally on eligible HTTP/HTTPS
> pages; the optional resolver is disabled by default. OriginLens never reads
> field values. Do not enter real credentials or submit forms. No private test
> service is required.

Reviewer instructions must remain self-contained and must not name or depend on
any private fixture host or internal network service.

## External-state record

Before submission, append the candidate commit, tag, upload SHA-256, dashboard
item ID, and submission time. After review, append the review outcome. After an
approved publication, append the listing URL, publication time, and signed-store
installation result. Never reuse a version number for different bytes.
