import {
  compareClaimToUrl,
  isPageIdentitySummary,
  type IdentityAssessment,
  type PageIdentitySummary
} from "./claimed-identity";
import {
  combineFrameStructuralSummaries,
  isFrameStructuralSummary,
  STRUCTURAL_FRAME_LIMIT,
  type FrameStructuralSummary,
  type StructuralSummary
} from "./dom-analysis";
import {
  isNavigationSummary,
  type NavigationSummary
} from "./navigation-analysis";
import { toDisplayOrigin, type DisplayOrigin } from "./origin";
import { analyzeUrl, type UrlAnalysis } from "./url-analysis";

const frameInjections = new Map<string, Promise<void>>();

async function ensureContentScript(tabId: number, frameId: number) {
  const key = `${tabId}:${frameId}`;
  const existing = frameInjections.get(key);
  if (existing) return existing;
  const injection = browser.scripting
    .executeScript({
      files: ["/content-scripts/content.js"],
      target: { tabId, frameIds: [frameId] }
    })
    .then(() => undefined);
  frameInjections.set(key, injection);
  try {
    await injection;
  } catch (error) {
    frameInjections.delete(key);
    throw error;
  }
}

async function inspectFrameValue<T>(
  tabId: number,
  frameId: number,
  type: "originlens.inspect-identity" | "originlens.inspect-structure",
  validate: (value: unknown) => value is T
): Promise<T | undefined> {
  const request = async () => {
    const response: unknown = await browser.tabs.sendMessage(
      tabId,
      { type },
      { frameId }
    );
    return validate(response) ? response : undefined;
  };

  try {
    const existing = await request();
    if (existing) return existing;
  } catch {
    /* Tabs opened before installation need the packaged fallback injection. */
  }

  try {
    await ensureContentScript(tabId, frameId);
    return await request();
  } catch {
    return undefined;
  }
}

export async function getCurrentOrigin(): Promise<DisplayOrigin> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return toDisplayOrigin(tab?.url);
  } catch {
    return toDisplayOrigin(undefined);
  }
}

export async function getCurrentUrlAnalysis(): Promise<UrlAnalysis> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return analyzeUrl(tab?.url);
  } catch {
    return analyzeUrl(undefined);
  }
}

export async function getCurrentStructuralSummary(): Promise<
  StructuralSummary | undefined
> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return getStructuralSummaryForTab(tab?.id);
  } catch {
    return undefined;
  }
}

async function inspectFrame(
  tabId: number,
  frameId: number
): Promise<FrameStructuralSummary | undefined> {
  return inspectFrameValue(
    tabId,
    frameId,
    "originlens.inspect-structure",
    isFrameStructuralSummary
  );
}

async function inspectIdentity(
  tabId: number
): Promise<PageIdentitySummary | undefined> {
  return inspectFrameValue(
    tabId,
    0,
    "originlens.inspect-identity",
    isPageIdentitySummary
  );
}

export async function getStructuralSummaryForTab(
  tabId: number | undefined
): Promise<StructuralSummary | undefined> {
  if (typeof tabId !== "number") return undefined;

  let frameIds = [0];
  let enumerationUnavailable = false;
  try {
    const frames = await browser.webNavigation.getAllFrames({ tabId });
    if (!frames) return undefined;
    const topFrame = frames.find((frame) => frame.frameId === 0);
    if (!topFrame || !/^https?:/.test(topFrame.url)) return undefined;
    frameIds = [...new Set(frames.map((frame) => frame.frameId))];
  } catch {
    enumerationUnavailable = true;
  }

  const frameLimitReached = frameIds.length > STRUCTURAL_FRAME_LIMIT;
  const selectedFrameIds = frameIds.slice(0, STRUCTURAL_FRAME_LIMIT);
  const inspected = await Promise.all(
    selectedFrameIds.map((frameId) => inspectFrame(tabId, frameId))
  );
  const summaries = inspected.filter(
    (summary): summary is FrameStructuralSummary => summary !== undefined
  );
  return combineFrameStructuralSummaries(summaries, {
    enumerationUnavailable,
    frameLimitReached,
    unavailableFrames: frameIds.length - summaries.length
  });
}

export async function getNavigationSummaryForTab(
  tabId: number | undefined
): Promise<NavigationSummary | undefined> {
  if (typeof tabId !== "number") return undefined;
  try {
    const summary: unknown = await browser.runtime.sendMessage({
      type: "originlens.get-navigation-summary",
      tabId
    });
    return isNavigationSummary(summary) ? summary : undefined;
  } catch {
    return undefined;
  }
}

export async function getIdentityAssessmentForTab(
  tabId: number | undefined
): Promise<IdentityAssessment | undefined> {
  if (typeof tabId !== "number") return undefined;
  try {
    const [summary, tab] = await Promise.all([
      inspectIdentity(tabId),
      browser.tabs.get(tabId)
    ]);
    return summary ? compareClaimToUrl(summary, tab.url) : undefined;
  } catch {
    return undefined;
  }
}

export async function getCurrentIdentityAssessment(): Promise<
  IdentityAssessment | undefined
> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return getIdentityAssessmentForTab(tab?.id);
  } catch {
    return undefined;
  }
}

export async function getCurrentNavigationSummary(): Promise<
  NavigationSummary | undefined
> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return getNavigationSummaryForTab(tab?.id);
  } catch {
    return undefined;
  }
}
