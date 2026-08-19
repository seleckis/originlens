export default defineBackground(() => {
  const redirectOrigins = new Map<number, string[]>();
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
  browser.tabs.onRemoved.addListener((tabId) => redirectOrigins.delete(tabId));
});
