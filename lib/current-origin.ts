import { toDisplayOrigin, type DisplayOrigin } from "./origin";

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
