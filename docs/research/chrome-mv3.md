# Chrome MV3 baseline

- Reviewed: 2026-08-19
- Scope: Stages 0–2 architecture and content-script boundary

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
  feature need. Stage 0 therefore used only `activeTab`.
- Stage 2 needs static isolated-world content scripts to observe bounded DOM
  structure after page load and mutations. It therefore declares the two web
  host patterns (`http://*/*`, `https://*/*`). The script sends only a
  schema-validated aggregate to the extension service worker; it does not use a
  page `postMessage` bridge, access field values, or install input/key handlers.
- The `scripting` permission permits Diagnostics to inject the same packaged
  content script after a page was already loaded. This avoids treating a tab
  opened before installation as analyzed and does not permit remote code.
- A closed shadow root and frames which Chrome cannot inject into are not
  treated as benign. They are outside the observed structure and remain unknown
  to later policy stages.
- WXT generates the manifest from configuration and entrypoints. Chrome is MV3
  by default, but OriginLens uses explicit `--mv3` scripts and tests the emitted
  manifest to prevent accidental target drift.

## Stage 2 corrective review — 2026-08-21

Primary sources rechecked:

- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome content-script manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- [Chrome webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)
- [WXT content scripts](https://wxt.dev/guide/essentials/content-scripts)
- [WXT ContentScriptContext](https://wxt.dev/api/reference/wxt/utils/content-script-context/classes/contentscriptcontext)

The corrective implementation enables `all_frames`, `match_about_blank`, and
origin fallback so eligible related frames are analyzed in isolated worlds.
Chrome checks each frame independently, so missing access must remain explicit
rather than being interpreted as zero sensitive structure. WXT's context owns
timers and SPA location listeners; native observers and runtime listeners are
removed through `onInvalidated` so fallback reinjection does not accumulate old
analyzers.

`webNavigation` may emit repeated provisional events before the final commit and
marks client/server redirects on the committed transition. OriginLens therefore
keeps a bounded state only for the current top-level navigation, resets it when
a new navigation begins, and never stores paths or queries.

These sources support platform behavior, not phishing-detection accuracy.
