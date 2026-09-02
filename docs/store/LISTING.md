# Chrome Web Store listing — OriginLens v0.1.3

Status: publication-ready copy for the verified v0.1.3 upload. Copy changes
require review against the shipped behavior before submission.

## Name

OriginLens

## Summary

Local-first phishing warnings using claimed identity, sensitive-data intent,
verified domains, and bounded page behavior.

The summary is 121 characters, below the Chrome Web Store 132-character limit.

## Detailed description

OriginLens helps you inspect whether a page strongly claims a known
organization, requests sensitive data, and uses a domain with independently
reviewed positive identity evidence. Only that explicit conjunction produces an
interrupting phishing warning.

OriginLens provides:

- a first-run disclosure and affirmative choice before local page analysis;
- pre-entry warnings for high-confidence verified-domain mismatches;
- danger, caution, unknown, and “no strong phishing indicators detected”
  states—never a green “safe” verdict;
- inspectable reasons and sanitized diagnostics;
- bounded local analysis of identity, form structure, navigation, and page
  behavior; and
- a disabled-by-default option for a user-configured, signed positive identity
  resolver.

Analysis is local by default. OriginLens never reads values entered into
password, one-time-code, payment-card, recovery, seed-phrase, private-key, or
other sensitive fields. It has no analytics or advertising and does not use
malicious-domain blocklists or reputation APIs.

OriginLens does not analyze website content, web history, or user activity until
you explicitly enable protection. User activity is limited to bounded event
types and target structure needed for click-triggered detection and pre-entry
intervention; it never includes keystrokes, pointer coordinates, or field
values. You can disable protection at any time in Options; doing so stops
analysis and clears transient page, navigation, and activity state.

The optional resolver sends only a normalized claimed organization and the
configured locale to the user-selected endpoint. It never receives the visited
domain, full URL, page content, screenshot, credentials, cookies, or tokens.

OriginLens cannot prove that a site is safe. It complements rather than replaces
Chrome protections and phishing-resistant authentication such as passkeys and
hardware security keys.

## Classification and links

- Category: Privacy & Security
- Language: English
- Homepage: https://github.com/seleckis/originlens
- Support: https://github.com/seleckis/originlens/issues
- Privacy policy: https://github.com/seleckis/originlens/blob/main/PRIVACY.md
- Official verified publisher URL: none for v0.1.3
- Promotional video: none
- Marquee promotional tile: none
