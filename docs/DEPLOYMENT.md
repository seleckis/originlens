# Test-download and fixture deployment

Stage 2 has a deliberately narrow self-hosted test distribution. It serves the
extension ZIP, its SHA-256 checksum, and a separate static fixture site for
manual Chrome acceptance. It does not list directories or host extension source
pages.

## Deploy

From the repository root on the Nginx host:

```bash
pnpm deploy:test-download
```

The command:

1. builds the Chrome Manifest V3 production output;
2. packages `.output/chrome-mv3` as `dist/originlens-stage-2.zip`;
3. creates `dist/originlens-stage-2.zip.sha256`;
4. installs both artifacts under `/var/www/originlens/releases`;
5. installs `tests/fixtures/app` under `/var/www/originlens/fixtures`;
6. installs and enables the Nginx vhost from
   `deploy/nginx/originlens.seleckis.lv.conf`;
7. validates the complete Nginx configuration before reloading it.

It requires local `sudo` for the system paths and reload. A failed `nginx -t`
prevents the reload.

## Download and load

- ZIP: `https://originlens.seleckis.lv/originlens-stage-2.zip`
- Checksum: `https://originlens.seleckis.lv/originlens-stage-2.zip.sha256`
- Manual acceptance fixtures: `https://originlens.seleckis.lv/fixtures/`

Verify the SHA-256 file, extract the ZIP, open `chrome://extensions`, enable
Developer mode, choose **Load unpacked**, and select the extracted `chrome-mv3`
directory. Chrome intentionally does not install a self-hosted ZIP as an
extension directly.

## Operational notes

The hostname resolves within the current Tailscale environment. The installed
configuration uses the existing shared `seleckis.lv` TLS snippet, redirects HTTP
to HTTPS, sends `Content-Disposition: attachment` for the ZIP, disables caching,
and permits only GET and HEAD for hosted fixtures. `/fixtures` redirects to the
canonical trailing-slash fixture index. The site root and unrelated paths
return 404. Certificate coverage and Nginx reload are checked by the deployment
command on the privileged host.
