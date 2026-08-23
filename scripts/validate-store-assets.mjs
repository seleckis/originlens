import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(import.meta.dirname, "..");
const expected = new Map([
  ["public/icon/16.png", [16, 16]],
  ["public/icon/32.png", [32, 32]],
  ["public/icon/48.png", [48, 48]],
  ["public/icon/128.png", [128, 128]],
  ["docs/store/assets/generated/promo-440x280.png", [440, 280]],
  ["docs/store/assets/generated/screenshots/01-onboarding.png", [1280, 800]],
  ["docs/store/assets/generated/screenshots/02-warning.png", [1280, 800]],
  ["docs/store/assets/generated/screenshots/03-popup-danger.png", [1280, 800]],
  ["docs/store/assets/generated/screenshots/04-diagnostics.png", [1280, 800]],
  ["docs/store/assets/generated/screenshots/05-options.png", [1280, 800]]
]);
const pngSignature = "89504e470d0a1a0a";

for (const [relative, [expectedWidth, expectedHeight]] of expected) {
  const path = resolve(repoRoot, relative);
  if (!existsSync(path)) throw new Error(`Missing store asset: ${relative}`);
  const bytes = readFileSync(path);
  if (bytes.subarray(0, 8).toString("hex") !== pngSignature)
    throw new Error(`${relative} is not a PNG`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight)
    throw new Error(
      `${relative} is ${width}x${height}, expected ${expectedWidth}x${expectedHeight}`
    );
}

const listing = readFileSync(resolve(repoRoot, "docs/store/LISTING.md"), "utf8")
  .replace(/\s+/g, " ")
  .trim();
const summary =
  "Local-first phishing warnings using claimed identity, sensitive-data intent, verified domains, and bounded page behavior.";
if (!listing.includes(summary)) throw new Error("Store summary copy changed");
if (summary.length > 132)
  throw new Error(`Store summary is ${summary.length} characters`);

process.stdout.write(
  `Store assets valid: ${expected.size} PNG files; summary ${summary.length}/132 characters.\n`
);
