import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Worker
} from "@playwright/test";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";
import { resolve } from "node:path";

const extensionPath = resolve(".output/chrome-mv3");

let context: BrowserContext;
let fixtureServer: Server;
let crossOriginFixtureServer: Server;

const pages: Record<string, string> = {
  "/": '<!doctype html><form><input type="email" autocomplete="username"><input type="password" value="fake-secret-never-captured"><button type="submit">Sign in</button></form>',
  "/dynamic": `<!doctype html>
    <button id="reveal">Reveal login</button>
    <button id="navigate">SPA navigate</button>
    <div id="target"></div>
    <script>
      document.querySelector('#reveal').addEventListener('click', () => {
        document.querySelector('#target').innerHTML = '<form><input type="email" autocomplete="username"><input type="password" value="fake-dynamic-secret"><button type="submit">Continue</button></form>';
      });
      document.querySelector('#navigate').addEventListener('click', () => {
        history.pushState({}, '', '/dynamic?spa=1');
      });
    </script>`,
  "/final": "<!doctype html><h1>Redirect destination</h1>",
  "/frame-child":
    '<!doctype html><form style="position:fixed;z-index:50"><input type="password"><button type="submit">Continue</button></form>',
  "/frames": `<!doctype html>
    <h1>Frame fixture</h1>
    <iframe src="/frame-child"></iframe>
    <iframe src="http://127.0.0.1:4175/frame-child"></iframe>
    <iframe srcdoc="<form><input autocomplete='one-time-code'></form>"></iframe>`
};

async function extensionWorker(): Promise<Worker> {
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent("serviceworker");
  return worker;
}

async function tabIdFor(worker: Worker, urlPattern: string): Promise<number> {
  const rawTabId: unknown = await worker.evaluate(
    (pattern) =>
      chrome.tabs.query({ url: pattern }).then((tabs) => tabs[0]?.id ?? null),
    urlPattern
  );
  if (typeof rawTabId !== "number")
    throw new Error("Fixture tab was not found");
  return rawTabId;
}

async function storedStructuralSummary(
  extensionPage: Page,
  tabId: number
): Promise<Record<string, unknown> | undefined> {
  const result: unknown = await extensionPage.evaluate(
    (id) =>
      chrome.runtime.sendMessage({
        type: "originlens.get-structural-summary",
        tabId: id
      }),
    tabId
  );
  return result && typeof result === "object"
    ? (result as Record<string, unknown>)
    : undefined;
}

async function openDiagnostics(
  extensionId: string,
  tabId: number
): Promise<Page> {
  const diagnostics = await context.newPage();
  await diagnostics.goto(
    `chrome-extension://${extensionId}/diagnostics.html?tabId=${tabId}`
  );
  return diagnostics;
}

test.beforeAll(async () => {
  const respond = (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://fixture.local");
    if (url.pathname === "/redirect") {
      response.writeHead(302, {
        Location: "http://127.0.0.1:4175/final"
      });
      response.end();
      return;
    }
    const html = pages[url.pathname];
    response.writeHead(html ? 200 : 404, {
      "Content-Type": "text/html; charset=utf-8"
    });
    response.end(html ?? "Not found");
  };
  fixtureServer = createServer(respond);
  crossOriginFixtureServer = createServer(respond);
  await new Promise<void>((resolveServer) =>
    fixtureServer.listen(4174, "127.0.0.1", resolveServer)
  );
  await new Promise<void>((resolveServer) =>
    crossOriginFixtureServer.listen(4175, "127.0.0.1", resolveServer)
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
  await new Promise<void>((resolveServer, rejectServer) =>
    crossOriginFixtureServer.close((error) =>
      error ? rejectServer(error) : resolveServer()
    )
  );
});

test("reports a sanitized structural aggregate for an inspected page", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const inspected = await context.newPage();
  await inspected.goto("http://127.0.0.1:4174/");
  const tabId = await tabIdFor(worker, "http://127.0.0.1:4174/*");
  const diagnostics = await openDiagnostics(extensionId, tabId);

  await expect
    .poll(() => diagnostics.locator("body").innerText())
    .toContain("Password 1; username 1");
  const body = await diagnostics.locator("body").innerText();
  expect(body).not.toContain("fake-secret-never-captured");

  await inspected.close();
  await diagnostics.close();
});

