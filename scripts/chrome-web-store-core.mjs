const CHROME_VERSION_PATTERN = /^\d+(?:\.\d+){0,3}$/u;
const EXTENSION_ID_PATTERN = /^[a-p]{32}$/u;
const PUBLISHER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u;
const SERVICE_ACCOUNT_PATTERN =
  /^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/u;

export const ITEM_STATES = Object.freeze([
  "PENDING_REVIEW",
  "STAGED",
  "PUBLISHED",
  "PUBLISHED_TO_TESTERS",
  "REJECTED",
  "CANCELLED"
]);

export const UPLOAD_STATES = Object.freeze([
  "UPLOAD_STATE_UNSPECIFIED",
  "SUCCEEDED",
  "IN_PROGRESS",
  "FAILED",
  "NOT_FOUND"
]);

function requireString(record, key) {
  const value = record?.[key];
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`store.config.json must provide ${key}`);
  return value;
}

export function validateStoreConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("store.config.json must contain a JSON object");

  const apiVersion = requireString(input, "apiVersion");
  const googleCloudProjectId = requireString(input, "googleCloudProjectId");
  const publisherId = requireString(input, "publisherId");
  const extensionId = requireString(input, "extensionId");
  const serviceAccountEmail = requireString(input, "serviceAccountEmail");

  if (apiVersion !== "v2")
    throw new Error("store.config.json apiVersion must be v2");
  if (!PROJECT_ID_PATTERN.test(googleCloudProjectId))
    throw new Error("store.config.json has an invalid googleCloudProjectId");
  if (!PUBLISHER_ID_PATTERN.test(publisherId))
    throw new Error("store.config.json has an invalid publisherId");
  if (!EXTENSION_ID_PATTERN.test(extensionId))
    throw new Error("store.config.json has an invalid extensionId");
  if (!SERVICE_ACCOUNT_PATTERN.test(serviceAccountEmail))
    throw new Error("store.config.json has an invalid serviceAccountEmail");

  return {
    apiVersion,
    googleCloudProjectId,
    publisherId,
    extensionId,
    serviceAccountEmail
  };
}

export function parseChromeVersion(version) {
  if (typeof version !== "string" || !CHROME_VERSION_PATTERN.test(version))
    throw new Error(`Invalid Chrome extension version: ${String(version)}`);

  const parts = version.split(".").map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part > 65_535))
    throw new Error(`Invalid Chrome extension version: ${version}`);
  while (parts.length < 4) parts.push(0);
  return parts;
}

export function compareChromeVersions(left, right) {
  const leftParts = parseChromeVersion(left);
  const rightParts = parseChromeVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function revisionVersions(revision) {
  if (!revision || typeof revision !== "object") return [];
  const channels = Array.isArray(revision.distributionChannels)
    ? revision.distributionChannels
    : [];
  return [
    ...new Set(
      channels
        .map((channel) => channel?.crxVersion)
        .filter((version) => typeof version === "string")
    )
  ].sort(compareChromeVersions);
}

export function highestRevisionVersion(revision) {
  return revisionVersions(revision).at(-1);
}

function validateRevision(revision, label) {
  if (revision === undefined) return;
  if (!revision || typeof revision !== "object")
    throw new Error(`Chrome Web Store returned an invalid ${label} revision`);
  if (!ITEM_STATES.includes(revision.state))
    throw new Error(
      `Chrome Web Store returned an unknown ${label} state: ${String(revision.state)}`
    );
  for (const version of revisionVersions(revision)) parseChromeVersion(version);
}

export function validateStatus(status, expectedExtensionId, expectedName) {
  if (!status || typeof status !== "object" || Array.isArray(status))
    throw new Error("Chrome Web Store returned an invalid status response");
  if (status.itemId !== expectedExtensionId)
    throw new Error(
      `Chrome Web Store item mismatch: expected ${expectedExtensionId}, received ${String(status.itemId)}`
    );
  if (expectedName !== undefined && status.name !== expectedName)
    throw new Error(
      `Chrome Web Store resource mismatch: expected ${expectedName}, received ${String(status.name)}`
    );
  validateRevision(status.publishedItemRevisionStatus, "published");
  validateRevision(status.submittedItemRevisionStatus, "submitted");
  if (
    status.lastAsyncUploadState !== undefined &&
    !UPLOAD_STATES.includes(status.lastAsyncUploadState)
  )
    throw new Error(
      `Chrome Web Store returned an unknown upload state: ${String(status.lastAsyncUploadState)}`
    );
  return status;
}

export function assertVersionCanUpload(version, status) {
  parseChromeVersion(version);
  const comparisons = [
    ["published", ...revisionVersions(status.publishedItemRevisionStatus)],
    ["submitted", ...revisionVersions(status.submittedItemRevisionStatus)]
  ];
  for (const [label, ...versions] of comparisons)
    for (const existing of versions)
      if (compareChromeVersions(version, existing) <= 0)
        throw new Error(
          `Package version ${version} must be greater than ${label} version ${existing}`
        );
}

export function confirmationPhrase(action, version) {
  parseChromeVersion(version);
  switch (action) {
    case "upload":
      return `UPLOAD ${version}`;
    case "submit":
      return `SUBMIT ${version} STAGED_PUBLISH`;
    case "publish":
      return `PUBLISH ${version}`;
    case "release":
      return `RELEASE ${version} DEFAULT_PUBLISH`;
    default:
      throw new Error(`Unknown confirmation action: ${action}`);
  }
}

export function summarizeStatus(status) {
  const published = status.publishedItemRevisionStatus;
  const submitted = status.submittedItemRevisionStatus;
  return {
    itemId: status.itemId,
    publishedState: published?.state ?? "NONE",
    publishedVersions: revisionVersions(published),
    submittedState: submitted?.state ?? "NONE",
    submittedVersions: revisionVersions(submitted),
    staged: submitted?.state === "STAGED",
    uploadState: status.lastAsyncUploadState ?? "NOT_FOUND",
    warned: status.warned === true,
    takenDown: status.takenDown === true
  };
}

export function validateUploadReceipt(receipt, config, artifact) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt))
    throw new Error("Upload receipt is missing or invalid");
  for (const [key, expected] of [
    ["publisherId", config.publisherId],
    ["extensionId", config.extensionId],
    ["version", artifact.version],
    ["sha256", artifact.sha256]
  ])
    if (receipt[key] !== expected)
      throw new Error(
        `Upload receipt ${key} does not match the current artifact`
      );
  if (receipt.uploadState !== "SUCCEEDED")
    throw new Error("Upload receipt does not record a successful upload");
  return receipt;
}
