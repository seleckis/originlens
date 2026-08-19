import { toDisplayOrigin, type DisplayOrigin } from "./origin";
import { analyzeUrl, type UrlAnalysis } from "./url-analysis";
import { isStructuralSummary, type StructuralSummary } from "./dom-analysis";

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
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return getStructuralSummaryForTab(tab?.id);
}

export async function getStructuralSummaryForTab(
  tabId: number | undefined
): Promise<StructuralSummary | undefined> {
  if (typeof tabId !== "number") return undefined;
  try {
    await browser.scripting.executeScript({
      files: ["/content-scripts/content.js"],
      target: { tabId }
    });
    const summary: unknown = await browser.tabs.sendMessage(tabId, {
      type: "originlens.inspect-structure"
    });
    return isStructuralSummary(summary) ? summary : undefined;
  } catch {
    return undefined;
  }
}
