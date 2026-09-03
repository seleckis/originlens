import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const packageManifest = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8")
);
const EXPECTED_VERSION = packageManifest.version;
const EXPECTED_PERMISSIONS = ["scripting", "storage", "webNavigation"];
const EXPECTED_HOST_PERMISSIONS = ["http://*/*", "https://*/*"];
const EXPECTED_DESCRIPTION =
  "Local-first phishing warnings using claimed identity, sensitive-data intent, verified domains, and bounded page behavior.";
const PNG_SIGNATURE = "89504e470d0a1a0a";

function fail(message) {
  throw new Error(`Web Store package validation failed: ${message}`);
}

function entryBytes(artifact, entry) {
  return execFileSync("unzip", ["-p", artifact, entry], {
    maxBuffer: 8 * 1024 * 1024
  });
}

function sameStrings(actual, expected) {
  return (
    Array.isArray(actual) &&
    [...actual].sort().join("\n") === [...expected].sort().join("\n")
  );
}

function pngDimensions(bytes, entry) {
  if (bytes.subarray(0, 8).toString("hex") !== PNG_SIGNATURE)
    fail(`${entry} is not a PNG`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

const input = process.argv[2];
const artifact = resolve(
  input ?? `dist/originlens-${EXPECTED_VERSION}-chrome-web-store.zip`
);
if (!existsSync(artifact)) fail(`artifact not found: ${artifact}`);

const entries = execFileSync("unzip", ["-Z1", artifact], {
  encoding: "utf8"
})
  .trim()
  .split("\n")
  .filter(Boolean);
if (!entries.includes("manifest.json"))
  fail("manifest.json is not at ZIP root");
if (!entries.includes("onboarding.html"))
  fail("affirmative-consent onboarding page is absent from ZIP");
if (entries.some((entry) => entry.startsWith("/") || entry.includes("../")))
  fail("archive contains an unsafe path");
if (entries.some((entry) => entry.endsWith(".map")))
  fail("source maps must not be uploaded");
if (entries.some((entry) => /(^|\/)SBOM/i.test(entry)))
  fail("SBOM must remain adjacent to, not inside, the upload ZIP");

const manifest = JSON.parse(entryBytes(artifact, "manifest.json").toString());
if (manifest.manifest_version !== 3) fail("manifest_version must be 3");
if (manifest.version !== EXPECTED_VERSION)
  fail(`manifest version must be ${EXPECTED_VERSION}`);
if (manifest.name !== "OriginLens") fail("manifest name changed");
if (manifest.description !== EXPECTED_DESCRIPTION)
  fail("manifest description does not match the reviewed Store summary");
if (manifest.description.length > 132)
  fail("manifest description exceeds 132 characters");
if (!sameStrings(manifest.permissions, EXPECTED_PERMISSIONS))
  fail("required permissions changed without publication review");
if (!sameStrings(manifest.host_permissions, EXPECTED_HOST_PERMISSIONS))
  fail("host permissions changed without publication review");
if (
  manifest.content_security_policy?.extension_pages !==
  "script-src 'self'; object-src 'none'; base-uri 'none'"
)
  fail("extension CSP changed");

for (const size of [16, 32, 48, 128]) {
  const entry = manifest.icons?.[String(size)];
  if (entry !== `icon/${size}.png`) fail(`missing manifest icon ${size}`);
  if (!entries.includes(entry)) fail(`${entry} is absent from ZIP`);
  const dimensions = pngDimensions(entryBytes(artifact, entry), entry);
  if (dimensions.width !== size || dimensions.height !== size)
    fail(`${entry} must be ${size}x${size}`);
}

for (const entry of entries.filter((name) => name.endsWith(".html"))) {
  const html = entryBytes(artifact, entry).toString();
  if (/<script\b[^>]*\bsrc=["']https?:/i.test(html))
    fail(`${entry} loads a remote script`);
}
for (const entry of entries.filter((name) => name.endsWith(".js"))) {
  const javascript = entryBytes(artifact, entry).toString();
  if (/\b(?:import|importScripts)\s*\(\s*["']https?:/i.test(javascript))
    fail(`${entry} imports remote executable code`);
}

const bytes = readFileSync(artifact).byteLength;
if (bytes >= 2 * 1024 * 1024 * 1024) fail("artifact exceeds 2 GB");
process.stdout.write(
  `Web Store package valid: ${entries.length} files, ${bytes} bytes, version ${manifest.version}.\n`
);
