import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Worker
} from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";
import { resolve } from "node:path";
import { canonicalJson } from "../../lib/identity-resolver";

const extensionPath = resolve(".output/chrome-mv3");
const hostedFixturePath = resolve("tests/fixtures/app");
const hostedFixtureNames = readdirSync(hostedFixturePath)
  .filter((name) => /^[a-z0-9-]+\.html$/.test(name))
  .sort();

let context: BrowserContext;
let fixtureServer: Server;
let crossOriginFixtureServer: Server;
let resolverServer: Server;
const resolverRequests: unknown[] = [];
const resolverKeyId = "playwright-resolver-key";
const resolverKeys = generateKeyPairSync("ed25519");
const resolverPublicKey = (
  resolverKeys.publicKey.export({ format: "jwk" }) as JsonWebKey
).x!;

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
    <iframe srcdoc="<form><input autocomplete='one-time-code'></form>"></iframe>`,
  "/identity-mismatch": `<!doctype html>
    <title>Swedbank secure login</title>
    <meta property="og:site_name" content="Swedbank">
    <header>Swedbank</header><h1>Sign in to Swedbank</h1>
    <form><input autocomplete="username"><input type="password" value="fake-identity-secret-never-captured"><button type="button">Sign in</button></form>`,
  "/verified-swedbank":
    '<!doctype html><title>Swedbank Latvia</title><header>Swedbank</header><h1>Internet banking</h1><form><input autocomplete="username"><input type="password"><button type="button">Sign in</button></form>',
  "/unknown-brand-login":
    '<!doctype html><title>Example Credit Union login</title><h1>Example Credit Union</h1><form><input autocomplete="username"><input type="password"><button type="button">Sign in</button></form>',
  "/bank-article":
    '<!doctype html><title>News: Swedbank quarterly results</title><meta property="og:type" content="article"><article><h1>Swedbank quarterly results</h1></article>',
  "/bank-comparison":
    "<!doctype html><title>SEB versus Citadele comparison</title><h1>Compare SEB and Citadele</h1>",
  "/payment-context":
    '<!doctype html><title>Checkout payment providers</title><h1>Choose a payment provider</h1><img alt="Pay with Citadele">',
  "/oauth-context":
    "<!doctype html><title>Single sign-on chooser</title><h1>Continue with SEB</h1><button>Continue with SEB</button>"
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

async function storedDecisionSummary(
  extensionPage: Page,
  tabId: number
): Promise<Record<string, unknown> | undefined> {
  const result: unknown = await extensionPage.evaluate(
    (id) =>
      chrome.runtime.sendMessage({
        type: "originlens.get-decision-summary",
        tabId: id
      }),
    tabId
  );
  return result && typeof result === "object"
    ? (result as Record<string, unknown>)
    : undefined;
}

async function storedBehaviorSummary(
  extensionPage: Page,
  tabId: number
): Promise<Record<string, unknown> | undefined> {
  const result: unknown = await extensionPage.evaluate(
    (id) =>
      chrome.runtime.sendMessage({
        type: "originlens.get-behavior-summary",
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
  const fixtureHtml = (name: string | undefined): string | undefined => {
    if (!name || !/^[a-z0-9-]+\.html$/.test(name)) return undefined;
    const fixturePath = resolve(hostedFixturePath, name);
    return existsSync(fixturePath)
      ? readFileSync(fixturePath, "utf8")
      : undefined;
  };
  const respond = (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://fixture.local");
    if (url.pathname === "/redirect") {
      response.writeHead(302, {
        Location: "http://127.0.0.1:4175/final"
      });
      response.end();
      return;
    }
    const hostedName = url.pathname.startsWith("/hosted/")
      ? url.pathname.slice("/hosted/".length)
      : undefined;
    const rootName = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : undefined;
    const html =
      (hostedName ? fixtureHtml(hostedName) : undefined) ??
      pages[url.pathname] ??
      fixtureHtml(rootName);
    response.writeHead(html ? 200 : 404, {
      "Content-Type": "text/html; charset=utf-8"
    });
    response.end(html ?? "Not found");
  };
  fixtureServer = createServer(respond);
  crossOriginFixtureServer = createServer(respond);
  resolverServer = createServer((request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": "*"
      });
      response.end();
      return;
    }
    if (request.method !== "POST" || request.url !== "/v1/resolve") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const resolverRequest = JSON.parse(
        Buffer.concat(chunks).toString("utf8")
      ) as { version: 1; organization: string; locale: string };
      resolverRequests.push(resolverRequest);
      const now = new Date();
      const payload = {
        version: 1 as const,
        organization: resolverRequest.organization,
        locale: resolverRequest.locale,
        candidates: [
          {
            domain: "example.test",
            confidence: 0.99,
            provenance: [
              {
                sourceUrl: "https://fixture.example.test/domain-guidance",
                evidenceType: "official-domain-guidance",
                verifiedAt: now.toISOString().slice(0, 10),
                reviewer: "Playwright fixture"
              }
            ]
          }
        ],
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60_000).toISOString(),
        keyId: resolverKeyId
      };
      const signature = sign(
        null,
        Buffer.from(canonicalJson(payload)),
        resolverKeys.privateKey
      ).toString("base64url");
      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      });
      response.end(JSON.stringify({ payload, signature }));
    });
  });
  await new Promise<void>((resolveServer) =>
    fixtureServer.listen(4174, "127.0.0.1", resolveServer)
  );
  await new Promise<void>((resolveServer) =>
    crossOriginFixtureServer.listen(4175, "127.0.0.1", resolveServer)
  );
  await new Promise<void>((resolveServer) =>
    resolverServer.listen(4176, "127.0.0.1", resolveServer)
  );
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--host-resolver-rules=MAP fixture.example.test 127.0.0.1,MAP www.swedbank.lv 127.0.0.1"
    ]
  });
  const worker = await extensionWorker();
  await worker.evaluate(() =>
    chrome.storage.local.set({
      protectionConsent: { enabled: true, version: 2 }
    })
  );
  await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  for (const page of context.pages())
    if (page.url().includes("/onboarding.html")) await page.close();
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
  await new Promise<void>((resolveServer, rejectServer) =>
    resolverServer.close((error) =>
      error ? rejectServer(error) : resolveServer()
    )
  );
});

test("requires affirmative consent before page or navigation analysis", async () => {
  const consentContext = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--host-resolver-rules=MAP fixture.example.test 127.0.0.1"
    ]
  });
  try {
    const consentWorker =
      consentContext.serviceWorkers()[0] ??
      (await consentContext.waitForEvent("serviceworker"));
    const extensionId = new URL(consentWorker.url()).host;
    await consentWorker.evaluate(() =>
      chrome.storage.local.set({
        protectionConsent: { enabled: true, version: 1 }
      })
    );
    const inspected = await consentContext.newPage();
    await inspected.goto("http://fixture.example.test:4174/identity-mismatch");
    await inspected.waitForTimeout(600);
    await expect(inspected.getByRole("alertdialog")).toHaveCount(0);

    const popup = await consentContext.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(
      popup.getByRole("heading", {
        name: "Enable protection when you are ready"
      })
    ).toBeVisible();
    expect(await popup.locator("body").innerText()).not.toContain(
      "example.test"
    );
    const tabId: unknown = await consentWorker.evaluate(() =>
      chrome.tabs
        .query({ url: "http://fixture.example.test:4174/*" })
        .then((tabs) => tabs[0]?.id)
    );
    expect(typeof tabId).toBe("number");
    for (const type of [
      "originlens.get-structural-summary",
      "originlens.get-navigation-summary",
      "originlens.get-decision-summary"
    ]) {
      const beforeConsent: unknown = await popup.evaluate(
        ({ messageType, inspectedTabId }) =>
          chrome.runtime.sendMessage({
            type: messageType,
            tabId: inspectedTabId
          }),
        { messageType: type, inspectedTabId: tabId }
      );
      expect(beforeConsent ?? undefined).toBeUndefined();
    }

    const onboarding = await consentContext.newPage();
    await onboarding.goto(`chrome-extension://${extensionId}/onboarding.html`);
    await expect(
      onboarding.getByRole("heading", { name: "Before enabling protection" })
    ).toBeVisible();
    await expect(onboarding.getByText("Website content:")).toBeVisible();
    await expect(onboarding.getByText("Web history:")).toBeVisible();
    await expect(onboarding.getByText("User activity:")).toBeVisible();
    await expect(onboarding.getByText(/never reads keystrokes/)).toBeVisible();
    const enableButton = onboarding.getByRole("button", {
      name: "Enable OriginLens protection"
    });
    await expect(enableButton).toBeDisabled();
    await onboarding.getByLabel(/I consent to the local processing/).check();
    await enableButton.click();
    await expect(
      onboarding.getByRole("heading", { name: "Protection is enabled" })
    ).toBeVisible();
    await expect
      .poll(() =>
        consentWorker.evaluate(() =>
          chrome.storage.local
            .get("protectionConsent")
            .then(({ protectionConsent }) => protectionConsent)
        )
      )
      .toEqual({ enabled: true, version: 2 });
    await expect(inspected.getByRole("alertdialog")).toBeVisible();

    const options = await consentContext.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.getByRole("button", { name: "Disable protection" }).click();
    await expect(
      options.getByRole("heading", { name: "Protection off" })
    ).toBeVisible();
    await expect(inspected.getByRole("alertdialog")).toHaveCount(0);
    await expect
      .poll(() =>
        consentWorker.evaluate(
          (id) => chrome.action.getTitle({ tabId: id }),
          tabId as number
        )
      )
      .toContain("protection is off");
    await expect(
      onboarding.getByRole("heading", { name: "Before enabling protection" })
    ).toBeVisible();
    await expect(
      onboarding.getByRole("button", {
        name: "Enable OriginLens protection"
      })
    ).toBeDisabled();
    const stored: unknown = await options.evaluate(
      (id) =>
        chrome.runtime.sendMessage({
          type: "originlens.get-structural-summary",
          tabId: id
        }),
      tabId
    );
    expect(stored ?? undefined).toBeUndefined();
  } finally {
    await consentContext.close();
  }
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

