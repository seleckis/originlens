import { useEffect, useState } from "react";

import {
  getCurrentBehaviorSummary,
  getCurrentDecisionSummary,
  getCurrentIdentityAssessment,
  getCurrentNavigationSummary,
  getCurrentOrigin,
  getCurrentStructuralSummary,
  getCurrentUrlAnalysis
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
  const [navigation, setNavigation] = useState<NavigationSummary>();
  const [identity, setIdentity] = useState<IdentityAssessment>();
  const [decision, setDecision] = useState<DecisionSummary>();
  const [behavior, setBehavior] = useState<BehaviorSummary>();

  useEffect(() => {
    void getCurrentOrigin().then(setOrigin);
    void getCurrentUrlAnalysis().then(setAnalysis);
    void getCurrentNavigationSummary().then(setNavigation);
    void getCurrentIdentityAssessment()
      .then(setIdentity)
      .catch(() => undefined);
    void getCurrentDecisionSummary()
      .then(setDecision)
      .catch(() => undefined);
    void getCurrentBehaviorSummary()
      .then(setBehavior)
      .catch(() => undefined);
    void getCurrentStructuralSummary()
      .then(setSummary)
      .catch(() => undefined);
  }, []);

  const openDiagnostics = async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    const parameters = new URLSearchParams();
    if (typeof tab?.id === "number") parameters.set("tabId", String(tab.id));
    await browser.tabs.create({
      url: browser.runtime.getURL(`/diagnostics.html?${parameters.toString()}`)
    });
  };

  const state = decision?.state ?? analysis.state;

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

      <section
        className="status-card"
        data-state={state}
        aria-labelledby="status-heading"
      >
        <span className="status-dot" aria-hidden="true" />
        <div>
          <h2 id="status-heading">{decisionHeading(state)}</h2>
          <p>
            {state === "danger"
              ? "Strong identity, sensitive-data intent, and verified-domain mismatch are all present."
              : "Analysis is local and deterministic. This state is not a safety guarantee."}
          </p>
        </div>
      </section>

      {decision && (
        <section className="evidence" aria-label="Decision policy">
          <p className="eyebrow">Explicit decision policy</p>
          <ul>
            <li>
              <code>POLICY.GATE.STRONG_IDENTITY_CLAIM</code>
              <span>
                {decision.gates.strongIdentityClaim
                  ? "Satisfied"
                  : "Not satisfied"}
                {decision.organization ? `: ${decision.organization}` : ""}
              </span>
            </li>
            <li>
              <code>POLICY.GATE.SENSITIVE_DATA_INTENT</code>
              <span>
                {decision.gates.sensitiveDataIntent
                  ? `Satisfied: ${decisionSensitiveIntentText(decision)}`
                  : "Not satisfied"}
              </span>
            </li>
            <li>
              <code>POLICY.GATE.VERIFIED_DOMAIN_MISMATCH</code>
              <span>
                {decision.gates.verifiedDomainMismatch
                  ? `Satisfied: ${decision.registrableDomain ?? "domain unavailable"}`
                  : "Not satisfied"}
              </span>
            </li>
            {decision.evidence.map((code) => (
              <li key={code}>
                <code>{code}</code>
                <span>{decisionEvidenceText(code)}</span>
              </li>
            ))}
            {decision.intervention === "bypassed" && (
              <li>
                <code>INTERVENTION.BYPASSED</code>
                <span>
                  The user bypassed the page warning for this navigation; the
                  danger verdict remains unchanged.
                </span>
              </li>
            )}
          </ul>
        </section>
      )}

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

      {navigation && navigation.evidence.length > 0 && (
        <section className="evidence" aria-label="Navigation evidence">
          <p className="eyebrow">Current navigation</p>
          <ul>
            {navigation.evidence.map((code) => (
              <li key={code}>
                <code>{code}</code>
                <span>
                  {navigation.origins.length} bounded origin
                  {navigation.origins.length === 1 ? "" : "s"} observed; paths
                  and queries were discarded.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {behavior && (
        <section className="evidence" aria-label="Behavioral context">
          <p className="eyebrow">Behavioral context</p>
          <ul>
            {behavior.evidence.map((code) => (
              <li key={code}>
                <code>{code}</code>
                <span>{behaviorEvidenceText(code)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {identity && identity.summary.candidates.length > 0 && (
        <section className="evidence" aria-label="Claimed identity evidence">
          <p className="eyebrow">Claimed identity</p>
          <ul>
            {identity.summary.candidates.map((candidate) => (
              <li key={candidate.identityId}>
                <code>IDENTITY.CLAIM.{candidate.confidence.toUpperCase()}</code>
                <span>
                  {identityOrganization(candidate)} from{" "}
                  {identitySourceText(candidate)}.
                  {candidate.contexts.length > 0
                    ? ` Context: ${identityContextText(candidate)}.`
                    : ""}
                </span>
              </li>
            ))}
            <li>
              <code>{identity.evidence[0]}</code>
              <span>{identityComparisonText(identity)}</span>
            </li>
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
                credential forms: {summary.hiddenCredentialForms}; overlay
                credential forms: {summary.overlayCredentialForms}
              </span>
            </li>
            <li>
              <code>STRUCTURAL.COVERAGE</code>
              <span>
                {summary.coverage}; analyzed frames: {summary.analyzedFrames};
                unavailable frames: {summary.unavailableFrames}; nested frames:{" "}
                {summary.nestedFrames}
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
