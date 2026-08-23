import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(import.meta.dirname, "..");
const files = {
  listing: "docs/store/LISTING.md",
  privacy: "PRIVACY.md",
  disclosures: "docs/store/PRIVACY_DISCLOSURE.md",
  submission: "docs/store/SUBMISSION.md"
};
const contents = Object.fromEntries(
  Object.entries(files).map(([key, relative]) => [
    key,
    readFileSync(resolve(repoRoot, relative), "utf8")
      .replace(/\s+/g, " ")
      .trim()
  ])
);
const requiredEverywhere =
  "https://github.com/seleckis/originlens/blob/main/PRIVACY.md";
for (const key of ["listing", "disclosures", "submission"])
  if (!contents[key].includes(requiredEverywhere))
    throw new Error(`${files[key]} is missing the canonical privacy URL`);

for (const phrase of [
  "Website content",
  "Current web-browsing activity",
  "never reads, retains, logs, transmits, hashes, or inspects values",
  "no telemetry, analytics, advertising, or reputation API",
  "Limited Use requirements"
])
  if (!contents.privacy.includes(phrase))
    throw new Error(`PRIVACY.md is missing required disclosure: ${phrase}`);

for (const permission of [
  "`activeTab`",
  "`scripting`",
  "`storage`",
  "`webNavigation`",
  "`http://*/*`",
  "`https://*/*`"
])
  if (!contents.submission.includes(permission))
    throw new Error(`Submission worksheet does not justify ${permission}`);

for (const obsolete of [
  "docs/store/LISTING_DRAFT.md",
  "docs/store/PRIVACY_DISCLOSURE_DRAFT.md"
])
  if (existsSync(resolve(repoRoot, obsolete)))
    throw new Error(`Obsolete draft remains: ${obsolete}`);

if (!contents.submission.includes("Publishing: deferred after review"))
  throw new Error("Submission worksheet must require deferred publishing");

const consentRequirements = {
  listing:
    "does not analyze website content or current browsing activity until",
  privacy:
    "does not analyze website content or current web-browsing activity until",
  disclosures: "Enable OriginLens protection",
  submission: "Enable OriginLens protection"
};
for (const [key, phrase] of Object.entries(consentRequirements))
  if (!contents[key].includes(phrase))
    throw new Error(`${files[key]} is missing consent disclosure: ${phrase}`);
process.stdout.write("Publication documents are internally consistent.\n");