test("reports a bounded strong identity mismatch without exposing page text", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const inspected = await context.newPage();
  await inspected.goto("http://fixture.example.test:4174/identity-mismatch");
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");
  const diagnostics = await openDiagnostics(extensionId, tabId);

  await expect(
    diagnostics.getByText("Swedbank Latvia", { exact: true })
  ).toBeVisible();
  await expect(
    diagnostics.getByText("strong identity claim", { exact: true })
  ).toBeVisible();
  await expect(
    diagnostics.getByText("mismatch", { exact: true })
  ).toBeVisible();
  await expect(
    diagnostics.getByText(
      /example\.test is not in its verified domain relationships/
    )
  ).toBeVisible();
  const body = await diagnostics.locator("body").innerText();
  expect(body).not.toContain("fake-identity-secret-never-captured");

  await inspected.close();
  await diagnostics.close();
});

test("warns accessibly before sensitive entry and keeps danger after bypass", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const inspected = await context.newPage();
  await inspected.goto("http://fixture.example.test:4174/identity-mismatch");
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");

  const warning = inspected.getByRole("alertdialog");
  await expect(warning).toBeVisible();
  await expect(
    inspected.getByRole("heading", { name: "Possible phishing page" })
  ).toBeVisible();
  await expect(
    inspected.getByText(/actual registrable domain is example\.test/)
  ).toBeVisible();
  await inspected
    .locator("#originlens-high-confidence-warning")
    .evaluate((element) => element.remove());
  await expect(inspected.getByRole("alertdialog")).toBeVisible();
  const leave = inspected.getByRole("button", { name: "Leave this page" });
  const continueButton = inspected.getByRole("button", {
    name: "Continue anyway"
  });
  await expect(leave).toBeFocused();
  await inspected.keyboard.press("Tab");
  await expect(continueButton).toBeFocused();
  await inspected.keyboard.press("Shift+Tab");
  await expect(leave).toBeFocused();

  await expect
    .poll(() => storedDecisionSummary(extensionPage, tabId))
    .toMatchObject({
      state: "danger",
      intervention: "required",
      gates: {
        strongIdentityClaim: true,
        sensitiveDataIntent: true,
        verifiedDomainMismatch: true
      }
    });
  await expect
    .poll(() =>
      worker.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId)
    )
    .toBe("!");
  await expect
    .poll(() =>
      worker.evaluate((id) => chrome.action.getTitle({ tabId: id }), tabId)
    )
    .toContain("danger");

  await continueButton.click();
  await expect(warning).toHaveCount(0);
  await expect
    .poll(() => storedDecisionSummary(extensionPage, tabId))
    .toMatchObject({ state: "danger", intervention: "bypassed" });
  await inspected
    .locator('input[type="password"]')
    .fill("fake-stage-4-bypass-secret");
  const diagnostics = await openDiagnostics(extensionId, tabId);
  await expect(diagnostics.getByText("Danger", { exact: true })).toBeVisible();
  expect(await diagnostics.locator("body").innerText()).not.toContain(
    "fake-stage-4-bypass-secret"
  );
  const [download] = await Promise.all([
    diagnostics.waitForEvent("download"),
    diagnostics
      .getByRole("button", { name: "Download sanitized diagnostics" })
      .click()
  ]);
  const downloadPath = await download.path();
  expect(download.suggestedFilename()).toBe(
    "originlens-sanitized-diagnostics.json"
  );
  const exported = readFileSync(downloadPath, "utf8");
  expect(exported).not.toContain("example.test");
  expect(exported).not.toContain("fake-stage-4-bypass-secret");

  await inspected.reload();
  await expect(inspected.getByRole("alertdialog")).toBeVisible();
  await expect
    .poll(() => storedDecisionSummary(extensionPage, tabId))
    .toMatchObject({ state: "danger", intervention: "required" });

  await diagnostics.close();
  await inspected.close();
  await extensionPage.close();
});

