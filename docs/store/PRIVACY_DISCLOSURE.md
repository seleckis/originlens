# Chrome Web Store privacy disclosures — OriginLens v0.1.0

Status: publication-ready answers for the exact verified v0.1.0 package. Recheck
the current dashboard wording immediately before submission.

## Single purpose

Warn users before sensitive-data entry when a page claims a verified
organization but is served from a domain not verified for that organization.

## User data types

Select:

- **Website content:** OriginLens locally processes bounded selected page text,
  structural attributes, form types, and destination categories. Raw content is
  not retained or sent outside the content script or device.
- **Web history:** OriginLens transiently processes the current navigation,
  registrable domain, eligible frames, and bounded redirect facts. It does not
  build, retain, export, or transmit browsing history.

Do not select authentication information, financial/payment information, form
data, personal communications, location, health information, or personally
identifiable information. OriginLens never reads the values of sensitive or
ordinary form controls.

## Data use and transfer

- Use is limited to the user-facing phishing-analysis purpose.
- No analytics, advertising, profiling, sale, or generalized market research.
- No OriginLens maintainer or OriginLens-operated service receives or reads
  handled website data or browsing activity.
- Website content and browsing activity remain on-device, except that the
  optional resolver sends only normalized claimed organization and configured
  locale to a user-selected endpoint after explicit enablement.
- The optional resolver never receives the visited domain, full URL, page text,
  screenshot, sensitive values, cookies, or tokens.
- The operator of a user-selected resolver can process the minimized
  organization/locale request and is governed by that operator's own policy;
  OriginLens does not provide or control that server.
- Persistent extension-local data is limited to resolver endpoint, locale,
  signing key ID, public key, and enabled choice.

Certify every Chrome Web Store Limited Use statement: allowed use, restricted
transfer, no advertising, and no prohibited human access.

## Remote code

Select **No, I am not using remote code.** All executable code is bundled in the
Manifest V3 package. Resolver responses are strict signed data and are never
executed.

## Privacy policy

https://github.com/seleckis/originlens/blob/main/PRIVACY.md
