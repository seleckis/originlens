import { expect, test, chromium, type BrowserContext } from "@playwright/test";
import { resolve } from "node:path";

const extensionPath = resolve(".output/chrome-mv3");

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });
});

test.afterAll(async () => {
  await context.close();
});

test("loads the MV3 shell without remote requests or security claims", async () => {
  let [serviceWorker] = context.serviceWorkers();
  serviceWorker ??= await context.waitForEvent("serviceworker");

  const manifest = await serviceWorker.evaluate(() =>
    chrome.runtime.getManifest()
  );
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(["activeTab"]);
  expect(manifest.host_permissions).toBeUndefined();

  const extensionId = new URL(serviceWorker.url()).host;
  const page = await context.newPage();
  const remoteRequests: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) remoteRequests.push(request.url());
  });

  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.getByRole("heading", { name: "OriginLens" })).toBeVisible();
  await expect(page.getByText("See who a site really is.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Analysis not implemented yet" })
  ).toBeVisible();
  await expect(
    page.getByText(/cannot prove that a website is safe/i)
  ).toBeVisible();
  await expect(page.getByText(/\bsafe\b/i)).toHaveCount(1);
  expect(remoteRequests).toEqual([]);

  await page.goto(`chrome-extension://${extensionId}/diagnostics.html`);
  await expect(
    page.getByRole("heading", { name: "Diagnostics" })
  ).toBeVisible();
  await expect(page.getByText("No endpoints configured")).toBeVisible();
  await expect(page.getByText("Disabled")).toBeVisible();
});
