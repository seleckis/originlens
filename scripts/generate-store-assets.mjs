import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync
} from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const extensionPath = resolve(repoRoot, ".output/chrome-mv3");
const fixtureRoot = resolve(repoRoot, "tests/fixtures/app");
const iconSource = resolve(repoRoot, "assets/brand/originlens-mark.svg");
const promoSource = resolve(
  repoRoot,
  "docs/store/assets/source/promo-tile.svg"
);
const iconOutput = resolve(repoRoot, "public/icon");
const storeOutput = resolve(repoRoot, "docs/store/assets/generated");
const screenshotOutput = resolve(storeOutput, "screenshots");
const fixturePort = 4190;

mkdirSync(iconOutput, { recursive: true });
mkdirSync(screenshotOutput, { recursive: true });
for (const name of readdirSync(screenshotOutput))
  if (name.endsWith(".png")) rmSync(resolve(screenshotOutput, name));

function contentType(path) {
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8"
    }[extname(path)] ?? "application/octet-stream"
  );
}

function fixtureServer() {
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (!/^[a-z0-9-]+\.html$/.test(name)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const path = resolve(fixtureRoot, name);
    if (
      !path.startsWith(fixtureRoot) ||
      !existsSync(path) ||
      !statSync(path).isFile()
    ) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": contentType(path) });
    createReadStream(path).pipe(response);
  });
}

async function renderSvg(browser, source, output, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const svg = readFileSync(source).toString("base64");
  await page.setContent(`<!doctype html><style>
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: transparent; }
    img { display: block; width: 100%; height: 100%; }
  </style><img alt="" src="data:image/svg+xml;base64,${svg}">`);
  await page.screenshot({ path: output, omitBackground: true });
  await page.close();
}

async function extensionWorker(context) {
  return context.serviceWorkers()[0] ?? context.waitForEvent("serviceworker");
}

async function compositePopup(browser, rawPopupPath, output) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  const popup = readFileSync(rawPopupPath).toString("base64");
  await page.setContent(`<!doctype html><style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1280px; height: 800px; overflow: hidden; color: #17211d;
      background: radial-gradient(circle at 88% 7%, #c6dabf 0 17%, transparent 38%), #f4f2ec;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    main { display: grid; grid-template-columns: 1fr 430px; gap: 80px; align-items: center; height: 100%; padding: 72px 110px; }
    h1 { margin: 0; color: #183f35; font-size: 58px; letter-spacing: -.045em; line-height: 1.03; }
    p { max-width: 520px; margin: 24px 0 0; color: #5d6863; font-size: 25px; line-height: 1.45; }
    img { width: 380px; border-radius: 18px; box-shadow: 0 28px 75px rgb(24 63 53 / 24%); }
  </style><main><section><h1>Evidence, never a green “safe” verdict.</h1><p>The popup keeps the current origin and inspectable reasons visible.</p></section><img alt="OriginLens popup" src="data:image/png;base64,${popup}"></main>`);
  await page.screenshot({ path: output });
  await page.close();
}

const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  for (const size of [16, 32, 48, 128])
    await renderSvg(
      browser,
      iconSource,
      resolve(iconOutput, `${size}.png`),
      size,
      size
    );
  await renderSvg(
    browser,
    promoSource,
    resolve(storeOutput, "promo-440x280.png"),
    440,
    280
  );
} finally {
  await browser.close();
}

execFileSync("pnpm", ["build"], { cwd: repoRoot, stdio: "inherit" });

const server = fixtureServer();
await new Promise((resolveServer) =>
  server.listen(fixturePort, "127.0.0.1", resolveServer)
);
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  viewport: { width: 1280, height: 800 },
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--host-resolver-rules=MAP fixture.example.test 127.0.0.1"
  ]
});
const temporaryPopup = resolve(
  process.env.TMPDIR ?? "/tmp",
  "originlens-popup.png"
);
try {
  const worker = await extensionWorker(context);
  const extensionId = new URL(worker.url()).host;
  const onboarding = await context.newPage();
  await onboarding.setViewportSize({ width: 1280, height: 800 });
  await onboarding.goto(`chrome-extension://${extensionId}/onboarding.html`);
  await onboarding
    .getByRole("heading", { name: "Before enabling protection" })
    .waitFor();
  await onboarding.screenshot({
    path: resolve(screenshotOutput, "01-onboarding.png")
  });
  await onboarding.close();
  await worker.evaluate(() =>
    globalThis.chrome.storage.local.set({
      protectionConsent: { enabled: true, version: 2 }
    })
  );
  const inspected = await context.newPage();
  await inspected.setViewportSize({ width: 1280, height: 800 });
  await inspected.goto(
    `http://fixture.example.test:${fixturePort}/identity-mismatch.html`,
    { waitUntil: "domcontentloaded" }
  );
  await inspected.getByRole("alertdialog").waitFor({ timeout: 5_000 });
  await inspected.screenshot({
    path: resolve(screenshotOutput, "02-warning.png")
  });
  const tabId = await worker.evaluate(async (url) => {
    const tabs = await globalThis.chrome.tabs.query({ url });
    return tabs[0]?.id;
  }, `http://fixture.example.test:${fixturePort}/*`);
  if (typeof tabId !== "number") throw new Error("Fixture tab was not found");

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 380, height: 610 });
  await popup.addInitScript((inspectedTabId) => {
    const query = globalThis.chrome.tabs.query.bind(globalThis.chrome.tabs);
    globalThis.chrome.tabs.query = async (queryInfo) =>
      queryInfo.active
        ? [await globalThis.chrome.tabs.get(inspectedTabId)]
        : query(queryInfo);
  }, tabId);
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByText("Danger", { exact: true }).waitFor({ timeout: 5_000 });
  await popup.screenshot({ path: temporaryPopup });
  await popup.close();

  const compositor = await chromium.launch({
    channel: "chromium",
    headless: true
  });
  try {
    await compositePopup(
      compositor,
      temporaryPopup,
      resolve(screenshotOutput, "03-popup-danger.png")
    );
  } finally {
    await compositor.close();
  }

  const diagnostics = await context.newPage();
  await diagnostics.setViewportSize({ width: 1280, height: 800 });
  await diagnostics.goto(
    `chrome-extension://${extensionId}/diagnostics.html?tabId=${tabId}`
  );
  await diagnostics.getByText("Danger", { exact: true }).waitFor();
  await diagnostics.screenshot({
    path: resolve(screenshotOutput, "04-diagnostics.png")
  });
  await diagnostics.close();

  const options = await context.newPage();
  await options.setViewportSize({ width: 1280, height: 800 });
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByText("Disabled by default", { exact: false }).waitFor();
  await options.evaluate(() => globalThis.scrollTo(0, 0));
  await options.screenshot({
    path: resolve(screenshotOutput, "05-options.png")
  });
  await options.close();
  await inspected.close();
} finally {
  await context.close();
  await new Promise((resolveServer, rejectServer) =>
    server.close((error) => (error ? rejectServer(error) : resolveServer()))
  );
}

process.stdout.write(
  "Generated OriginLens extension icons and Chrome Web Store artwork.\n"
);
