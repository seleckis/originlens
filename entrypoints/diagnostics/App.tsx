import { useEffect, useState } from "react";

import {
  getIdentityAssessmentForTab,
  getNavigationSummaryForTab,
  getStructuralSummaryForTab
} from "../../lib/current-origin";
import type { IdentityAssessment } from "../../lib/claimed-identity";
import type { StructuralSummary } from "../../lib/dom-analysis";
import {
  identityComparisonText,
  identityContextText,
  identityOrganization,
  identitySourceText
} from "../../lib/identity-explanations";
import type { NavigationSummary } from "../../lib/navigation-analysis";
import { analyzeUrl } from "../../lib/url-analysis";

const checks = [
  {
    label: "Manifest",
    value: "Version 3",
    detail: "Event-driven extension service worker"
  },
  {
    label: "Required permissions",
    value: "activeTab, scripting, and webNavigation",
    detail: "Current-tab analysis, packaged injection, and bounded redirects"
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
    value: "Bounded structure and identity",
    detail: "Field values and raw page text never cross the content boundary"
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
  const [navigation, setNavigation] = useState<NavigationSummary>();
  const [identity, setIdentity] = useState<IdentityAssessment>();
  useEffect(() => {
    const tabId = Number(new URLSearchParams(location.search).get("tabId"));
    const inspectedTabId = Number.isInteger(tabId) ? tabId : undefined;
    void getStructuralSummaryForTab(inspectedTabId)
      .then(setSummary)
      .catch(() => undefined);
    void getNavigationSummaryForTab(inspectedTabId)
      .then(setNavigation)
      .catch(() => undefined);
    void getIdentityAssessmentForTab(inspectedTabId)
      .then(setIdentity)
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
        <h2 id="build-facts">Stage 3 build facts</h2>
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
      <section className="diagnostics-card card" aria-labelledby="identity">
        <p className="eyebrow">Current tab</p>
        <h2 id="identity">Claimed identity</h2>
        <p className="muted">
          Known organizations are extracted locally from bounded, high-salience
          sources. Raw page text and field values are not returned.
        </p>
        {identity ? (
          <ul>
            {identity.summary.candidates.length > 0 ? (
              identity.summary.candidates.map((candidate) => (
                <li key={candidate.identityId}>
                  <span className="check-mark" aria-hidden="true">
                    ·
                  </span>
                  <div>
                    <span className="check-label">
                      {identityOrganization(candidate)}
                    </span>
                    <strong>{candidate.confidence} identity claim</strong>
                    <small>
                      Sources: {identitySourceText(candidate)}
                      {candidate.contexts.length > 0
                        ? `; context: ${identityContextText(candidate)}`
                        : ""}
                    </small>
                  </div>
                </li>
              ))
            ) : (
              <li>
                <span className="check-mark" aria-hidden="true">
                  ·
                </span>
                <div>
                  <span className="check-label">Registry claim</span>
                  <strong>None detected</strong>
                  <small>
                    No provenance-backed organization claim was found.
                  </small>
                </div>
              </li>
            )}
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Domain relationship</span>
                <strong>{identity.domainStatus}</strong>
                <small>{identityComparisonText(identity)}</small>
              </div>
            </li>
          </ul>
        ) : (
          <p className="muted">
            Claimed-identity evidence is unavailable for this page.
          </p>
        )}
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
                  credential forms {summary.hiddenCredentialForms}; overlay
                  credential forms {summary.overlayCredentialForms}
                </strong>
                <small>
                  Invalid actions {summary.invalidFormActions}; scanned fields{" "}
                  {summary.scannedNodes}
                  {summary.truncated ? "+ (bounded)" : ""}
                </small>
              </div>
            </li>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Analysis coverage</span>
                <strong>
                  {summary.coverage}; frames {summary.analyzedFrames} analyzed,{" "}
                  {summary.unavailableFrames} unavailable
                </strong>
                <small>
                  Nested frames {summary.nestedFrames}; SPA navigations observed{" "}
                  {summary.spaNavigationsObserved}; visibility evidence{" "}
                  {summary.evidence.join(", ")}
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
      <section className="diagnostics-card card" aria-labelledby="navigation">
        <p className="eyebrow">Current tab</p>
        <h2 id="navigation">Navigation origins</h2>
        <p className="muted">
          Only origins from the current top-level navigation are retained in
          transient memory. Paths and queries are discarded.
        </p>
        {navigation ? (
          <ul>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Bounded navigation</span>
                <strong>{navigation.origins.join(" → ")}</strong>
                <small>
                  {navigation.evidence.join(", ") ||
                    "No redirect-origin change observed"}
                </small>
              </div>
            </li>
          </ul>
        ) : (
          <p className="muted">Current-navigation evidence is unavailable.</p>
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
