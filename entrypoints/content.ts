import { analyzeDocument, STRUCTURAL_NODE_LIMIT } from "../lib/dom-analysis";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  allFrames: true,
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  noScriptStartedPostMessage: true,
  runAt: "document_idle",
  main(ctx) {
    let timer: number | undefined;
    let spaNavigationsObserved = 0;

    const currentSummary = () =>
      analyzeDocument(document, {
        nestedFrame: window.top !== window,
        spaNavigationsObserved
      });
    const report = async () => {
      if (ctx.isInvalid) return;
      try {
        await browser.runtime.sendMessage({
          type: "originlens.structural-summary",
          summary: currentSummary()
        });
      } catch {
        /* The extension may be reloaded while this isolated context is active. */
      }
    };
    const schedule = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = ctx.setTimeout(() => void report(), 250);
    };
    const onMessage = (
      message: unknown,
      _sender: Browser.runtime.MessageSender,
      respond: (response?: unknown) => void
    ) => {
      if (
        !message ||
        typeof message !== "object" ||
        (message as { type?: unknown }).type !== "originlens.inspect-structure"
      )
        return undefined;
      respond(currentSummary());
      return true;
    };

    browser.runtime.onMessage.addListener(onMessage);
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "action",
        "aria-hidden",
        "autocomplete",
        "class",
        "hidden",
        "role",
        "src",
        "style",
        "type"
      ]
    });
    ctx.addEventListener(window, "wxt:locationchange", () => {
      spaNavigationsObserved = Math.min(
        STRUCTURAL_NODE_LIMIT,
        spaNavigationsObserved + 1
      );
      schedule();
    });
    ctx.onInvalidated(() => {
      observer.disconnect();
      browser.runtime.onMessage.removeListener(onMessage);
      if (timer !== undefined) window.clearTimeout(timer);
    });
    void report();
  }
});
