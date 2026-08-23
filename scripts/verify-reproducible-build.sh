#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artifact_path="$repo_root/dist/originlens-release-candidate.zip"

SOURCE_DATE_EPOCH=1704067200 "$repo_root/scripts/package-test-download.sh"
first_hash="$(sha256sum "$artifact_path" | cut -d ' ' -f 1)"
SOURCE_DATE_EPOCH=1704067200 "$repo_root/scripts/package-test-download.sh"
second_hash="$(sha256sum "$artifact_path" | cut -d ' ' -f 1)"

if [[ "$first_hash" != "$second_hash" ]]; then
  printf 'Reproducibility failure: %s != %s\n' "$first_hash" "$second_hash" >&2
  exit 1
fi

printf 'Reproducible artifact SHA-256: %s\n' "$second_hash"
