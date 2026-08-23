#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artifact_dir="$repo_root/dist"
artifact_name="originlens-release-candidate.zip"
artifact_path="$artifact_dir/$artifact_name"
checksum_path="$artifact_path.sha256"
source_epoch="${SOURCE_DATE_EPOCH:-1704067200}"
staging_dir="$(mktemp -d)"
trap 'rm -rf "$staging_dir"' EXIT
export TZ=UTC

cd "$repo_root"
pnpm build

mkdir -p "$artifact_dir"
pnpm run sbom:generate
rm -f "$artifact_path" "$checksum_path"
cp -R .output/chrome-mv3 "$staging_dir/chrome-mv3"
cp "$artifact_dir/SBOM.cdx.json" "$staging_dir/SBOM.cdx.json"
find "$staging_dir" -exec touch -h -d "@$source_epoch" {} +

(
  cd "$staging_dir"
  find . -type f -print | LC_ALL=C sort | zip -X -q "$artifact_path" -@
)

(
  cd "$artifact_dir"
  sha256sum "$artifact_name" > "$artifact_name.sha256"
)

printf 'Created %s\n' "$artifact_path"
printf 'Created %s\n' "$checksum_path"
