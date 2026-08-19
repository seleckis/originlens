# Chrome MV3 baseline

- Reviewed: 2026-08-18
- Scope: Stage 0 architecture; future content-script boundary

## Primary sources

- [Manifest V3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Manifest format](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Content scripts and isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Protect user privacy](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)
- [WXT manifest generation](https://wxt.dev/guide/essentials/config/manifest.html)
- [WXT browser and manifest targets](https://wxt.dev/guide/essentials/target-different-browsers.html)

## Notes that inform OriginLens

- MV3 replaces persistent background pages with event-driven service workers;
  code must tolerate suspension and cannot rely on long-lived in-memory state.
- MV3 disallows remotely hosted executable code. OriginLens strengthens this by
  requiring all executable code and eventual models to be packaged locally.
- Content scripts default to an isolated JavaScript world, but still share the
  DOM with the hostile page. Isolation is not validation: later messages must
  use narrow schemas and page-controlled strings must remain untrusted.
- Host patterns and API permissions increase impact and may trigger user
  warnings. Chrome recommends optional or `activeTab` access when it meets the
  feature need. Stage 0 therefore uses only `activeTab` and has no content
  script or host permission.
- WXT generates the manifest from configuration and entrypoints. Chrome is MV3
  by default, but OriginLens uses explicit `--mv3` scripts and tests the emitted
  manifest to prevent accidental target drift.

These sources support platform behavior, not phishing-detection accuracy.