test("does not warn for verified-bank or unknown-brand sensitive forms", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);

  const verified = await context.newPage();
  await verified.goto("http://www.swedbank.lv:4174/verified-swedbank");
  const verifiedTabId = await tabIdFor(worker, "http://www.swedbank.lv:4174/*");
  await expect
    .poll(() => storedDecisionSummary(extensionPage, verifiedTabId))
    .toMatchObject({
      state: "caution",
      intervention: "not-required",
      gates: {
        strongIdentityClaim: true,
        sensitiveDataIntent: true,
        verifiedDomainMismatch: false
      }
    });
  await expect(verified.getByRole("alertdialog")).toHaveCount(0);
  await expect
    .poll(() =>
      worker.evaluate(
        (id) => chrome.action.getTitle({ tabId: id }),
        verifiedTabId
      )
    )
    .toContain("caution");
  await verified.close();

  const unknown = await context.newPage();
  await unknown.goto("http://fixture.example.test:4174/unknown-brand-login");
  const unknownTabId = await tabIdFor(
    worker,
    "http://fixture.example.test:4174/*"
  );
  await expect
    .poll(() => storedDecisionSummary(extensionPage, unknownTabId))
    .toMatchObject({
      state: "caution",
      intervention: "not-required",
      gates: {
        strongIdentityClaim: false,
        sensitiveDataIntent: true,
        verifiedDomainMismatch: false
      }
    });
  await expect(unknown.getByRole("alertdialog")).toHaveCount(0);

  await unknown.close();
  await extensionPage.close();
});

