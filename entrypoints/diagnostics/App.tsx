import { useEffect, useState } from "react";

import {
  getBehaviorSummaryForTab,
  getDecisionSummaryForTab,
  getIdentityAssessmentForTab,
  getNavigationSummaryForTab,
  getResolverStatus,
  getStructuralSummaryForTab
} from "../../lib/current-origin";
import type { BehaviorSummary } from "../../lib/behavior-analysis";
import { behaviorEvidenceText } from "../../lib/behavior-explanations";
import type { IdentityAssessment } from "../../lib/claimed-identity";
import {
  decisionEvidenceText,
  decisionHeading,
  decisionSensitiveIntentText
} from "../../lib/decision-explanations";
import type { DecisionSummary } from "../../lib/decision-policy";
import type { StructuralSummary } from "../../lib/dom-analysis";
import {
  identityComparisonText,
  identityContextText,
  identityOrganization,
  identitySourceText
} from "../../lib/identity-explanations";
import type { NavigationSummary } from "../../lib/navigation-analysis";
import type { ResolverStatus } from "../../lib/identity-resolver";
import { localMlCapability } from "../../lib/ml-capability";
import { createSanitizedDiagnostics } from "../../lib/diagnostics-export";
import { analyzeUrl } from "../../lib/url-analysis";
import {
  isProtectionConsent,
  isProtectionEnabled,
  PROTECTION_CONSENT_KEY
} from "../../lib/protection-consent";

