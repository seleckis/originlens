import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8")
);
const listed = JSON.parse(
  execFileSync("pnpm", ["list", "--prod", "--json", "--depth", "Infinity"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  })
);
const components = new Map();

function collect(dependencies = {}) {
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (!dependency || typeof dependency !== "object") continue;
    const version = String(dependency.version ?? "unknown");
    const key = `${name}@${version}`;
    components.set(key, {
      type: "library",
      name,
      version,
      purl: `pkg:npm/${encodeURIComponent(name)}@${version}`
    });
    collect(dependency.dependencies);
  }
}

for (const project of listed) collect(project.dependencies);
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  version: 1,
  metadata: {
    component: {
      type: "application",
      name: packageJson.name,
      version: packageJson.version
    }
  },
  components: [...components.values()].sort((left, right) =>
    left.purl.localeCompare(right.purl)
  )
};
const output = resolve(repositoryRoot, "dist", "SBOM.cdx.json");
mkdirSync(resolve(repositoryRoot, "dist"), { recursive: true });
writeFileSync(output, `${JSON.stringify(sbom, null, 2)}\n`);
process.stdout.write(`Created ${output}\n`);