test("verifies a synthetic page on a provenance-backed domain", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const inspected = await context.newPage();
  await inspected.goto("http://www.swedbank.lv:4174/verified-swedbank");
  const tabId = await tabIdFor(worker, "http://www.swedbank.lv:4174/*");
  const diagnostics = await openDiagnostics(extensionId, tabId);

  await expect(
    diagnostics.getByText("Swedbank Latvia", { exact: true })
  ).toBeVisible();
  await expect(
    diagnostics.getByText("verified", { exact: true })
  ).toBeVisible();
  await expect(
    diagnostics.getByText(/linked to swedbank\.lv as a canonical domain/)
  ).toBeVisible();
  expect(await diagnostics.locator("body").innerText()).not.toContain(
    "not in its verified domain relationships"
  );

  await inspected.close();
  await diagnostics.close();
});

test("keeps article, comparison, payment, and OAuth contexts non-mismatching", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  for (const path of [
    "bank-article",
    "bank-comparison",
    "payment-context",
    "oauth-context"
  ]) {
    const inspected = await context.newPage();
    await inspected.goto(`http://fixture.example.test:4174/${path}`);
    const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");
    const diagnostics = await openDiagnostics(extensionId, tabId);

    await expect(
      diagnostics.getByText("not-applicable", { exact: true })
    ).toBeVisible();
    expect(await diagnostics.locator("body").innerText()).not.toContain(
      "not in its verified domain relationships"
    );

    await inspected.close();
    await diagnostics.close();
  }
});

