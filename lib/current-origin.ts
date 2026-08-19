import { toDisplayOrigin, type DisplayOrigin } from "./origin";
import { analyzeUrl, type UrlAnalysis } from "./url-analysis";
import type { StructuralSummary } from "./dom-analysis";

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
  if (typeof tab?.id !== "number") return undefined;
  return browser.runtime.sendMessage({
    type: "originlens.get-structural-summary",
    tabId: tab.id
  });
}
