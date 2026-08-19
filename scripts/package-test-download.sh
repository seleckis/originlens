#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artifact_dir="$repo_root/dist"
artifact_path="$artifact_dir/originlens-stage-0.zip"
checksum_path="$artifact_path.sha256"

cd "$repo_root"
pnpm build

mkdir -p "$artifact_dir"
rm -f "$artifact_path" "$checksum_path"

(
  cd .output
  zip -q -r "$artifact_path" chrome-mv3
)

sha256sum "$artifact_path" > "$checksum_path"

printf 'Created %s\n' "$artifact_path"
printf 'Created %s\n' "$checksum_path"
