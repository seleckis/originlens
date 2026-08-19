#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artifact_path="$repo_root/dist/originlens-stage-0.zip"
checksum_path="$artifact_path.sha256"
nginx_source="$repo_root/deploy/nginx/fixtures.example.invalid.conf"
release_dir="/var/www/originlens/releases"
nginx_available="/etc/nginx/sites-available/fixtures.example.invalid"
nginx_enabled="/etc/nginx/sites-enabled/fixtures.example.invalid"

"$repo_root/scripts/package-test-download.sh"

sudo install -d -m 0755 "$release_dir"
sudo install -m 0644 "$artifact_path" "$release_dir/originlens-stage-0.zip"
sudo install -m 0644 "$checksum_path" "$release_dir/originlens-stage-0.zip.sha256"
sudo install -m 0644 "$nginx_source" "$nginx_available"
sudo ln -sfn "$nginx_available" "$nginx_enabled"
sudo nginx -t
sudo systemctl reload nginx

printf '%s\n' 'Deployment complete.'
printf '%s\n' 'Download: https://fixtures.example.invalid/originlens-stage-0.zip'
printf '%s\n' 'Checksum: https://fixtures.example.invalid/originlens-stage-0.zip.sha256'
