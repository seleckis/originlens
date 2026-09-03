import { readFile } from "node:fs/promises";

import { validateStatus } from "./chrome-web-store-core.mjs";

const API_ROOT = "https://chromewebstore.googleapis.com";

function errorDetails(body) {
  if (body?.error?.message) return body.error.message;
  if (body?.message) return body.message;
  return JSON.stringify(body);
}

export class ChromeWebStoreApi {
  constructor({ config, accessToken, fetchImplementation = globalThis.fetch }) {
    this.config = config;
    this.accessToken = accessToken;
    this.fetchImplementation = fetchImplementation;
  }

  itemPath() {
    return `publishers/${this.config.publisherId}/items/${this.config.extensionId}`;
  }

  clearAccessToken() {
    this.accessToken = "";
  }

  async request(url, options = {}) {
    let response;
    try {
      response = await this.fetchImplementation(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...(options.headers ?? {})
        }
      });
    } catch (error) {
      throw new Error(
        `Chrome Web Store request could not connect: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }

    const text = await response.text();
    let body = {};
    if (text)
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(
          `Chrome Web Store returned HTTP ${response.status} with non-JSON output`
        );
      }
    if (!response.ok)
      throw new Error(
        `Chrome Web Store returned HTTP ${response.status}: ${errorDetails(body)}`
      );
    return body;
  }

  async fetchStatus() {
    const body = await this.request(
      `${API_ROOT}/v2/${this.itemPath()}:fetchStatus`
    );
    return validateStatus(body, this.config.extensionId, this.itemPath());
  }

  async upload(artifactPath) {
    const bytes = await readFile(artifactPath);
    const body = await this.request(
      `${API_ROOT}/upload/v2/${this.itemPath()}:upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: bytes
      }
    );
    if (body.itemId !== this.config.extensionId)
      throw new Error(
        `Chrome Web Store upload item mismatch: expected ${this.config.extensionId}, received ${String(body.itemId)}`
      );
    return body;
  }

  async submit(publishType) {
    if (!new Set(["STAGED_PUBLISH", "DEFAULT_PUBLISH"]).has(publishType))
      throw new Error(`Unsupported publish type: ${publishType}`);
    const body = await this.request(
      `${API_ROOT}/v2/${this.itemPath()}:publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishType,
          skipReview: false,
          blockOnWarnings: true
        })
      }
    );
    if (body.itemId !== this.config.extensionId)
      throw new Error(
        `Chrome Web Store submission item mismatch: expected ${this.config.extensionId}, received ${String(body.itemId)}`
      );
    return body;
  }

  async publishStaged() {
    const body = await this.request(
      `${API_ROOT}/v2/${this.itemPath()}:publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishType: "STAGED_PUBLISH",
          blockOnWarnings: true
        })
      }
    );
    if (body.itemId !== this.config.extensionId)
      throw new Error(
        `Chrome Web Store publication item mismatch: expected ${this.config.extensionId}, received ${String(body.itemId)}`
      );
    return body;
  }
}
