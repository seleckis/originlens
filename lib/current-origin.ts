import { toDisplayOrigin, type DisplayOrigin } from "./origin";
import { analyzeUrl, type UrlAnalysis } from "./url-analysis";

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
