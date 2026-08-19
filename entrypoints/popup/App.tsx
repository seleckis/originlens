import { useEffect, useState } from "react";

import {
  getCurrentOrigin,
  getCurrentStructuralSummary,
  getCurrentUrlAnalysis
} from "../../lib/current-origin";
import type { StructuralSummary } from "../../lib/dom-analysis";
import type { DisplayOrigin } from "../../lib/origin";
import type { UrlAnalysis } from "../../lib/url-analysis";

const initialOrigin: DisplayOrigin = {
  kind: "unavailable",
  label: "Checking current origin…"
};
const initialAnalysis: UrlAnalysis = { state: "unknown", evidence: [] };

export default function App() {
  const [origin, setOrigin] = useState(initialOrigin);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [summary, setSummary] = useState<StructuralSummary>();

  useEffect(() => {
    void getCurrentOrigin().then(setOrigin);
    void getCurrentUrlAnalysis().then(setAnalysis);
    void getCurrentStructuralSummary()
      .then(setSummary)
      .catch(() => undefined);
  }, []);

  const openDiagnostics = async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL("/diagnostics.html")
    });
  };

  const openOptions = async () => {
    await browser.runtime.openOptionsPage();
  };

  return (
    <main className="popup shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          O
        </span>
        <div>
          <h1 className="brand-name">OriginLens</h1>
          <p className="tagline">See who a site really is.</p>
        </div>
      </header>

      <section className="origin-card card" aria-labelledby="origin-heading">
        <p className="eyebrow" id="origin-heading">
          Current origin
        </p>
        <p className="origin-value" data-origin-kind={origin.kind}>
          {origin.label}
        </p>
      </section>

      <section className="status-card" aria-labelledby="status-heading">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <h2 id="status-heading">
            {analysis.state === "caution"
              ? "Caution"
              : analysis.state === "unknown"
                ? "Unknown"
                : "No strong phishing indicators detected"}
          </h2>
          <p>
            URL-only analysis is local and deterministic. It cannot verify who a
            site is.
          </p>
        </div>
      </section>

      {analysis.evidence.length > 0 && (
        <section className="evidence" aria-label="URL evidence">
          <p className="eyebrow">URL evidence</p>
          <ul>
            {analysis.evidence.map((item) => (
              <li key={item.code}>
                <code>{item.code}</code>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary && (
        <section className="evidence" aria-label="Page structure">
          <p className="eyebrow">Page structure</p>
          <ul>
            <li>
              <code>STRUCTURAL.SENSITIVE_FIELDS</code>
              <span>
                Password: {summary.passwordFields}; OTP: {summary.otpFields};
                card: {summary.cardFields}; seed/key: {summary.seedOrKeyFields}
              </span>
            </li>
            <li>
              <code>STRUCTURAL.FORM_CONTEXT</code>
              <span>
                Cross-origin actions: {summary.crossOriginFormActions}; hidden
                credential forms: {summary.hiddenCredentialForms}; nested frame:{" "}
                {summary.nestedFrame ? "yes" : "no"}
              </span>
            </li>
          </ul>
        </section>
      )}

      <p className="disclaimer">
        OriginLens cannot prove that a website is safe. Keep Chrome’s built-in
        protections enabled and prefer phishing-resistant authentication.
      </p>

      <footer className="popup-actions">
        <button
          className="button primary"
          type="button"
          onClick={() => void openDiagnostics()}
        >
          Diagnostics
        </button>
        <button
          className="button"
          type="button"
          onClick={() => void openOptions()}
        >
          Options
        </button>
      </footer>
    </main>
  );
}
