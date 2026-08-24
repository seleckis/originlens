import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Worker
} from "@playwright/test";
import { resolve } from "node:path";
import { identityRegistry } from "../../lib/identity-registry";

const extensionPath = resolve(".output/chrome-mv3");
const liveChecksEnabled = process.env.RUN_LIVE_BANK_TESTS === "1";

let context: BrowserContext;

test.describe("verified Latvian bank smoke checks", () => {
  test.skip(
    !liveChecksEnabled,
    "Set RUN_LIVE_BANK_TESTS=1 for opt-in nondestructive navigation"
  );

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    const worker = await extensionWorker();
    await worker.evaluate(() =>
      chrome.storage.local.set({
        protectionConsent: { enabled: true, version: 2 }
      })
    );
  });

  test.afterAll(async () => {
    await context?.close();
  });

  async function extensionWorker(): Promise<Worker> {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent("serviceworker");
    return worker;
  }

  for (const record of identityRegistry.records) {
    test(`${record.organization} does not produce a mismatch or warning`, async () => {
      const bankPage = await context.newPage();
      let responseStatus: number | undefined;
      try {
        const response = await bankPage.goto(record.liveCheckUrl, {
          waitUntil: "domcontentloaded",
          timeout: 25_000
        });
        responseStatus = response?.status();
      } catch {
        await bankPage.close();
        test.skip(true, "Official site blocked or timed out during navigation");
      }
      if (responseStatus !== undefined && responseStatus >= 400) {
        await bankPage.close();
        test.skip(true, "Official site returned an automation-block response");
      }

      const worker = await extensionWorker();
      const extensionId = new URL(worker.url()).host;
      const tabId: unknown = await worker.evaluate(() =>
        chrome.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => tabs[0]?.id)
      );
      if (typeof tabId !== "number") {
        await bankPage.close();
        test.skip(true, "The navigated tab was unavailable to the extension");
        return;
      }

      const diagnostics = await context.newPage();
      await diagnostics.goto(
        `chrome-extension://${extensionId}/diagnostics.html?tabId=${tabId}`
      );
      await expect(
        diagnostics.getByRole("heading", { name: "Claimed identity" })
      ).toBeVisible();
      await expect(
        diagnostics.getByText("mismatch", { exact: true })
      ).toHaveCount(0);
      await expect(diagnostics.getByText(/^Danger$/)).toHaveCount(0);
      await expect(diagnostics.getByText(/^Caution$/)).toHaveCount(0);
      expect(await diagnostics.locator("body").innerText()).not.toContain(
        "is not in its verified domain relationships"
      );

      await diagnostics.close();
      await bankPage.close();
      await new Promise((resolveWait) => setTimeout(resolveWait, 1_500));
    });
  }
});
