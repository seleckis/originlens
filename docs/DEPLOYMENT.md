# Local release-candidate testing

This repository deliberately contains no private hostname, internal-network
endpoint, or host-specific web-server configuration. Release-candidate testing
is local and does not publish an extension artifact or fixture service.

## Package and load

From the repository root:

```bash
pnpm package:test-download
sha256sum -c dist/originlens-release-candidate.zip.sha256
pnpm test:fixtures
```

Extract `dist/originlens-release-candidate.zip`, open `chrome://extensions`,
enable Developer mode, choose **Load unpacked**, and select the extracted
`chrome-mv3` directory. Open `http://127.0.0.1:4173/` in that Chrome profile for
manual acceptance.

The fixture server binds only to loopback. Its POST route consumes and discards
request bodies without logging them. Store reviewer instructions are
self-contained and do not depend on this local fixture server.
