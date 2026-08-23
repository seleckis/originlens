import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const output = resolve(import.meta.dirname, "..", ".output", "chrome-mv3");
const limits = {
  "background.js": 350 * 1024,
  "content-scripts/content.js": 250 * 1024,
  total: 1_500 * 1024
};

function filesUnder(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory()
      ? filesUnder(resolve(directory, entry.name), relative)
      : [relative];
  });
}

const sizes = new Map(
  filesUnder(output).map((file) => [file, statSync(resolve(output, file)).size])
);
const total = [...sizes.values()].reduce((sum, size) => sum + size, 0);
const failures = [];
for (const [file, limit] of Object.entries(limits)) {
  const size = file === "total" ? total : (sizes.get(file) ?? 0);
  if (size > limit) failures.push(`${file}: ${size} > ${limit}`);
}
if (failures.length > 0) throw new Error(failures.join("\n"));
process.stdout.write(
  `Performance budgets passed: total ${total} bytes; background ${sizes.get("background.js")} bytes; content ${sizes.get("content-scripts/content.js")} bytes.\n`
);
