import { extractClaimedIdentity } from "../lib/claimed-identity";
import { createBehaviorTracker } from "../lib/behavior-analysis";
import { isDecisionSummary } from "../lib/decision-policy";
import { analyzeDocument, STRUCTURAL_NODE_LIMIT } from "../lib/dom-analysis";
import {
  createPageIntervention,
  type PageIntervention
} from "../lib/page-intervention";

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
    let intervention: PageIntervention | undefined;
    const behavior = createBehaviorTracker(document, {
      nestedFrame: window.top !== window
    });

    const currentSummary = () =>
      analyzeDocument(document, {
        nestedFrame: window.top !== window,
        spaNavigationsObserved
      });
    const currentIdentity = () =>
      window.top === window ? extractClaimedIdentity(document) : undefined;
    const report = async () => {
      if (ctx.isInvalid) return;
      try {
        await browser.runtime.sendMessage({
          type: "originlens.structural-summary",
          summary: currentSummary(),
          behavior: behavior.current(),
          ...(window.top === window ? { identity: currentIdentity() } : {})
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
      if (!message || typeof message !== "object") return undefined;
      const type = (message as { type?: unknown }).type;
      if (type === "originlens.inspect-structure") {
        respond(currentSummary());
        return true;
      }
      if (type === "originlens.inspect-identity" && window.top === window) {
        respond(currentIdentity());
        return true;
      }
      if (type === "originlens.inspect-behavior") {
        respond(behavior.current());
        return true;
      }
      if (type === "originlens.decision-update" && window.top === window) {
        const decision = (message as { decision?: unknown }).decision;
        if (isDecisionSummary(decision)) intervention?.update(decision);
        return undefined;
      }
      return undefined;
    };

    if (window.top === window) {
      intervention = createPageIntervention(document, {
        onBypass: async () => {
          const response: unknown = await browser.runtime.sendMessage({
            type: "originlens.warning-bypassed"
          });
          if (
            !isDecisionSummary(response) ||
            response.intervention !== "bypassed"
          )
            return false;
          intervention?.update(response);
          return true;
        }
      });
    }
    browser.runtime.onMessage.addListener(onMessage);
    const onClick = (event: MouseEvent) => {
      behavior.observeClick(event.target);
      schedule();
    };
    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver((records) => {
      behavior.observeMutations(records);
      schedule();
    });
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
      intervention?.reset();
      behavior.observeSpaNavigation();
      spaNavigationsObserved = Math.min(
        STRUCTURAL_NODE_LIMIT,
        spaNavigationsObserved + 1
      );
      if (window.top === window) {
        void browser.runtime
          .sendMessage({ type: "originlens.reset-intervention" })
          .finally(schedule);
      } else schedule();
    });
    ctx.onInvalidated(() => {
      observer.disconnect();
      browser.runtime.onMessage.removeListener(onMessage);
      document.removeEventListener("click", onClick, true);
      intervention?.destroy();
      if (timer !== undefined) window.clearTimeout(timer);
    });
    void report();
  }
});
