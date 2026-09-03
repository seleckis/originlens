#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_artifact="$repo_root/dist/originlens-release-candidate.zip"
package_version="$(node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(JSON.parse(readFileSync("package.json", "utf8")).version)')"
store_artifact="$repo_root/dist/originlens-$package_version-chrome-web-store.zip"

SOURCE_DATE_EPOCH=1704067200 "$repo_root/scripts/package-test-download.sh"
SOURCE_DATE_EPOCH=1704067200 "$repo_root/scripts/package-web-store.sh"
first_test_hash="$(sha256sum "$test_artifact" | cut -d ' ' -f 1)"
first_store_hash="$(sha256sum "$store_artifact" | cut -d ' ' -f 1)"
SOURCE_DATE_EPOCH=1704067200 "$repo_root/scripts/package-test-download.sh"
SOURCE_DATE_EPOCH=1704067200 "$repo_root/scripts/package-web-store.sh"
second_test_hash="$(sha256sum "$test_artifact" | cut -d ' ' -f 1)"
second_store_hash="$(sha256sum "$store_artifact" | cut -d ' ' -f 1)"

if [[ "$first_test_hash" != "$second_test_hash" ]]; then
  printf 'Test artifact reproducibility failure: %s != %s\n' "$first_test_hash" "$second_test_hash" >&2
  exit 1
fi
if [[ "$first_store_hash" != "$second_store_hash" ]]; then
  printf 'Web Store artifact reproducibility failure: %s != %s\n' "$first_store_hash" "$second_store_hash" >&2
  exit 1
fi

printf 'Reproducible test artifact SHA-256: %s\n' "$second_test_hash"
printf 'Reproducible Web Store artifact SHA-256: %s\n' "$second_store_hash"