test("starts warning when a strong-identity login is inserted after a delay", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const inspected = await context.newPage();
  await inspected.goto(
    "http://fixture.example.test:4174/hosted/harmful-delayed-login.html"
  );
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");

  await expect(inspected.getByText("Preparing login…")).toBeVisible();
  await expect(inspected.getByRole("alertdialog")).toHaveCount(0);
  await expect(inspected.getByRole("alertdialog")).toBeVisible();
  await expect
    .poll(() => storedBehaviorSummary(extensionPage, tabId))
    .toMatchObject({
      delayedSensitiveInsertions: 1,
      evidence: expect.arrayContaining(["BEHAVIOR.DELAYED_SENSITIVE_INSERTION"])
    });
  await expect
    .poll(() => storedDecisionSummary(extensionPage, tabId))
    .toMatchObject({ state: "danger", intervention: "required" });

  await inspected.close();
  await extensionPage.close();
});

test("starts warning when a click reveals a strong-identity login", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const inspected = await context.newPage();
  await inspected.goto(
    "http://fixture.example.test:4174/hosted/harmful-click-login.html"
  );
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");

  await expect(inspected.getByRole("alertdialog")).toHaveCount(0);
  await inspected.getByRole("button", { name: "Continue to login" }).click();
  await expect(inspected.getByRole("alertdialog")).toBeVisible();
  await expect
    .poll(() => storedBehaviorSummary(extensionPage, tabId))
    .toMatchObject({
      clickTriggeredSensitiveInsertions: 1,
      evidence: expect.arrayContaining([
        "BEHAVIOR.CLICK_TRIGGERED_SENSITIVE_INSERTION"
      ])
    });

  await inspected.close();
  await extensionPage.close();
});

test("warns on Latvian and Russian synthetic impersonation but not articles", async () => {
  const worker = await extensionWorker();
  const extensionPage = await context.newPage();
  const extensionId = new URL(worker.url()).host;
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);

  for (const fixtureName of [
    "harmful-latvian-login.html",
    "harmful-russian-login.html"
  ]) {
    const startedAt = Date.now();
    const inspected = await context.newPage();
    await inspected.goto(
      `http://fixture.example.test:4174/hosted/${fixtureName}`
    );
    await expect(inspected.getByRole("alertdialog")).toBeVisible();
    expect(Date.now() - startedAt).toBeLessThan(2_500);
    await inspected.close();
  }

  for (const fixtureName of [
    "benign-latvian-bank-article.html",
    "benign-russian-comparison.html"
  ]) {
    const inspected = await context.newPage();
    await inspected.goto(
      `http://fixture.example.test:4174/hosted/${fixtureName}`
    );
    await expect(inspected.getByRole("alertdialog")).toHaveCount(0);
    const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");
    await expect
      .poll(() => storedDecisionSummary(extensionPage, tabId))
      .not.toMatchObject({ state: "danger" });
    await inspected.close();
  }

  await extensionPage.close();
});

test("keeps danger after bypass while observing action mutation destinations", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const inspected = await context.newPage();
  await inspected.goto(
    "http://fixture.example.test:4174/hosted/harmful-action-mutation.html"
  );
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");

  await expect(inspected.getByRole("alertdialog")).toBeVisible();
  await inspected.getByRole("button", { name: "Continue anyway" }).click();
  await inspected.getByRole("button", { name: "Change destination" }).click();
  await expect
    .poll(() => storedBehaviorSummary(extensionPage, tabId))
    .toMatchObject({
      actionMutations: 1,
      crossOriginSensitiveActions: 1,
      rawIpSensitiveActions: 1,
      evidence: expect.arrayContaining([
        "BEHAVIOR.ACTION_MUTATION",
        "BEHAVIOR.CROSS_ORIGIN_SENSITIVE_ACTION",
        "BEHAVIOR.RAW_IP_SENSITIVE_ACTION"
      ])
    });
  await expect
    .poll(() => storedDecisionSummary(extensionPage, tabId))
    .toMatchObject({ state: "danger", intervention: "bypassed" });

  await inspected.close();
  await extensionPage.close();
});

test("marks canvas-only identity visibility as partial without warning", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const inspected = await context.newPage();
  await inspected.goto(
    "http://fixture.example.test:4174/hosted/canvas-identity-login.html"
  );
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");

  await expect(inspected.getByRole("alertdialog")).toHaveCount(0);
  await expect
    .poll(() => storedBehaviorSummary(extensionPage, tabId))
    .toMatchObject({
      canvasElements: 1,
      coverage: "partial",
      evidence: expect.arrayContaining(["BEHAVIOR.CANVAS_TEXT_UNOBSERVABLE"])
    });

  await inspected.close();
  await extensionPage.close();
});

