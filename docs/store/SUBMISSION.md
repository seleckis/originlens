# Chrome Web Store submission worksheet — OriginLens v0.1.4

This is the authoritative dashboard worksheet for this Store release. It does
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

- Upload: `dist/originlens-0.1.4-chrome-web-store.zip`
- Checksum: `dist/originlens-0.1.4-chrome-web-store.zip.sha256`
- SBOM, kept outside the upload: `dist/SBOM.cdx.json`
- Expected manifest: Manifest V3, version 0.1.4
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
- Release mode: `DEFAULT_PUBLISH` through `pnpm store:release`; publish
  automatically only after Google approval
- Alternate staged mode: `STAGED_PUBLISH` through `pnpm store:submit`, followed
  after approval by separately confirmed `pnpm store:publish`
- The selected command and version require an exact explicit confirmation. The
  CLI never infers or silently changes the release mode.

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

### Existing v0.1.3 draft

- Candidate commit: `aa000454010d99820c38fb679843086d9fed5bdb`
- Release tag: `v0.1.3`
- Uploaded package SHA-256:
  `ecaa774f7ee80e69ac09526193884baa8cef213fb06b3e51c47fd6e35e5cc41c`
- Dashboard item ID: `daocfajhjghkempepndgncijepjabbkp`
- Dashboard upload recorded: `2026-09-03T12:12:55+03:00`
- Dashboard status: saved as draft; upload reported by the release operator;
  superseded as the release candidate by v0.1.4 and must not be submitted
- Submit for review: not submitted
- Publication: not published

### v0.1.4 automatic release candidate

- Published baseline verified through API V2 at `2026-09-03T14:42:05+03:00`:
  version `0.1.2`, state `PUBLISHED`, deployment `100%`
- Dashboard item ID: `daocfajhjghkempepndgncijepjabbkp`
- Candidate commit: pending completed verification and acceptance
- Release tag: `v0.1.4` pending completed verification and acceptance
- Upload SHA-256:
  `70f9354ce1527f1ce8c3dfedc81759eb5495a416c3108f8f6c2506f5118e5fd7`
- Upload: pending final live-release confirmation
- Submit for review: pending final live-release confirmation; release mode
  `DEFAULT_PUBLISH`
- Review outcome: pending
- Publication: automatic only after Google approval
- Signed-store installation result: pending publication

After the confirmed release operation, append its time, checksum, and submitted
state. After publication, append the listing URL, publication time, and
signed-store installation result. Never reuse a version number for different
bytes.
