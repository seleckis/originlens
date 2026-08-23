# Behavioral context and browser visibility

Reviewed: 2026-08-23

## Primary sources

- Chrome documents `webNavigation` transition qualifiers for client and server
  redirects, but the API does not expose arbitrary JavaScript data flow or
  request bodies:
  <https://developer.chrome.com/docs/extensions/reference/api/webNavigation>
- Chrome's Downloads API requires the `downloads` permission and provides
  browser download-management capabilities:
  <https://developer.chrome.com/docs/extensions/reference/api/downloads>
- Ji et al.'s USENIX Security 2025 evaluation finds substantial gaps between
  curated and real-world visual-detector evaluation and tests logo removal and
  other visible/adversarial mutations:
  <https://www.usenix.org/conference/usenixsecurity25/presentation/ji>
- PHILTER's review of 55 AI phishing detectors reports systemic gaps across
  diverse tactics, benign-site testing, privacy, robustness, and false alarms:
  <https://www.usenix.org/conference/usenixsecurity26/presentation/alam>

## OriginLens decisions

Stage 5 observes only bounded DOM/event/navigation facts already visible to its
isolated content script and `webNavigation`: delayed sensitive-field insertion,
click-triggered insertion, SPA login transitions, form-action mutation,
registrable destination categories, identity-surface removal, canvas presence,
and clicks on executable-style/download links. It does not request `downloads`,
clipboard, permission, or request-inspection privileges. A permission or
clipboard signal describes only the structure of a page control; it does not
claim an API call or user decision occurred.

Canvas text, closed shadow roots, inaccessible frames, dynamically constructed
exfiltration, service-worker traffic, and arbitrary JavaScript flows are not
fully observable. They become partial/unknown coverage. Request bodies and
sensitive values are never collected. Behavioral facts can add caution or
unknown context but cannot replace any of the three danger gates.
