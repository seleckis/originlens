#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { ChromeWebStoreApi } from "./chrome-web-store-api.mjs";
import {
  assertVersionCanUpload,
  confirmationPhrase,
  highestRevisionVersion,
  summarizeStatus,
  UPLOAD_STATES,
  validateStatus,
  validateStoreConfig,
  validateUploadReceipt
} from "./chrome-web-store-core.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(repoRoot, "store.config.json");
const receiptPath = join(repoRoot, "dist/originlens-web-store-upload.json");
const readScope = "https://www.googleapis.com/auth/chromewebstore.readonly";
const writeScope = "https://www.googleapis.com/auth/chromewebstore";
const uploadTimeoutMs = 5 * 60_000;
const stateTimeoutMs = 90_000;
const pollIntervalMs = 5_000;
const console = globalThis.console;
const setTimeout = globalThis.setTimeout;

function fail(message) {
  throw new Error(`Store CLI: ${message}`);
}

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    stdio: capture ? "pipe" : "inherit"
  });
  if (result.error?.code === "ENOENT")
    fail(
      `${command} is not installed or is not on PATH. See docs/RELEASE.md for prerequisites.`
    );
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = capture ? redact(result.stderr).trim() : "";
    fail(
      `${command} ${args.join(" ")} failed with exit code ${String(result.status)}${detail ? `: ${detail}` : ""}`
    );
  }
  return capture ? result.stdout.trim() : "";
}

