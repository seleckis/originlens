import { useEffect, useState } from "react";

import { getCurrentStructuralSummary } from "../../lib/current-origin";
import type { StructuralSummary } from "../../lib/dom-analysis";
import { analyzeUrl } from "../../lib/url-analysis";

const checks = [
  {
    label: "Manifest",
    value: "Version 3",
    detail: "Event-driven extension service worker"
  },
  {
    label: "Required permissions",
    value: "activeTab and webNavigation",
    detail: "Current-tab access and bounded top-level redirect origins"
  },
  {
    label: "Network",
    value: "No endpoints configured",
    detail: "This build contains no application network calls"
  },
  {
    label: "Telemetry",
    value: "Disabled",
    detail: "No analytics SDK or telemetry pipeline"
  },
  {
    label: "Page analysis",
    value: "Structural only",
    detail: "Field values are never read, stored, or sent"
  }
] as const;

const urlFixtures = [
  "https://www.example.co.uk/news",
  "https://mañana.com/",
  "https://bank@example.test:8443/",
  "https://pаypal.example.test/"
] as const;

export default function App() {
  const [summary, setSummary] = useState<StructuralSummary>();
  useEffect(() => {
    void getCurrentStructuralSummary()
      .then(setSummary)
      .catch(() => undefined);
  }, []);
  return (
    <main className="diagnostics shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          O
        </span>
        <div>
          <h1 className="brand-name">Diagnostics</h1>
          <p className="tagline">
            Inspectable facts about this OriginLens build.
          </p>
        </div>
      </header>
      <section className="diagnostics-card card" aria-labelledby="build-facts">
        <p className="eyebrow">Local extension state</p>
        <h2 id="build-facts">Stage 2 build facts</h2>
        <p className="muted">
          These are extension configuration facts, not a verdict about any
          website.
        </p>
        <ul>
          {checks.map((check) => (
            <li key={check.label}>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">{check.label}</span>
                <strong>{check.value}</strong>
                <small>{check.detail}</small>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="diagnostics-card card" aria-labelledby="structure">
        <p className="eyebrow">Current tab</p>
        <h2 id="structure">Structural analysis</h2>
        <p className="muted">
          Counts are derived from element types, attributes, relationships, and
          visibility. Field values and page text are not included.
        </p>
        {summary ? (
          <ul>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Sensitive structure</span>
                <strong>
                  Password {summary.passwordFields}; username{" "}
                  {summary.usernameFields}; OTP {summary.otpFields}; card{" "}
                  {summary.cardFields}; seed/key {summary.seedOrKeyFields}
                </strong>
                <small>
                  Recovery fields {summary.recoveryForms}; login controls{" "}
                  {summary.loginButtons}
                </small>
              </div>
            </li>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Form context</span>
                <strong>
                  Cross-origin actions {summary.crossOriginFormActions}; hidden
                  credential forms {summary.hiddenCredentialForms}
                </strong>
                <small>
                  Nested frame {summary.nestedFrame ? "yes" : "no"}; scanned
                  fields {summary.scannedNodes}
                  {summary.truncated ? "+ (bounded)" : ""}
                </small>
              </div>
            </li>
          </ul>
        ) : (
          <p className="muted">
            No eligible page summary is available. Chrome pages and pages opened
            before this build was installed remain unknown.
          </p>
        )}
      </section>
      <section className="diagnostics-card card" aria-labelledby="url-fixtures">
        <p className="eyebrow">Local browser fixtures</p>
        <h2 id="url-fixtures">Synthetic URL analysis</h2>
        <p className="muted">
          These fixed examples are evaluated locally; no URL is opened or
          transmitted.
        </p>
        <ul>
          {urlFixtures.map((url) => {
            const result = analyzeUrl(url);
            return (
              <li key={url}>
                <div>
                  <span className="check-label">{url}</span>
                  <strong>{result.state}</strong>
                  <small>
                    {result.evidence.map((item) => item.code).join(", ") ||
                      "No weak URL signals"}
                  </small>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