const checks = [
  {
    label: "Manifest",
    value: "Version 3",
    detail: "Event-driven extension service worker"
  },
  {
    label: "Required permissions",
    value: "scripting, storage, and webNavigation",
    detail:
      "Packaged injection, local settings, and bounded navigation evidence"
  },
  {
    label: "Network",
    value: "Optional resolver disabled by default",
    detail: "Resolver use requires explicit user configuration"
  },
  {
    label: "Telemetry",
    value: "Disabled",
    detail: "No analytics SDK or telemetry pipeline"
  },
  {
    label: "Page analysis",
    value: "Bounded structure, identity, and decision gates",
    detail:
      "Begins only after affirmative consent; field values and raw page text never cross the content boundary"
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
  const [decision, setDecision] = useState<DecisionSummary>();
  const [behavior, setBehavior] = useState<BehaviorSummary>();
  const [resolver, setResolver] = useState<ResolverStatus>();
  const [protectionEnabled, setProtectionEnabled] = useState<boolean>();
  const downloadSanitizedDiagnostics = () => {
    const exported = createSanitizedDiagnostics({
      ...(behavior ? { behavior } : {}),
      ...(decision ? { decision } : {}),
      ...(identity ? { identity } : {}),
      ...(resolver ? { resolver } : {}),
      ...(summary ? { structural: summary } : {})
    });
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(exported, null, 2)}\n`], {
        type: "application/json"
      })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "originlens-sanitized-diagnostics.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  useEffect(() => {
    const onStorageChanged = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local" || !(PROTECTION_CONSENT_KEY in changes)) return;
      setProtectionEnabled(
        isProtectionConsent(changes[PROTECTION_CONSENT_KEY]?.newValue)
      );
    };
    browser.storage.onChanged.addListener(onStorageChanged);
    void isProtectionEnabled().then(setProtectionEnabled);
    void getResolverStatus()
      .then(setResolver)
      .catch(() => undefined);
    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, []);
  useEffect(() => {
    if (!protectionEnabled) {
      setSummary(undefined);
      setNavigation(undefined);
      setIdentity(undefined);
      setDecision(undefined);
      setBehavior(undefined);
      if (protectionEnabled === false) setResolver(undefined);
      return;
    }
    void getResolverStatus()
      .then(setResolver)
      .catch(() => undefined);
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
    void getDecisionSummaryForTab(inspectedTabId)
      .then(setDecision)
      .catch(() => undefined);
    void getBehaviorSummaryForTab(inspectedTabId)
      .then(setBehavior)
      .catch(() => undefined);
  }, [protectionEnabled]);
  return (
    <main className="diagnostics shell">
      <header className="brand">
        <img className="brand-mark" src="/icon/128.png" alt="" />
        <div>
          <h1 className="brand-name">Diagnostics</h1>
          <p className="tagline">
            Inspectable facts about this OriginLens build.
          </p>
        </div>
      </header>
      <section
        className="diagnostics-card card"
        aria-labelledby="protection-state"
      >
        <p className="eyebrow">Consent state</p>
        <h2 id="protection-state">
          {protectionEnabled ? "Protection enabled" : "Protection off"}
        </h2>
        <p className="muted">
          {protectionEnabled
            ? "Current-tab diagnostics are available because local website-content, web-history, and user-activity processing was explicitly enabled."
            : "No website content, web history, or user activity is analyzed until the first-run disclosure is accepted."}
        </p>
      </section>
      <section className="diagnostics-card card" aria-labelledby="build-facts">
        <p className="eyebrow">Local extension state</p>
        <h2 id="build-facts">Build facts</h2>
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
        <button
          className="button"
          type="button"
          onClick={downloadSanitizedDiagnostics}
        >
          Download sanitized diagnostics
        </button>
      </section>
      <section className="diagnostics-card card" aria-labelledby="resolver">
        <p className="eyebrow">Optional resolver</p>
        <h2 id="resolver">Outbound privacy audit</h2>
        <p className="muted">
          The resolver protocol permits only normalized organization, locale,
          and a fixed protocol version. Domain comparison stays local.
        </p>
        <ul>
          <li>
            <span className="check-mark" aria-hidden="true">
              ·
            </span>
            <div>
              <span className="check-label">Configuration</span>
              <strong>
                {resolver?.enabled ? "Enabled" : "Disabled by default"}
              </strong>
              <small>
                Endpoint origin {resolver?.endpointOrigin ?? "none"}; outbound
                page-derived fields{" "}
                {resolver?.outboundFields.join(", ") ?? "organization, locale"}
              </small>
            </div>
          </li>
          <li>
            <span className="check-mark" aria-hidden="true">
              ·
            </span>
            <div>
              <span className="check-label">Last resolver result</span>
              <strong>{resolver?.lastResult?.status ?? "No request"}</strong>
              <small>
                {resolver?.lastResult
                  ? `${resolver.lastResult.evidenceCode}; normalized organization ${resolver.lastResult.organization}; locale ${resolver.lastResult.locale}; candidates ${resolver.lastResult.candidateCount}`
                  : "No visited URL, domain, path, query, DOM, page text, screenshot, or history is in the request schema."}
              </small>
            </div>
          </li>
        </ul>
      </section>
      <section className="diagnostics-card card" aria-labelledby="ml-gate">
        <p className="eyebrow">Optional local ML</p>
        <h2 id="ml-gate">Decision gate</h2>
        <p className="muted">{localMlCapability.reason}</p>
        <ul>
          <li>
            <span className="check-mark" aria-hidden="true">
              ·
            </span>
            <div>
              <span className="check-label">Packaged model</span>
              <strong>Not included</strong>
              <small>
                Model bytes {localMlCapability.modelBytes}; runtime dependencies{" "}
                {localMlCapability.runtimeDependencies.length}; deterministic
                analysis remains fully functional
              </small>
            </div>
          </li>
        </ul>
      </section>
      <section className="diagnostics-card card" aria-labelledby="decision">
        <p className="eyebrow">Current tab</p>
        <h2 id="decision">Decision policy</h2>
        <p className="muted">
          Danger requires a strong identity claim, sensitive-data intent, and a
          provenance-backed domain mismatch. The policy does not use an additive
          score.
        </p>
        {decision ? (
          <ul>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">User-facing state</span>
                <strong>{decisionHeading(decision.state)}</strong>
                <small>Intervention: {decision.intervention}</small>
              </div>
            </li>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Explicit gates</span>
                <strong>
                  Identity {String(decision.gates.strongIdentityClaim)};
                  sensitive intent {String(decision.gates.sensitiveDataIntent)};
                  domain mismatch{" "}
                  {String(decision.gates.verifiedDomainMismatch)}
                </strong>
                <small>
                  Organization {decision.organization ?? "none"}; actual domain{" "}
                  {decision.registrableDomain ?? "unavailable"}; intent{" "}
                  {decisionSensitiveIntentText(decision) || "none"}
                </small>
              </div>
            </li>
            {decision.evidence.map((code) => (
              <li key={code}>
                <span className="check-mark" aria-hidden="true">
                  ·
                </span>
                <div>
                  <span className="check-label">{code}</span>
                  <strong>{decisionEvidenceText(code)}</strong>
                  <small>Stable, inspectable policy evidence</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Decision evidence is unavailable for this page.
          </p>
        )}
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
      <section className="diagnostics-card card" aria-labelledby="behavior">
        <p className="eyebrow">Current tab</p>
        <h2 id="behavior">Behavioral and destination context</h2>
        <p className="muted">
          Bounded event counts and destination categories are retained only for
          this navigation. Request bodies, field values, clipboard contents, and
          permission decisions are not collected.
        </p>
        {behavior ? (
          <ul>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Observed changes</span>
                <strong>
                  Delayed fields {behavior.delayedSensitiveInsertions}; clicked
                  fields {behavior.clickTriggeredSensitiveInsertions}; action
                  mutations {behavior.actionMutations}; SPA login transitions{" "}
                  {behavior.loginSpaTransitions}
                </strong>
                <small>
                  Identity removals {behavior.identitySurfaceRemovals}; download
                  clicks {behavior.suspiciousDownloadClicks}
                </small>
              </div>
            </li>
            <li>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">Destinations</span>
                <strong>
                  Cross-origin sensitive actions{" "}
                  {behavior.crossOriginSensitiveActions}; raw-IP sensitive
                  actions {behavior.rawIpSensitiveActions}
                </strong>
                <small>
                  Permission/clipboard controls{" "}
                  {behavior.permissionOrClipboardControls}; canvas elements{" "}
                  {behavior.canvasElements}; coverage {behavior.coverage}
                </small>
              </div>
            </li>
            {behavior.evidence.map((code) => (
              <li key={code}>
                <span className="check-mark" aria-hidden="true">
                  ·
                </span>
                <div>
                  <span className="check-label">{code}</span>
                  <strong>{behaviorEvidenceText(code)}</strong>
                  <small>Bounded Stage 5 evidence</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Behavioral context is unavailable.</p>
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
