import { expect, test, chromium, type BrowserContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";

const extensionPath = resolve(".output/chrome-mv3");

let context: BrowserContext;
let fixtureServer: Server;

const fixtureHtml = `<!doctype html><form><input type="email" autocomplete="username"><input type="password"><button type="button" name="sign-in">Sign in</button></form>`;

test.beforeAll(async () => {
  fixtureServer = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fixtureHtml);
  });
  await new Promise<void>((resolveServer) =>
    fixtureServer.listen(4174, "127.0.0.1", resolveServer)
  );
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
  await new Promise<void>((resolveServer, rejectServer) =>
    fixtureServer.close((error) =>
      error ? rejectServer(error) : resolveServer()
    )
  );
});

test("reports a content-script structural aggregate for an inspected page", async () => {
  let [serviceWorker] = context.serviceWorkers();
  serviceWorker ??= await context.waitForEvent("serviceworker");
  const extensionId = new URL(serviceWorker.url()).host;
  const inspected = await context.newPage();
  await inspected.goto("http://127.0.0.1:4174/");
  const rawTabId: unknown = await serviceWorker.evaluate(() =>
    chrome.tabs
      .query({ url: "http://127.0.0.1:4174/*" })
      .then((tabs) => tabs[0]?.id ?? null)
  );
  const tabId = typeof rawTabId === "number" ? rawTabId : undefined;
  expect(tabId).toBeDefined();
  if (typeof tabId !== "number") throw new Error("Fixture tab was not found");
  const injectionResult: unknown = await serviceWorker.evaluate(async () => {
    try {
      const [tab] = await chrome.tabs.query({
        url: "http://127.0.0.1:4174/*"
      });
      if (typeof tab?.id !== "number") throw new Error("Fixture tab missing");
      const result = await chrome.scripting.executeScript({
        files: ["/content-scripts/content.js"],
        target: { tabId: tab?.id }
      });
      return { count: result.length, ok: true };
    } catch (error) {
      return { error: String(error), ok: false };
    }
  });
  expect(injectionResult).toEqual({ count: 1, ok: true });
  const diagnostics = await context.newPage();
  await diagnostics.goto(
    `chrome-extension://${extensionId}/diagnostics.html?tabId=${tabId}`
  );
  await expect
    .poll(() => diagnostics.locator("body").innerText())
    .toContain("Password 1; username 1");
  await inspected.close();
  await diagnostics.close();
});

test("loads Stage 2 locally without remote requests or security claims", async () => {
  let [serviceWorker] = context.serviceWorkers();
  serviceWorker ??= await context.waitForEvent("serviceworker");

  const manifest = await serviceWorker.evaluate(() =>
    chrome.runtime.getManifest()
  );
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual([
    "activeTab",
    "scripting",
    "webNavigation"
  ]);
  expect(manifest.host_permissions).toEqual(["http://*/*", "https://*/*"]);
  expect(manifest.content_scripts?.[0]?.matches).toEqual([
    "http://*/*",
    "https://*/*"
  ]);

  const extensionId = new URL(serviceWorker.url()).host;
  const page = await context.newPage();
  const remoteRequests: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) remoteRequests.push(request.url());
  });

  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.getByRole("heading", { name: "OriginLens" })).toBeVisible();
  await expect(page.getByText("See who a site really is.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unknown" })).toBeVisible();
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
  await expect(page.getByText("Structural only")).toBeVisible();
});
