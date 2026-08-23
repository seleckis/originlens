import { useEffect, useState } from "react";

import {
  disabledResolverConfig,
  isResolverResult,
  normalizeResolverLocale,
  validateResolverEndpoint,
  type ResolverConfig
} from "../../lib/identity-resolver";
import { localMlCapability } from "../../lib/ml-capability";

type SaveResult = { ok: boolean; error?: string };

function isSaveResult(value: unknown): value is SaveResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.ok === "boolean" &&
    (result.error === undefined || typeof result.error === "string")
  );
}

export default function App() {
  const [config, setConfig] = useState<ResolverConfig>(disabledResolverConfig);
  const [message, setMessage] = useState(
    "The resolver is disabled. All analysis remains local."
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void browser.runtime
      .sendMessage({ type: "originlens.get-resolver-config" })
      .then((stored: ResolverConfig | undefined) => {
        if (stored) setConfig(stored);
      })
      .catch(() => undefined);
  }, []);

  const update = (change: Partial<ResolverConfig>) =>
    setConfig((current) => ({ ...current, ...change }));

  const save = async () => {
    const endpoint = config.enabled
      ? validateResolverEndpoint(config.endpoint)
      : config.endpoint;
    const locale = normalizeResolverLocale(config.locale);
    if (config.enabled && !endpoint) {
      setMessage(
        "Use an HTTPS /v1/resolve endpoint, or HTTP only on loopback."
      );
      return;
    }
    if (!locale) {
      setMessage("Enter a valid BCP 47 locale, such as en-LV.");
      return;
    }
    const next: ResolverConfig = {
      ...config,
      endpoint: endpoint ?? config.endpoint,
      locale
    };
    setBusy(true);
    try {
      const result: unknown = await browser.runtime.sendMessage({
        type: "originlens.set-resolver-config",
        config: next
      });
      if (!isSaveResult(result)) throw new Error("Configuration rejected");
      if (!result.ok) throw new Error(result.error ?? "Configuration rejected");
      setConfig(next);
      setMessage(
        next.enabled
          ? "Resolver enabled. Only normalized organization and locale are sent."
          : "Resolver disabled. All analysis remains local."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Configuration was not saved."
      );
    } finally {
      setBusy(false);
    }
  };

  const testResolver = async () => {
    setBusy(true);
    try {
      const result: unknown = await browser.runtime.sendMessage({
        type: "originlens.test-resolver",
        organization: "Northstar Bank"
      });
      if (!isResolverResult(result)) throw new Error("Invalid resolver result");
      setMessage(
        result.status === "verified"
          ? `Signed fictional response verified with ${result.candidates.length} candidate domain(s).`
          : `Resolver test result: ${result.status}. Local analysis remains available.`
      );
    } catch {
      setMessage("Resolver is unavailable. Local analysis remains available.");
    } finally {
      setBusy(false);
    }
  };

  const openDiagnostics = async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL("/diagnostics.html")
    });
  };

  return (
    <main className="settings shell">
      <header className="brand">
        <img className="brand-mark" src="/icon/128.png" alt="" />
        <div>
          <h1 className="brand-name">OriginLens options</h1>
          <p className="tagline">See who a site really is.</p>
        </div>
      </header>

      <section className="settings-card card" aria-labelledby="resolver-title">
        <p className="eyebrow">Optional network feature</p>
        <h2 id="resolver-title">Self-hosted identity resolver</h2>
        <p className="muted">
          Disabled by default. When enabled, a signed resolver receives only a
          normalized claimed organization and locale. The visited URL, domain,
          path, page content, and browsing history are not sent.
        </p>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
          />
          Enable the configured resolver
        </label>
        <div className="field-grid">
          <label>
            Resolver endpoint
            <input
              type="url"
              value={config.endpoint}
              placeholder="http://127.0.0.1:4319/v1/resolve"
              onChange={(event) => update({ endpoint: event.target.value })}
            />
          </label>
          <label>
            Locale
            <input
              value={config.locale}
              maxLength={35}
              onChange={(event) => update({ locale: event.target.value })}
            />
          </label>
          <label>
            Signing key ID
            <input
              value={config.keyId}
              maxLength={64}
              onChange={(event) => update({ keyId: event.target.value })}
            />
          </label>
          <label>
            Ed25519 public key (base64url)
            <input
              value={config.publicKey}
              maxLength={128}
              spellCheck={false}
              onChange={(event) => update({ publicKey: event.target.value })}
            />
          </label>
        </div>
        <p className="status" role="status">
          {message}
        </p>
        <div className="button-row">
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={() => void save()}
          >
            Save resolver settings
          </button>
          <button
            className="button"
            type="button"
            disabled={busy || !config.enabled}
            onClick={() => void testResolver()}
          >
            Test fictional identity
          </button>
          <button
            className="button"
            type="button"
            onClick={() => void openDiagnostics()}
          >
            Open diagnostics
          </button>
        </div>
      </section>
      <section className="settings-card card" aria-labelledby="ml-title">
        <p className="eyebrow">Local ML decision gate</p>
        <h2 id="ml-title">No model is packaged</h2>
        <p className="muted">{localMlCapability.reason}</p>
      </section>
    </main>
  );
}
