# Chrome Web Store privacy disclosures — OriginLens v0.1.4

Status: publication-ready answers for the exact verified v0.1.4 package. Recheck
the current dashboard wording immediately before submission.

## Single purpose

Warn users before sensitive-data entry when a page claims a verified
organization but is served from a domain not verified for that organization.

## Permission justification

Copy these answers into the matching fields. Do not add an `activeTab`
justification: v0.1.4 omits that redundant permission because broad HTTP(S) host
access already grants the required current-tab access.

- **scripting justification:** Runs the bundled, value-blind structural analyzer
  on an eligible current page, including a page opened before extension
  installation. No remote code is executed.
- **storage justification:** Stores only the versioned protection-consent record
  and explicitly configured optional resolver endpoint, locale, signing key ID,
  public key, and enabled state. It stores no page content, browsing history, or
  form values.
- **webNavigation justification:** Resets per-navigation state, enumerates
  eligible frames, and derives bounded redirect-origin evidence without
  accessing request or response bodies.
- **Host permission justification:** OriginLens provides proactive local
  phishing analysis before sensitive-data entry. Phishing pages can appear on
  any HTTP or HTTPS origin, so restricting access to predetermined sites or
  requiring an extension-icon click would prevent the warning from operating
  before user interaction. Analysis begins only after affirmative consent,
  excludes restricted browser pages, and never reads form-field values. The same
  access permits an optional user-configured HTTPS resolver request containing
  only normalized claimed organization and locale; that feature is disabled by
  default.

## Data usage

Before handling any category, OriginLens displays an in-product first-run
disclosure describing the categories, purpose, local default, exclusions, and
revocation path. Analysis remains inactive until the user selects the consent
checkbox and **Enable OriginLens protection**. Disabling protection removes the
versioned consent record, stops observers and warnings, and clears transient
analysis.

Select:

- **Web history:** OriginLens transiently processes the current navigation,
  registrable domain, eligible frames, and bounded redirect facts. It does not
  build, retain, export, or transmit browsing history.
- **User activity:** OriginLens locally processes bounded click event target
  structure and, only after a danger decision, focus, `beforeinput`, and submit
  event types and target structure. It never reads keystrokes, pointer
  coordinates, or field values, and it does not retain or transmit activity.
- **Website content:** OriginLens locally processes bounded selected page text,
  structural attributes, form types, and destination categories. Raw content is
  not retained or sent outside the content script or device.

Leave unselected:

- **Personally identifiable information**
- **Health information**
- **Financial and payment information**
- **Authentication information**
- **Personal communications**
- **Location**

OriginLens never reads the values of sensitive or ordinary form controls.

## Data-use certifications

Select all three dashboard certifications:

- **I do not sell user data to third parties.**
- **I do not use or transfer user data for purposes that are unrelated to my
  item's single purpose.**
- **I do not use or transfer user data to determine creditworthiness or for
  lending purposes.**

Supporting facts:

- Use is limited to the user-facing phishing-analysis purpose.
- No analytics, advertising, profiling, sale, or generalized market research.
- No OriginLens maintainer or OriginLens-operated service receives or reads
  handled website data, browsing activity, or user activity.
- Website content, web history, and user activity remain on-device. The optional
  resolver separately sends only normalized claimed organization and configured
  locale to a user-selected endpoint after explicit enablement.
- The optional resolver never receives the visited domain, full URL, page text,
  screenshot, sensitive values, cookies, or tokens.
- The operator of a user-selected resolver can process the minimized
  organization/locale request and is governed by that operator's own policy;
  OriginLens does not provide or control that server.
- Persistent extension-local data is limited to the versioned protection-consent
  choice plus resolver endpoint, locale, signing key ID, public key, and enabled
  choice.

These certifications are consistent with the Chrome Web Store Limited Use
requirements for allowed use, restricted transfer, prohibited advertising, and
prohibited human access.

## Remote code

Select **No, I am not using remote code.** All executable code is bundled in the
Manifest V3 package. Resolver responses are strict signed data and are never
executed.

## Privacy policy

https://github.com/seleckis/originlens/blob/main/PRIVACY.md