function redact(value = "") {
  return value
    .replace(/Bearer\s+\S+/giu, "Bearer [redacted]")
    .replace(/ya29\.[A-Za-z0-9._~-]+/gu, "[redacted-token]");
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(
      `Could not read ${label} at ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function loadConfig() {
  if (!existsSync(configPath)) fail(`Missing ${configPath}`);
  try {
    return validateStoreConfig(loadJson(configPath, "Store configuration"));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function mintAccessToken(config, scope) {
  const result = spawnSync(
    "gcloud",
    [
      "auth",
      "print-access-token",
      `--impersonate-service-account=${config.serviceAccountEmail}`,
      `--scopes=${scope}`,
      `--project=${config.googleCloudProjectId}`,
      "--quiet"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
      stdio: "pipe"
    }
  );
  if (result.error?.code === "ENOENT")
    fail("gcloud is not installed. Install Google Cloud CLI and retry.");
  if (result.error) fail(`gcloud could not start: ${result.error.message}`);
  if (result.status !== 0)
    fail(
      `Could not obtain a short-lived service-account token. Run gcloud auth login --no-launch-browser and verify the impersonation setup. ${redact(result.stderr).trim()}`
    );
  const accessToken = result.stdout.trim();
  if (accessToken.length < 40)
    fail("gcloud returned an empty or malformed access token");
  return accessToken;
}

async function withApi(config, scope, operation) {
  const accessToken = mintAccessToken(config, scope);
  const api = new ChromeWebStoreApi({ config, accessToken });
  try {
    return await operation(api);
  } finally {
    api.clearAccessToken();
  }
}

function printRevision(label, revision) {
  if (!revision) {
    console.log(`${label}: none`);
    return;
  }
  const channels = Array.isArray(revision.distributionChannels)
    ? revision.distributionChannels
    : [];
  const versions = channels.map((channel) => {
    const percentage = Number.isFinite(channel.deployPercentage)
      ? ` at ${channel.deployPercentage}%`
      : "";
    return `${channel.crxVersion}${percentage}`;
  });
  console.log(
    `${label}: ${revision.state}${versions.length ? ` — ${versions.join(", ")}` : ""}`
  );
}

function printStatus(config, status) {
  const summary = summarizeStatus(status);
  console.log("Chrome Web Store API V2 status");
  console.log(`Publisher ID: ${config.publisherId}`);
  console.log(`Extension ID: ${summary.itemId}`);
  printRevision("Published", status.publishedItemRevisionStatus);
  printRevision("Submitted", status.submittedItemRevisionStatus);
  console.log(
    `Staged: ${summary.staged ? `yes — ${summary.submittedVersions.join(", ")}` : "no"}`
  );
  console.log(`Last asynchronous upload: ${summary.uploadState}`);
  console.log(`Policy warning: ${summary.warned ? "yes" : "no"}`);
  console.log(`Taken down: ${summary.takenDown ? "yes" : "no"}`);
}

function packageVersion() {
  const manifest = loadJson(join(repoRoot, "package.json"), "package.json");
  if (typeof manifest.version !== "string")
    fail("package.json version is missing");
  return manifest.version;
}

function readZipManifest(artifactPath) {
  const output = run("unzip", ["-p", artifactPath, "manifest.json"], {
    capture: true
  });
  try {
    return JSON.parse(output);
  } catch {
    fail(`manifest.json in ${artifactPath} is not valid JSON`);
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function locateArtifact(version) {
  const distPath = join(repoRoot, "dist");
  if (!existsSync(distPath))
    fail("dist does not exist; run pnpm store:package");
  const candidates = readdirSync(distPath)
    .filter((name) => name === `originlens-${version}-chrome-web-store.zip`)
    .map((name) => join(distPath, name))
    .filter((path) => readZipManifest(path).version === version);
  if (candidates.length !== 1)
    fail(
      `Expected exactly one Chrome Web Store ZIP for version ${version}, found ${candidates.length}`
    );
  const path = candidates[0];
  const manifest = readZipManifest(path);
  if (manifest.manifest_version !== 3)
    fail(`Package ${path} is not a Manifest V3 extension`);
  return {
    path,
    version,
    bytes: statSync(path).size,
    sha256: sha256(path)
  };
}

function printArtifact(artifact) {
  console.log(`Extension version: ${artifact.version}`);
  console.log(`Target ZIP: ${artifact.path}`);
  console.log(`Size: ${artifact.bytes} bytes`);
  console.log(`SHA-256: ${artifact.sha256}`);
}

function runPackaging() {
  const checks = [
    ["install", "--frozen-lockfile"],
    ["lint"],
    ["format:check"],
    ["typecheck"],
    ["test"],
    ["build"],
    ["performance:check"],
    ["test:e2e"],
    ["store:assets"],
    ["package:web-store"],
    ["store:validate"],
    ["verify:reproducible"]
  ];
  for (const args of checks) {
    console.log(`\n> pnpm ${args.join(" ")}`);
    run("pnpm", args);
  }
  const artifact = locateArtifact(packageVersion());
  console.log("\nChrome Web Store package ready");
  printArtifact(artifact);
  return artifact;
}

async function confirm(action, artifact) {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    fail(
      "Confirmation requires an interactive terminal; no Store action was taken"
    );
  const phrase = confirmationPhrase(action, artifact.version);
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  try {
    const answer = await readline.question(`Type ${phrase} to continue: `);
    if (answer !== phrase)
      fail("Confirmation did not match; no Store action was taken");
  } finally {
    readline.close();
  }
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds)
  );
}

async function pollUpload(api, initialResponse) {
  if (!UPLOAD_STATES.includes(initialResponse.uploadState))
    fail(
      `Upload returned unknown state ${String(initialResponse.uploadState)}`
    );
  if (initialResponse.uploadState === "FAILED")
    fail("Package processing failed");
  if (initialResponse.uploadState === "SUCCEEDED") {
    const status = await api.fetchStatus();
    return { status, uploadState: "SUCCEEDED" };
  }
  if (initialResponse.uploadState !== "IN_PROGRESS")
    fail(`Upload did not start: ${initialResponse.uploadState}`);

  const deadline = Date.now() + uploadTimeoutMs;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    const status = await api.fetchStatus();
    const state = status.lastAsyncUploadState ?? "NOT_FOUND";
    console.log(`Upload processing: ${state}`);
    if (state === "SUCCEEDED") return { status, uploadState: state };
    if (state === "FAILED")
      fail("Package processing failed; inspect the dashboard");
  }
  fail(
    "Upload processing did not finish within five minutes; run pnpm store:status"
  );
}

function writeReceipt(config, artifact) {
  const receipt = {
    schemaVersion: 1,
    publisherId: config.publisherId,
    extensionId: config.extensionId,
    version: artifact.version,
    artifactPath: artifact.path,
    sha256: artifact.sha256,
    uploadState: "SUCCEEDED",
    uploadedAt: new Date().toISOString()
  };
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
    mode: 0o600
  });
  return receipt;
}

function readReceipt(config, artifact) {
  if (!existsSync(receiptPath))
    fail(
      `No verified upload receipt exists at ${receiptPath}; run pnpm store:upload`
    );
  try {
    return validateUploadReceipt(
      loadJson(receiptPath, "upload receipt"),
      config,
      artifact
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function verifyUploadResponse(response, artifact) {
  if (response.crxVersion && response.crxVersion !== artifact.version)
    fail(
      `Upload version mismatch: sent ${artifact.version}, Store reported ${response.crxVersion}`
    );
}

async function uploadArtifact(api, config, artifact) {
  console.log("Uploading draft package; this does not submit it for review.");
  const response = await api.upload(artifact.path);
  verifyUploadResponse(response, artifact);
  const result = await pollUpload(api, response);
  writeReceipt(config, artifact);
  console.log(`Draft upload verified: ${result.uploadState}`);
  printStatus(config, result.status);
  return result.status;
}

async function pollSubmitted(api, config, version) {
  const deadline = Date.now() + stateTimeoutMs;
  while (Date.now() < deadline) {
    const status = await api.fetchStatus();
    const submittedVersion = highestRevisionVersion(
      status.submittedItemRevisionStatus
    );
    if (submittedVersion === version) {
      printStatus(config, status);
      if (status.submittedItemRevisionStatus?.state === "REJECTED")
        fail(
          `Version ${version} was rejected; inspect the dashboard review details`
        );
      if (status.submittedItemRevisionStatus?.state === "CANCELLED")
        fail(`Version ${version} submission was cancelled`);
      return status;
    }
    const publishedVersion = highestRevisionVersion(
      status.publishedItemRevisionStatus
    );
    if (publishedVersion === version) {
      printStatus(config, status);
      return status;
    }
    await sleep(pollIntervalMs);
  }
  fail(
    `Submission was accepted but version ${version} was not visible within 90 seconds; run pnpm store:status`
  );
}

async function pollPublished(api, config, version) {
  const deadline = Date.now() + stateTimeoutMs;
  while (Date.now() < deadline) {
    const status = await api.fetchStatus();
    if (
      highestRevisionVersion(status.publishedItemRevisionStatus) === version &&
      status.publishedItemRevisionStatus?.state === "PUBLISHED"
    ) {
      printStatus(config, status);
      return status;
    }
    if (status.submittedItemRevisionStatus?.state === "REJECTED")
      fail(
        `Version ${version} is rejected; inspect the dashboard review details`
      );
    await sleep(pollIntervalMs);
  }
  fail(
    `Publication did not become visible within 90 seconds; run pnpm store:status`
  );
}

function ensureNoActiveSubmission(status) {
  const state = status.submittedItemRevisionStatus?.state;
  if (state === "PENDING_REVIEW" || state === "STAGED")
    fail(
      `Cannot start another release while submitted revision state is ${state}`
    );
}

function assertReleaseGitState(version) {
  const changes = run(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { capture: true }
  );
  if (changes) fail("Release requires a clean git working tree");
  const head = run("git", ["rev-parse", "HEAD"], { capture: true });
  let tagCommit;
  try {
    tagCommit = run("git", ["rev-list", "-n", "1", `v${version}`], {
      capture: true
    });
  } catch {
    fail(`Release tag v${version} does not exist`);
  }
  if (head !== tagCommit)
    fail(`Release tag v${version} does not point to HEAD`);
  let upstream;
  try {
    upstream = run("git", ["rev-parse", "@{upstream}"], { capture: true });
  } catch {
    fail("Current branch has no upstream; push the release checkpoint first");
  }
  if (head !== upstream)
    fail("Release commit is not pushed to the branch upstream");
}

async function statusCommand() {
  const config = loadConfig();
  await withApi(config, readScope, async (api) => {
    printStatus(config, await api.fetchStatus());
  });
}

function packageCommand() {
  runPackaging();
}

async function uploadCommand() {
  const config = loadConfig();
  const artifact = runPackaging();
  await withApi(config, writeScope, async (api) => {
    const status = validateStatus(await api.fetchStatus(), config.extensionId);
    assertVersionCanUpload(artifact.version, status);
    ensureNoActiveSubmission(status);
    console.log("\nDraft upload summary");
    console.log(`Publisher ID: ${config.publisherId}`);
    console.log(`Extension ID: ${config.extensionId}`);
    printArtifact(artifact);
    await confirm("upload", artifact);
    await uploadArtifact(api, config, artifact);
  });
}

async function submitCommand() {
  const config = loadConfig();
  const artifact = locateArtifact(packageVersion());
  run("node", ["scripts/validate-web-store-package.mjs", artifact.path]);
  readReceipt(config, artifact);
  await withApi(config, writeScope, async (api) => {
    const status = await api.fetchStatus();
    assertVersionCanUpload(artifact.version, status);
    ensureNoActiveSubmission(status);
    if (status.lastAsyncUploadState === "FAILED")
      fail("The Store reports that the last upload failed");
    console.log("\nStaged submission summary");
    console.log(`Publisher ID: ${config.publisherId}`);
    console.log(`Extension ID: ${config.extensionId}`);
    printArtifact(artifact);
    console.log("Publish type: STAGED_PUBLISH");
    console.log(
      "Google approval will stage this revision; it will not auto-publish."
    );
    await confirm("submit", artifact);
    const response = await api.submit("STAGED_PUBLISH");
    console.log(`Submission request state: ${response.state}`);
    const resultingStatus = await pollSubmitted(api, config, artifact.version);
    if (resultingStatus.submittedItemRevisionStatus?.state === "PENDING_REVIEW")
      console.log("Google review continues asynchronously.");
  });
}

async function publishCommand() {
  const config = loadConfig();
  await withApi(config, writeScope, async (api) => {
    const status = await api.fetchStatus();
    if (status.submittedItemRevisionStatus?.state !== "STAGED")
      fail(
        `Publication requires submitted state STAGED; current state is ${status.submittedItemRevisionStatus?.state ?? "NONE"}`
      );
    const version = highestRevisionVersion(status.submittedItemRevisionStatus);
    if (!version) fail("The staged revision does not report a version");
    const artifact = { version };
    console.log("\nStaged publication summary");
    console.log(`Publisher ID: ${config.publisherId}`);
    console.log(`Extension ID: ${config.extensionId}`);
    console.log(`Staged version: ${version}`);
    console.log(
      "This action will publish the already approved staged revision."
    );
    await confirm("publish", artifact);
    const response = await api.publishStaged();
    console.log(`Publication request state: ${response.state}`);
    await pollPublished(api, config, version);
  });
}

async function releaseCommand() {
  const config = loadConfig();
  const version = packageVersion();
  assertReleaseGitState(version);
  const artifact = runPackaging();
  assertReleaseGitState(version);
  await withApi(config, writeScope, async (api) => {
    const status = await api.fetchStatus();
    assertVersionCanUpload(artifact.version, status);
    ensureNoActiveSubmission(status);
    console.log("\nAutomatic release summary");
    console.log(`Publisher ID: ${config.publisherId}`);
    console.log(`Extension ID: ${config.extensionId}`);
    printArtifact(artifact);
    printRevision("Currently published", status.publishedItemRevisionStatus);
    printRevision("Currently submitted", status.submittedItemRevisionStatus);
    console.log("Publish type: DEFAULT_PUBLISH");
    console.log(
      "After Google approval, this revision will publish automatically; this is not staged publishing."
    );
    await confirm("release", artifact);
    await uploadArtifact(api, config, artifact);
    const response = await api.submit("DEFAULT_PUBLISH");
    console.log(`Submission request state: ${response.state}`);
    const resultingStatus = await pollSubmitted(api, config, artifact.version);
    if (resultingStatus.submittedItemRevisionStatus?.state === "PENDING_REVIEW")
      console.log(
        "Google review continues asynchronously. The revision will publish automatically if approved."
      );
  });
}

const commands = new Map([
  ["status", statusCommand],
  ["package", packageCommand],
  ["upload", uploadCommand],
  ["submit", submitCommand],
  ["publish", publishCommand],
  ["release", releaseCommand]
]);

export const supportedStoreCommands = Object.freeze([...commands.keys()]);

export async function runStoreCommand(command) {
  const operation = commands.get(command);
  if (!operation)
    fail(
      `Usage: node scripts/chrome-web-store-cli.mjs <${supportedStoreCommands.join("|")}>`
    );
  await operation();
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runStoreCommand(process.argv[2]).catch((error) => {
    console.error(
      redact(error instanceof Error ? error.message : String(error))
    );
    process.exitCode = 1;
  });
