import { analyzeDocument } from "../lib/dom-analysis";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  noScriptStartedPostMessage: true,
  runAt: "document_idle",
  main() {
    let timer: number | undefined;
    const report = () => {
      void browser.runtime.sendMessage({
        type: "originlens.structural-summary",
        summary: analyzeDocument(document)
      });
    };
    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(report, 250);
    };
    browser.runtime.onMessage.addListener(
      (message: unknown, _sender, respond) => {
        if (
          !message ||
          typeof message !== "object" ||
          (message as { type?: unknown }).type !==
            "originlens.inspect-structure"
        )
          return undefined;
        respond(analyzeDocument(document));
        return true;
      }
    );
    report();
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "action",
        "autocomplete",
        "type",
        "hidden",
        "style",
        "class"
      ]
    });
    window.addEventListener("popstate", schedule);
  }
});