test("aggregates eligible same-origin, cross-origin, and related frames", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const inspected = await context.newPage();
  await inspected.goto("http://127.0.0.1:4174/frames");
  await expect(inspected.locator("iframe")).toHaveCount(3);
  const tabId = await tabIdFor(worker, "http://127.0.0.1:4174/*");
  const diagnostics = await openDiagnostics(extensionId, tabId);

  await expect
    .poll(() => diagnostics.locator("body").innerText())
    .toContain("Password 2; username 0; OTP 1");
  await expect
    .poll(() => diagnostics.locator("body").innerText())
    .toContain("frames 4 analyzed, 0 unavailable");
  await expect(diagnostics.getByText(/Nested frames 3/)).toBeVisible();

  await inspected.close();
  await diagnostics.close();
});

test("updates bounded summaries after mutations and SPA navigation", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const inspected = await context.newPage();
  await inspected.goto("http://127.0.0.1:4174/dynamic");
  const tabId = await tabIdFor(worker, "http://127.0.0.1:4174/*");

  await expect
    .poll(
      async () =>
        (await storedStructuralSummary(extensionPage, tabId))?.passwordFields
    )
    .toBe(0);
  await inspected.getByRole("button", { name: "Reveal login" }).click();
  await expect
    .poll(
      async () =>
        (await storedStructuralSummary(extensionPage, tabId))?.passwordFields
    )
    .toBe(1);
  await inspected.getByRole("button", { name: "SPA navigate" }).click();
  await expect
    .poll(
      async () =>
        (await storedStructuralSummary(extensionPage, tabId))
          ?.spaNavigationsObserved
    )
    .toBe(1);

  const serialized = JSON.stringify(
    await storedStructuralSummary(extensionPage, tabId)
  );
  expect(serialized).not.toContain("fake-dynamic-secret");
  await extensionPage.close();
  await inspected.close();
});

test("keeps only current-navigation origins and redirect facts", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const inspected = await context.newPage();
  await inspected.goto("http://127.0.0.1:4174/redirect");
  const tabId = await tabIdFor(worker, "http://127.0.0.1:4175/*");

  await expect
    .poll(() =>
      extensionPage.evaluate(
        (id) =>
          chrome.runtime.sendMessage({
            type: "originlens.get-navigation-summary",
            tabId: id
          }),
        tabId
      )
    )
    .toMatchObject({
      evidence: expect.arrayContaining(["NAVIGATION.SERVER_REDIRECT"]),
      origins: expect.arrayContaining([
        "http://127.0.0.1:4174",
        "http://127.0.0.1:4175"
      ])
    });
  const summary: unknown = await extensionPage.evaluate(
    (id) =>
      chrome.runtime.sendMessage({
        type: "originlens.get-navigation-summary",
        tabId: id
      }),
    tabId
  );
  expect(JSON.stringify(summary)).not.toContain("/redirect");
  expect(JSON.stringify(summary)).not.toContain("/final");
  await extensionPage.close();
  await inspected.close();
});

test("loads Stage 2 locally without remote requests or security claims", async () => {
  const worker = await extensionWorker();
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  const contentScript = manifest.content_scripts?.[0] as
    | (NonNullable<chrome.runtime.Manifest["content_scripts"]>[number] & {
        match_origin_as_fallback?: boolean;
      })
    | undefined;
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual([
    "activeTab",
    "scripting",
    "webNavigation"
  ]);
  expect(manifest.host_permissions).toEqual(["http://*/*", "https://*/*"]);
  expect(contentScript?.matches).toEqual(["http://*/*", "https://*/*"]);
  expect(contentScript?.all_frames).toBe(true);
  expect(contentScript?.match_about_blank).toBe(true);
  expect(contentScript?.match_origin_as_fallback).toBe(true);

  const extensionId = new URL(worker.url()).host;
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
  await page.close();
});
