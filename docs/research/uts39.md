# UTS #39 baseline for URL analysis

- Reviewed: 2026-08-19
- Sources: [UTS #39](https://www.unicode.org/reports/tr39/),
  [Unicode 17.0 confusables data](https://unicode.org/Public/17.0.0/security/confusables.txt),
  [tldts](https://www.npmjs.com/package/tldts)

UTS #39 defines mixed-script detection by ignoring Common and Inherited script
characters, and confusability via internally derived skeletons. It also warns
that confusability is font-dependent. Stage 1 reports mixed scripts and a
bounded UTS #39-derived Cyrillic/Greek mapping as weak evidence only; it is not
full UTS #39 conformance and never creates a blocking result. Skeletons remain
internal. `tldts` 7.4.10 provides local PSL parsing, not reputation.
