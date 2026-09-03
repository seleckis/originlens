// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  runStoreCommand,
  supportedStoreCommands
} from "../../scripts/chrome-web-store-cli.mjs";

const repoRoot = resolve(import.meta.dirname, "../..");

describe("Chrome Web Store CLI surface", () => {
  it("exposes the six explicit repository commands", () => {
    const packageManifest = JSON.parse(
      readFileSync(resolve(repoRoot, "package.json"), "utf8")
    );
    for (const command of [
      "status",
      "package",
      "upload",
      "submit",
      "publish",
      "release"
    ])
      expect(packageManifest.scripts[`store:${command}`]).toBe(
        `node scripts/chrome-web-store-cli.mjs ${command}`
      );
    expect(supportedStoreCommands).toEqual([
      "status",
      "package",
      "upload",
      "submit",
      "publish",
      "release"
    ]);
  });

  it("does not implement cancellation or rollout endpoints", () => {
    const source = [
      "scripts/chrome-web-store-cli.mjs",
      "scripts/chrome-web-store-api.mjs"
    ]
      .map((path) => readFileSync(resolve(repoRoot, path), "utf8"))
      .join("\n");
    expect(source).not.toContain(":cancelSubmission");
    expect(source).not.toContain(":setPublishedDeployPercentage");
  });

  it("rejects unsupported commands before authentication or network access", async () => {
    await expect(runStoreCommand("cancel")).rejects.toThrow("Usage:");
  });
});
