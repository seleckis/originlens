import {
  isStructuralSummary,
  type StructuralSummary
} from "../lib/dom-analysis";

export default defineBackground(() => {
  const redirectOrigins = new Map<number, string[]>();
  const summaries = new Map<number, StructuralSummary>();
  browser.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    try {
      const origin = new URL(details.url).origin;
      const chain = redirectOrigins.get(details.tabId) ?? [];
      if (chain.at(-1) !== origin) chain.push(origin);
      redirectOrigins.set(details.tabId, chain.slice(-8));
    } catch {
      /* Non-web navigation remains unknown. */
    }
  });
  browser.tabs.onRemoved.addListener((tabId) => {
    redirectOrigins.delete(tabId);
    summaries.delete(tabId);
  });
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (
      sender.id !== browser.runtime.id ||
      !message ||
      typeof message !== "object"
    )
      return undefined;
    const payload = message as {
      tabId?: unknown;
      type?: unknown;
      summary?: unknown;
    };
    if (payload.type === "originlens.get-structural-summary") {
      return typeof payload.tabId === "number"
        ? summaries.get(payload.tabId)
        : undefined;
    }
    if (
      payload.type !== "originlens.structural-summary" ||
      !sender.tab?.id ||
      !isStructuralSummary(payload.summary)
    )
      return undefined;
    summaries.set(sender.tab.id, payload.summary);
    return undefined;
  });
});
