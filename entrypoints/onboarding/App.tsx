import { useEffect, useState } from "react";

import {
  enableProtection,
  isProtectionConsent,
  isProtectionEnabled,
  PROTECTION_CONSENT_KEY
} from "../../lib/protection-consent";

export default function App() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [enabled, setEnabled] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onStorageChanged = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local" || !(PROTECTION_CONSENT_KEY in changes)) return;
      const nextEnabled = isProtectionConsent(
        changes[PROTECTION_CONSENT_KEY]?.newValue
      );
      setEnabled(nextEnabled);
      if (!nextEnabled) setAcknowledged(false);
    };
    browser.storage.onChanged.addListener(onStorageChanged);
    void isProtectionEnabled().then(setEnabled);
    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  const enable = async () => {
    if (!acknowledged) return;
    setBusy(true);
    setError("");
    try {
      await enableProtection();
      setEnabled(true);
    } catch {
      setError("Protection could not be enabled. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const openOptions = async () => {
    await browser.runtime.openOptionsPage();
  };

  return (
    <main className="onboarding shell">
      <header className="brand">
        <img className="brand-mark" src="/icon/128.png" alt="" />
        <div>
          <h1 className="brand-name">OriginLens</h1>
          <p className="tagline">Local-first phishing warnings</p>
        </div>
      </header>

      <section className="consent-card card" aria-labelledby="consent-title">
        <p className="eyebrow">Your choice comes first</p>
        <h2 id="consent-title">
          {enabled ? "Protection is enabled" : "Before enabling protection"}
        </h2>

        {enabled ? (
          <>
            <p className="lead">
              OriginLens may now perform the local processing described below.
              You can disable it at any time in Options.
            </p>
            <button
              className="button primary"
              type="button"
              onClick={() => void openOptions()}
            >
              Open OriginLens options
            </button>
          </>
        ) : (
          <>
            <p className="lead">
              Until you enable it, OriginLens does not analyze website content
              or your current browsing activity.
            </p>

            <div className="disclosure" aria-label="Local data processing">
              <h3>What OriginLens will process locally</h3>
              <ul>
                <li>
                  <strong>Website content:</strong> bounded visible identity
                  cues, structural attributes, form/control types, and
                  destination categories.
                </li>
                <li>
                  <strong>Current browsing activity:</strong> the current origin
                  and registrable domain, eligible frames, and bounded redirect
                  facts for the active navigation.
                </li>
              </ul>
              <h3>Why</h3>
              <p>
                This processing supports one purpose: warning before
                sensitive-data entry when a page claims a verified organization
                from a domain not verified for that organization.
              </p>
              <h3>Privacy boundaries</h3>
              <p>
                Analysis stays on your device by default. OriginLens does not
                retain or transmit page content or browsing activity, and never
                reads values entered into password, OTP, payment, recovery,
                seed-phrase, private-key, or other form fields. The optional
                self-hosted resolver remains disabled and requires separate
                configuration.
              </p>
            </div>

            <label className="consent-check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              I consent to the local processing of website content and current
              browsing activity described above.
            </label>

            <div className="consent-actions">
              <button
                className="button primary"
                type="button"
                disabled={!acknowledged || busy || enabled === undefined}
                onClick={() => void enable()}
              >
                {busy ? "Enabling…" : "Enable OriginLens protection"}
              </button>
              <a
                className="button"
                href="https://github.com/seleckis/originlens/blob/main/PRIVACY.md"
                target="_blank"
                rel="noreferrer"
              >
                Read privacy policy
              </a>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
