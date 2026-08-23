# Active warning and intervention research

Research reviewed for Stage 4 on 2026-08-22.

## Primary and official sources

- Egelman, Cranor, and Hong,
  [“You’ve Been Warned: An Empirical Study of the Effectiveness of Web Browser Phishing Warnings”](https://kilthub.cmu.edu/articles/journal_contribution/You_ve_Been_Warned_An_Empirical_Study_of_the_Effectiveness_of_Web_Browser_Phishing_Warnings/6626570)
  (CHI 2008). The controlled study found active phishing warnings materially
  more effective than the passive warning tested. It does not justify frequent
  interruption or claim that a warning guarantees protection.
- W3C WAI-ARIA Authoring Practices,
  [Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
  A modal dialog must contain keyboard focus, place initial focus inside, expose
  a visible closing action, and restore focus appropriately. For difficult or
  irreversible actions, initial focus may be placed on the least destructive
  choice.
- W3C WAI-ARIA Authoring Practices,
  [Alert Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/). Passive
  alerts must not move focus; an alert dialog is appropriate when interruption
  and an explicit response are necessary. Alerts should not disappear
  automatically, and excessive interruption harms accessibility.
- W3C WCAG 2.2 Technique
  [H102: Creating modal dialogs with the HTML `dialog` element](https://www.w3.org/WAI/WCAG22/Techniques/html/H102).
  Native modal dialogs provide browser-managed focus and inert-page behavior
  that supports predictable keyboard operation.
- Chrome Extensions documentation,
  [`chrome.action`](https://developer.chrome.com/docs/extensions/reference/api/action).
  Manifest V3 action badges are set per tab with `setBadgeText` and
  `setBadgeBackgroundColor`; badge text should be four characters or fewer, and
  `setTitle` supplies the toolbar action’s accessible tooltip.

## Stage 4 implications

- Use an interruptive page warning only for the high-confidence three-gate
  danger state. Caution and unknown remain visible in the badge and popup but do
  not interrupt browsing.
- Use a native modal `dialog` with `alertdialog` semantics, a visible title and
  description, initial focus on **Leave this page**, contained tab navigation,
  and Escape mapped to the safe leave action.
- State the three observed facts: claimed organization, actual registrable
  domain, and structural sensitive-data intent. Do not use fear-only copy or a
  claim that OriginLens knows the page is malicious.
- Provide an explicit **Continue anyway** bypass scoped to the current
  navigation. A bypass dismisses the intervention but does not change the danger
  decision or badge.
- Keep badge text minimal: `!` for danger/caution, `?` for unknown, and no badge
  for “no strong phishing indicators detected.” Use red only for danger, amber
  for caution, gray for unknown, and never green.
- Continue enforcing value-blind extraction. Only stable evidence codes,
  registry organization names, registrable domains, bounded sensitive-intent
  categories, and booleans cross the content-script boundary.
