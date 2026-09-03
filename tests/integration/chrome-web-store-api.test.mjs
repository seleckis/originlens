// @vitest-environment node

import { Buffer } from "node:buffer";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ChromeWebStoreApi } from "../../scripts/chrome-web-store-api.mjs";

const config = {
  publisherId: "64be6092-5735-41ad-be49-cd38e273eef2",
  extensionId: "daocfajhjghkempepndgncijepjabbkp"
};
const temporaryDirectories = [];

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("Chrome Web Store API V2 client", () => {
  it("fetches status from the expected item without exposing extra methods", async () => {
    const fetchImplementation = vi.fn(async () =>
      response({
        name: `publishers/${config.publisherId}/items/${config.extensionId}`,
        itemId: config.extensionId,
        publishedItemRevisionStatus: {
          state: "PUBLISHED",
          distributionChannels: [{ crxVersion: "0.1.2" }]
        }
      })
    );
    const api = new ChromeWebStoreApi({
      config,
      accessToken: "short-lived-test-token",
      fetchImplementation
    });

    await expect(api.fetchStatus()).resolves.toMatchObject({
      itemId: config.extensionId
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      `https://chromewebstore.googleapis.com/v2/publishers/${config.publisherId}/items/${config.extensionId}:fetchStatus`,
      expect.objectContaining({
        headers: { Authorization: "Bearer short-lived-test-token" }
      })
    );
    expect(api.cancelSubmission).toBeUndefined();
    expect(api.setPublishedDeployPercentage).toBeUndefined();
  });

  it("uploads only the supplied ZIP as a draft package", async () => {
    const directory = mkdtempSync(join(tmpdir(), "originlens-store-api-"));
    temporaryDirectories.push(directory);
    const artifactPath = join(directory, "originlens.zip");
    writeFileSync(artifactPath, "zip bytes");
    const fetchImplementation = vi.fn(async () =>
      response({
        itemId: config.extensionId,
        crxVersion: "0.1.4",
        uploadState: "SUCCEEDED"
      })
    );
    const api = new ChromeWebStoreApi({
      config,
      accessToken: "token",
      fetchImplementation
    });

    await expect(api.upload(artifactPath)).resolves.toMatchObject({
      uploadState: "SUCCEEDED"
    });
    const [url, options] = fetchImplementation.mock.calls[0];
    expect(url).toBe(
      `https://chromewebstore.googleapis.com/upload/v2/publishers/${config.publisherId}/items/${config.extensionId}:upload`
    );
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/zip");
    expect(Buffer.from(options.body).toString()).toBe("zip bytes");
  });

  it("uses explicit staged and automatic submission bodies with blocking warnings", async () => {
    const fetchImplementation = vi.fn(async () =>
      response({ itemId: config.extensionId, state: "PENDING_REVIEW" })
    );
    const api = new ChromeWebStoreApi({
      config,
      accessToken: "token",
      fetchImplementation
    });

    await api.submit("STAGED_PUBLISH");
    await api.submit("DEFAULT_PUBLISH");

    expect(JSON.parse(fetchImplementation.mock.calls[0][1].body)).toEqual({
      publishType: "STAGED_PUBLISH",
      skipReview: false,
      blockOnWarnings: true
    });
    expect(JSON.parse(fetchImplementation.mock.calls[1][1].body)).toEqual({
      publishType: "DEFAULT_PUBLISH",
      skipReview: false,
      blockOnWarnings: true
    });
  });

  it("publishes an approved staged revision without creating another mode", async () => {
    const fetchImplementation = vi.fn(async () =>
      response({ itemId: config.extensionId, state: "PUBLISHED" })
    );
    const api = new ChromeWebStoreApi({
      config,
      accessToken: "token",
      fetchImplementation
    });

    await api.publishStaged();

    expect(JSON.parse(fetchImplementation.mock.calls[0][1].body)).toEqual({
      publishType: "STAGED_PUBLISH",
      blockOnWarnings: true
    });
  });

  it("returns an actionable API error without echoing request credentials", async () => {
    const api = new ChromeWebStoreApi({
      config,
      accessToken: "must-not-appear",
      fetchImplementation: async () =>
        response({ error: { message: "dashboard grant missing" } }, 403)
    });

    await expect(api.fetchStatus()).rejects.toThrow(
      "Chrome Web Store returned HTTP 403: dashboard grant missing"
    );
    await expect(api.fetchStatus()).rejects.not.toThrow("must-not-appear");
  });
});
