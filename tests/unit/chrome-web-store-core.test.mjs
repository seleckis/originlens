import { describe, expect, it } from "vitest";

import {
  assertVersionCanUpload,
  compareChromeVersions,
  confirmationPhrase,
  highestRevisionVersion,
  summarizeStatus,
  validateStatus,
  validateStoreConfig,
  validateUploadReceipt
} from "../../scripts/chrome-web-store-core.mjs";

const config = {
  apiVersion: "v2",
  googleCloudProjectId: "originlens-web-store-19b5cd",
  publisherId: "64be6092-5735-41ad-be49-cd38e273eef2",
  extensionId: "daocfajhjghkempepndgncijepjabbkp",
  serviceAccountEmail:
    "originlens-webstore@originlens-web-store-19b5cd.iam.gserviceaccount.com"
};

const status = {
  name: `publishers/${config.publisherId}/items/${config.extensionId}`,
  itemId: config.extensionId,
  publishedItemRevisionStatus: {
    state: "PUBLISHED",
    distributionChannels: [{ crxVersion: "0.1.2", deployPercentage: 100 }]
  },
  submittedItemRevisionStatus: {
    state: "PENDING_REVIEW",
    distributionChannels: [{ crxVersion: "0.1.3", deployPercentage: 100 }]
  },
  lastAsyncUploadState: "SUCCEEDED"
};

describe("Chrome Web Store release core", () => {
  it("validates the versioned non-secret Store configuration", () => {
    expect(validateStoreConfig(config)).toEqual(config);
    expect(() => validateStoreConfig({ ...config, apiVersion: "v1" })).toThrow(
      "apiVersion must be v2"
    );
    expect(() =>
      validateStoreConfig({ ...config, extensionId: "not-an-extension" })
    ).toThrow("invalid extensionId");
  });

  it("compares Chrome manifest versions numerically", () => {
    expect(compareChromeVersions("0.1.4", "0.1.3")).toBe(1);
    expect(compareChromeVersions("1.0", "1.0.0.0")).toBe(0);
    expect(compareChromeVersions("2.0", "10.0")).toBe(-1);
    expect(() => compareChromeVersions("1.2.3.4.5", "1.0")).toThrow(
      "Invalid Chrome extension version"
    );
  });

  it("requires an upload to exceed both published and submitted versions", () => {
    expect(() => assertVersionCanUpload("0.1.4", status)).not.toThrow();
    expect(() => assertVersionCanUpload("0.1.3", status)).toThrow(
      "greater than submitted version 0.1.3"
    );
    expect(() => assertVersionCanUpload("0.1.2", status)).toThrow(
      "greater than published version 0.1.2"
    );
  });

  it("rejects an unexpected Store item identity or state", () => {
    expect(
      validateStatus(
        status,
        config.extensionId,
        `publishers/${config.publisherId}/items/${config.extensionId}`
      )
    ).toBe(status);
    expect(() =>
      validateStatus(status, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    ).toThrow("item mismatch");
    expect(() =>
      validateStatus(
        {
          ...status,
          submittedItemRevisionStatus: {
            state: "MYSTERY",
            distributionChannels: []
          }
        },
        config.extensionId
      )
    ).toThrow("unknown submitted state");
    expect(() =>
      validateStatus(
        status,
        config.extensionId,
        `publishers/wrong/items/${config.extensionId}`
      )
    ).toThrow("resource mismatch");
  });

  it("keeps staged and automatic confirmations visibly distinct", () => {
    expect(confirmationPhrase("upload", "0.1.4")).toBe("UPLOAD 0.1.4");
    expect(confirmationPhrase("submit", "0.1.4")).toBe(
      "SUBMIT 0.1.4 STAGED_PUBLISH"
    );
    expect(confirmationPhrase("publish", "0.1.4")).toBe("PUBLISH 0.1.4");
    expect(confirmationPhrase("release", "0.1.4")).toBe(
      "RELEASE 0.1.4 DEFAULT_PUBLISH"
    );
  });

  it("summarizes published, submitted, staged, and upload state", () => {
    expect(highestRevisionVersion(status.submittedItemRevisionStatus)).toBe(
      "0.1.3"
    );
    expect(summarizeStatus(status)).toMatchObject({
      itemId: config.extensionId,
      publishedState: "PUBLISHED",
      publishedVersions: ["0.1.2"],
      submittedState: "PENDING_REVIEW",
      submittedVersions: ["0.1.3"],
      staged: false,
      uploadState: "SUCCEEDED"
    });
  });

  it("binds an upload receipt to the exact item and artifact", () => {
    const artifact = { version: "0.1.4", sha256: "a".repeat(64) };
    const receipt = {
      publisherId: config.publisherId,
      extensionId: config.extensionId,
      version: artifact.version,
      sha256: artifact.sha256,
      uploadState: "SUCCEEDED"
    };
    expect(validateUploadReceipt(receipt, config, artifact)).toBe(receipt);
    expect(() =>
      validateUploadReceipt(
        { ...receipt, sha256: "b".repeat(64) },
        config,
        artifact
      )
    ).toThrow("sha256 does not match");
  });
});
