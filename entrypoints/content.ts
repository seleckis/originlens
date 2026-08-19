import { analyzeDocument } from "../lib/dom-analysis";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
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
