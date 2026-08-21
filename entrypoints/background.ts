import {
  combineFrameStructuralSummaries,
  isFrameStructuralSummary,
  STRUCTURAL_FRAME_LIMIT,
  type FrameStructuralSummary
} from "../lib/dom-analysis";
import {
  createNavigationSummary,
  NAVIGATION_ORIGIN_LIMIT
} from "../lib/navigation-analysis";

type NavigationState = {
  committed: boolean;
  failed: boolean;
  origins: string[];
  qualifiers: string[];
};

function originOf(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function appendOrigin(state: NavigationState, rawUrl: string): void {
  const origin = originOf(rawUrl);
  if (!origin || state.origins.at(-1) === origin) return;
  state.origins.push(origin);
  state.origins = state.origins.slice(-NAVIGATION_ORIGIN_LIMIT);
}

export default defineBackground(() => {
  const navigations = new Map<number, NavigationState>();
  const summaries = new Map<number, Map<number, FrameStructuralSummary>>();

  browser.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) {
      const existing = navigations.get(details.tabId);
      const state =
        existing && !existing.committed && !existing.failed
          ? existing
          : {
              committed: false,
              failed: false,
              origins: [],
              qualifiers: []
            };
      appendOrigin(state, details.url);
      navigations.set(details.tabId, state);
      summaries.delete(details.tabId);
      return;
    }
    summaries.get(details.tabId)?.delete(details.frameId);
  });

  browser.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    const state = navigations.get(details.tabId) ?? {
      committed: false,
      failed: false,
      origins: [],
      qualifiers: []
    };
    appendOrigin(state, details.url);
    state.qualifiers = details.transitionQualifiers.filter((qualifier) =>
      ["client_redirect", "server_redirect"].includes(qualifier)
    );
    state.committed = true;
    state.failed = false;
    navigations.set(details.tabId, state);
  });

  browser.webNavigation.onErrorOccurred.addListener((details) => {
    if (details.frameId !== 0) return;
    const state = navigations.get(details.tabId);
    if (state && !state.committed) state.failed = true;
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    navigations.delete(tabId);
    summaries.delete(tabId);
  });

  browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (!message || typeof message !== "object") return undefined;
    const payload = message as {
      tabId?: unknown;
      type?: unknown;
      summary?: unknown;
    };

    if (
      payload.type === "originlens.get-navigation-summary" &&
      typeof payload.tabId === "number"
    ) {
      const state = navigations.get(payload.tabId);
      respond(
        state?.committed
          ? createNavigationSummary(state.origins, state.qualifiers)
          : undefined
      );
      return true;
    }

    if (
      payload.type === "originlens.get-structural-summary" &&
      typeof payload.tabId === "number"
    ) {
      const frames = [...(summaries.get(payload.tabId)?.values() ?? [])].slice(
        0,
        STRUCTURAL_FRAME_LIMIT
      );
      respond(
        frames.length > 0 ? combineFrameStructuralSummaries(frames) : undefined
      );
      return true;
    }

    if (
      payload.type !== "originlens.structural-summary" ||
      typeof sender.tab?.id !== "number" ||
      !isFrameStructuralSummary(payload.summary)
    )
      return undefined;

    const frameId = sender.frameId ?? 0;
    const tabSummaries =
      summaries.get(sender.tab.id) ?? new Map<number, FrameStructuralSummary>();
    if (tabSummaries.has(frameId) || tabSummaries.size < STRUCTURAL_FRAME_LIMIT)
      tabSummaries.set(frameId, payload.summary);
    summaries.set(sender.tab.id, tabSummaries);
    return undefined;
  });
});
