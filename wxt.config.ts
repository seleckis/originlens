import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "OriginLens",
    description: "See who a site really is. Privacy-first phishing detection.",
    permissions: ["activeTab", "webNavigation"],
    host_permissions: ["http://*/*", "https://*/*"],
    action: {
      default_title: "OriginLens — inspect this site"
    }
  }
});
