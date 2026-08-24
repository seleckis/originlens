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
  "Web history",
  "User activity",
  "never reads, retains, logs, transmits, hashes, or inspects values",
  "no telemetry, analytics, advertising, or reputation API",
  "Limited Use requirements"
])
  if (!contents.privacy.includes(phrase))
    throw new Error(`PRIVACY.md is missing required disclosure: ${phrase}`);

for (const field of [
  "scripting justification",
  "storage justification",
  "webNavigation justification",
  "Host permission justification"
])
  if (!contents.disclosures.includes(field))
    throw new Error(`Privacy worksheet does not provide ${field}`);

for (const category of ["Web history", "User activity", "Website content"])
  if (!contents.disclosures.includes(`**${category}:**`))
    throw new Error(`Privacy worksheet does not select ${category}`);

for (const category of [
  "Personally identifiable information",
  "Health information",
  "Financial and payment information",
  "Authentication information",
  "Personal communications",
  "Location"
])
  if (!contents.disclosures.includes(`**${category}**`))
    throw new Error(`Privacy worksheet does not reject ${category}`);

for (const certification of [
  "I do not sell user data to third parties",
  "I do not use or transfer user data for purposes that are unrelated",
  "I do not use or transfer user data to determine creditworthiness"
])
  if (!contents.disclosures.includes(certification))
    throw new Error(`Privacy worksheet is missing: ${certification}`);

if (!contents.disclosures.includes("redundant permission"))
  throw new Error("Privacy worksheet does not explain activeTab removal");
if (!contents.disclosures.includes("optional user-configured HTTPS resolver"))
  throw new Error("Host justification does not disclose resolver access");
if (!contents.submission.includes("all five files"))
  throw new Error("Submission worksheet must require all five screenshots");

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
    "does not analyze website content, web history, or user activity until",
  privacy:
    "does not analyze website content, web history, or user activity until",
  disclosures: "Enable OriginLens protection",
  submission: "Enable OriginLens protection"
};
for (const [key, phrase] of Object.entries(consentRequirements))
  if (!contents[key].includes(phrase))
    throw new Error(`${files[key]} is missing consent disclosure: ${phrase}`);
process.stdout.write("Publication documents are internally consistent.\n");
