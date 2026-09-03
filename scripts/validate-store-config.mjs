import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { validateStoreConfig } from "./chrome-web-store-core.mjs";

const path = resolve(import.meta.dirname, "../store.config.json");
const config = validateStoreConfig(JSON.parse(readFileSync(path, "utf8")));

process.stdout.write(
  `Store API V2 configuration valid for extension ${config.extensionId}.\n`
);