test("observes logo removal and executable-style download controls", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);

  const removal = await context.newPage();
  await removal.goto(
    "http://fixture.example.test:4174/hosted/logo-removal-login.html"
  );
  const removalTabId = await tabIdFor(
    worker,
    "http://fixture.example.test:4174/*"
  );
  await removal.getByRole("button", { name: "Open changed login" }).click();
  await expect
    .poll(() => storedBehaviorSummary(extensionPage, removalTabId))
    .toMatchObject({
      identitySurfaceRemovals: 1,
      clickTriggeredSensitiveInsertions: 1,
      evidence: expect.arrayContaining([
        "BEHAVIOR.IDENTITY_SURFACE_REMOVAL",
        "BEHAVIOR.CLICK_TRIGGERED_SENSITIVE_INSERTION"
      ])
    });
  await removal.close();

  const controls = await context.newPage();
  await controls.goto(
    "http://fixture.example.test:4174/hosted/permission-download-controls.html"
  );
  const controlsTabId = await tabIdFor(
    worker,
    "http://fixture.example.test:4174/*"
  );
  await expect
    .poll(() => storedBehaviorSummary(extensionPage, controlsTabId))
    .toMatchObject({ permissionOrClipboardControls: 1 });
  await controls.locator("#download-update").evaluate((anchor) => {
    anchor.addEventListener("click", (event) => event.preventDefault(), {
      once: true
    });
    (anchor as HTMLAnchorElement).click();
  });
  await expect
    .poll(() => storedBehaviorSummary(extensionPage, controlsTabId))
    .toMatchObject({
      suspiciousDownloadClicks: 1,
      evidence: expect.arrayContaining([
        "BEHAVIOR.SUSPICIOUS_DOWNLOAD_CLICK",
        "BEHAVIOR.PERMISSION_OR_CLIPBOARD_CONTROL"
      ])
    });
  await controls.close();
  await extensionPage.close();
});

test("verifies a signed resolver response without transmitting page location", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  resolverRequests.length = 0;
  const enabledConfig = {
    version: 1,
    enabled: true,
    endpoint: "http://127.0.0.1:4176/v1/resolve",
    publicKey: resolverPublicKey,
    keyId: resolverKeyId,
    locale: "en-LV"
  } as const;
  await expect(
    extensionPage.evaluate(
      (config) =>
        chrome.runtime.sendMessage({
          type: "originlens.set-resolver-config",
          config
        }),
      enabledConfig
    )
  ).resolves.toMatchObject({ ok: true });
  const inspected = await context.newPage();
  await inspected.goto("http://fixture.example.test:4174/identity-mismatch");
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");
  await expect
    .poll(() =>
      extensionPage.evaluate(() =>
        chrome.runtime.sendMessage({ type: "originlens.get-resolver-status" })
      )
    )
    .toMatchObject({
      lastResult: {
        status: "verified",
        evidenceCode: "RESOLVER.SIGNED_RESPONSE",
        candidateCount: 1
      }
    });
  await expect
    .poll(() =>
      extensionPage.evaluate(
        (id) =>
          chrome.runtime.sendMessage({
            type: "originlens.get-identity-assessment",
            tabId: id
          }),
        tabId
      )
    )
    .toMatchObject({
      domainStatus: "verified",
      registrableDomain: "example.test",
      relationship: "resolver-candidate",
      evidence: ["IDENTITY.DOMAIN.RESOLVER_CANDIDATE"]
    });
  await expect
    .poll(() => storedDecisionSummary(extensionPage, tabId))
    .toMatchObject({
      state: "caution",
      intervention: "not-required",
      gates: { verifiedDomainMismatch: false }
    });
  await expect(inspected.getByRole("alertdialog")).toHaveCount(0);
  expect(resolverRequests).toEqual([
    { version: 1, organization: "Swedbank Latvia", locale: "en-LV" }
  ]);
  expect(JSON.stringify(resolverRequests)).not.toMatch(
    /url|domain|path|query|html|text|screenshot|history/i
  );

  const diagnostics = await openDiagnostics(extensionId, tabId);
  await expect(
    diagnostics
      .getByLabel("Outbound privacy audit")
      .getByText("verified", { exact: true })
  ).toBeVisible();
  await expect(
    diagnostics.getByText(/outbound page-derived fields organization, locale/)
  ).toBeVisible();

  await extensionPage.evaluate(
    (config) =>
      chrome.runtime.sendMessage({
        type: "originlens.set-resolver-config",
        config: { ...config, enabled: false }
      }),
    enabledConfig
  );
  await diagnostics.close();
  await inspected.close();
  await extensionPage.close();
});

