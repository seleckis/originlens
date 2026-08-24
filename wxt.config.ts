import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "OriginLens",
    description:
      "Local-first phishing warnings using claimed identity, sensitive-data intent, verified domains, and bounded page behavior.",
    permissions: ["scripting", "storage", "webNavigation"],
    host_permissions: ["http://*/*", "https://*/*"],
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png"
    },
    action: {
      default_title: "OriginLens — inspect this site",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png"
      }
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'"
    }
  }
});
