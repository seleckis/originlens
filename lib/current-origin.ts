import {
  BEHAVIOR_FRAME_LIMIT,
  combineFrameBehaviorSummaries,
  isBehaviorSummary,
  isFrameBehaviorSummary,
  type BehaviorSummary,
  type FrameBehaviorSummary
} from "./behavior-analysis";
import {
  compareClaimToUrl,
  isIdentityAssessment,
  isPageIdentitySummary,
  type IdentityAssessment,
  type PageIdentitySummary
} from "./claimed-identity";
import {
  evaluateDecision,
  isDecisionSummary,
  type DecisionSummary
} from "./decision-policy";
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
import { isResolverStatus, type ResolverStatus } from "./identity-resolver";
import { isProtectionEnabled } from "./protection-consent";

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
  type:
    | "originlens.inspect-behavior"
    | "originlens.inspect-identity"
    | "originlens.inspect-structure",
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
  if (!(await isProtectionEnabled())) return toDisplayOrigin(undefined);
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
  if (!(await isProtectionEnabled())) return analyzeUrl(undefined);
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
  if (!(await isProtectionEnabled())) return undefined;
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

async function inspectFrameBehavior(
  tabId: number,
  frameId: number
): Promise<FrameBehaviorSummary | undefined> {
  return inspectFrameValue(
    tabId,
    frameId,
    "originlens.inspect-behavior",
    isFrameBehaviorSummary
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
  if (!(await isProtectionEnabled())) return undefined;
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

export async function getBehaviorSummaryForTab(
  tabId: number | undefined
): Promise<BehaviorSummary | undefined> {
  if (!(await isProtectionEnabled())) return undefined;
  if (typeof tabId !== "number") return undefined;
  try {
    const stored: unknown = await browser.runtime.sendMessage({
      type: "originlens.get-behavior-summary",
      tabId
    });
    if (isBehaviorSummary(stored)) return stored;
  } catch {
    /* Fall back to direct bounded frame inspection. */
  }

  let frameIds = [0];
  try {
    const frames = await browser.webNavigation.getAllFrames({ tabId });
    if (!frames) return undefined;
    const topFrame = frames.find((frame) => frame.frameId === 0);
    if (!topFrame || !/^https?:/.test(topFrame.url)) return undefined;
    frameIds = [...new Set(frames.map((frame) => frame.frameId))];
  } catch {
    /* Top-frame fallback below preserves bounded inspection. */
  }

  const inspected = await Promise.all(
    frameIds
      .slice(0, BEHAVIOR_FRAME_LIMIT)
      .map((frameId) => inspectFrameBehavior(tabId, frameId))
  );
  const summaries = inspected.filter(
    (summary): summary is FrameBehaviorSummary => summary !== undefined
  );
  return summaries.length > 0
    ? combineFrameBehaviorSummaries(summaries)
    : undefined;
}

export async function getCurrentBehaviorSummary(): Promise<
  BehaviorSummary | undefined
> {
  if (!(await isProtectionEnabled())) return undefined;
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return getBehaviorSummaryForTab(tab?.id);
  } catch {
    return undefined;
  }
}

export async function getNavigationSummaryForTab(
  tabId: number | undefined
): Promise<NavigationSummary | undefined> {
  if (!(await isProtectionEnabled())) return undefined;
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
  if (!(await isProtectionEnabled())) return undefined;
  if (typeof tabId !== "number") return undefined;
  try {
    const stored: unknown = await browser.runtime.sendMessage({
      type: "originlens.get-identity-assessment",
      tabId
    });
    if (isIdentityAssessment(stored)) return stored;
    const [summary, tab] = await Promise.all([
      inspectIdentity(tabId),
      browser.tabs.get(tabId)
    ]);
    return summary ? compareClaimToUrl(summary, tab.url) : undefined;
  } catch {
    return undefined;
  }
}

export async function getDecisionSummaryForTab(
  tabId: number | undefined
): Promise<DecisionSummary | undefined> {
  if (!(await isProtectionEnabled())) return undefined;
  if (typeof tabId !== "number") return undefined;
  try {
    const stored: unknown = await browser.runtime.sendMessage({
      type: "originlens.get-decision-summary",
      tabId
    });
    if (isDecisionSummary(stored)) return stored;

    const [tab, identity, structural, behavior] = await Promise.all([
      browser.tabs.get(tabId),
      getIdentityAssessmentForTab(tabId),
      getStructuralSummaryForTab(tabId),
      getBehaviorSummaryForTab(tabId)
    ]);
    return evaluateDecision({
      identity,
      structural,
      behavior,
      url: analyzeUrl(tab.url)
    });
  } catch {
    return undefined;
  }
}

export async function getCurrentDecisionSummary(): Promise<
  DecisionSummary | undefined
> {
  if (!(await isProtectionEnabled())) return undefined;
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return getDecisionSummaryForTab(tab?.id);
  } catch {
    return undefined;
  }
}

export async function getCurrentIdentityAssessment(): Promise<
  IdentityAssessment | undefined
> {
  if (!(await isProtectionEnabled())) return undefined;
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
  if (!(await isProtectionEnabled())) return undefined;
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

export async function getResolverStatus(): Promise<ResolverStatus | undefined> {
  try {
    const status: unknown = await browser.runtime.sendMessage({
      type: "originlens.get-resolver-status"
    });
    return isResolverStatus(status) ? status : undefined;
  } catch {
    return undefined;
  }
}