test("falls back to the local warning when the optional resolver is offline", async () => {
  const worker = await extensionWorker();
  const extensionId = new URL(worker.url()).host;
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
  const offlineConfig = {
    version: 1,
    enabled: true,
    endpoint: "http://127.0.0.1:4199/v1/resolve",
    publicKey: resolverPublicKey,
    keyId: resolverKeyId,
    locale: "en-LV"
  } as const;
  await extensionPage.evaluate(
    (config) =>
      chrome.runtime.sendMessage({
        type: "originlens.set-resolver-config",
        config
      }),
    offlineConfig
  );

  const inspected = await context.newPage();
  await inspected.goto("http://fixture.example.test:4174/identity-mismatch");
  const tabId = await tabIdFor(worker, "http://fixture.example.test:4174/*");
  await expect
    .poll(
      () =>
        extensionPage.evaluate(() =>
          chrome.runtime.sendMessage({
            type: "originlens.get-resolver-status"
          })
        ),
      { timeout: 6_000 }
    )
    .toMatchObject({
      lastResult: {
        status: "unavailable",
        evidenceCode: "RESOLVER.UNAVAILABLE"
      }
    });
  await expect(inspected.getByRole("alertdialog")).toBeVisible();
  await expect
    .poll(() => storedDecisionSummary(extensionPage, tabId))
    .toMatchObject({ state: "danger", intervention: "required" });

  await expect(
    extensionPage.evaluate(() =>
      chrome.runtime.sendMessage({
        type: "originlens.set-resolver-config",
        config: {
          version: 0,
          enabled: true,
          endpoint: "https://invalid.example/v1/resolve",
          publicKey: "invalid",
          keyId: "invalid",
          locale: "en-LV"
        }
      })
    )
  ).resolves.toMatchObject({ ok: false });
  await extensionPage.evaluate(
    (config) =>
      chrome.runtime.sendMessage({
        type: "originlens.set-resolver-config",
        config: { ...config, enabled: false }
      }),
    offlineConfig
  );
  await inspected.close();
  await extensionPage.close();
});

test("loads every hosted fixture without page errors", async () => {
  test.setTimeout(90_000);
  const errors: string[] = [];

  for (const fixtureName of hostedFixtureNames) {
    const inspected = await context.newPage();
    inspected.on("pageerror", (error) =>
      errors.push(`${fixtureName}: ${error.message}`)
    );
    const response = await inspected.goto(
      `http://fixture.example.test:4174/hosted/${fixtureName}`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.status(), fixtureName).toBe(200);
    await expect(inspected.locator("body"), fixtureName).toBeAttached();
    await inspected.close();
  }

  expect(errors).toEqual([]);
});

test("loads the release candidate without implicit remote requests or safety claims", async () => {
  const worker = await extensionWorker();
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  const contentScript = manifest.content_scripts?.[0] as
    | (NonNullable<chrome.runtime.Manifest["content_scripts"]>[number] & {
        match_origin_as_fallback?: boolean;
      })
    | undefined;
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.version).toBe("0.1.2");
  expect(manifest.description).toBe(
    "Local-first phishing warnings using claimed identity, sensitive-data intent, verified domains, and bounded page behavior."
  );
  expect(manifest.permissions).toEqual([
    "scripting",
    "storage",
    "webNavigation"
  ]);
  expect(manifest.host_permissions).toEqual(["http://*/*", "https://*/*"]);
  expect(manifest.icons).toEqual({
    16: "icon/16.png",
    32: "icon/32.png",
    48: "icon/48.png",
    128: "icon/128.png"
  });
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
  await expect(
    page.getByText("Disabled by default", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Bounded structure, identity, and decision gates")
  ).toBeVisible();
  await page.close();
});
