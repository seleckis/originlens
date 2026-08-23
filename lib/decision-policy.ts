import type { IdentityAssessment } from "./claimed-identity";
import type { BehaviorSummary } from "./behavior-analysis";
import type { StructuralSummary } from "./dom-analysis";
import type { UrlAnalysis } from "./url-analysis";

export type DecisionState =
  "caution" | "danger" | "no-strong-indicators" | "unknown";

export type SensitiveIntent =
  "card" | "credential" | "otp" | "recovery" | "seed-or-private-key";

export type DecisionEvidenceCode =
  | "POLICY.CAUTION.STRONG_MISMATCH"
  | "POLICY.CAUTION.BEHAVIORAL_CONTEXT"
  | "POLICY.CAUTION.WEAK_URL_SIGNAL"
  | "POLICY.DANGER.THREE_GATES"
  | "POLICY.GATE.SENSITIVE_DATA_INTENT"
  | "POLICY.GATE.STRONG_IDENTITY_CLAIM"
  | "POLICY.GATE.VERIFIED_DOMAIN_MISMATCH"
  | "POLICY.NO_STRONG_INDICATORS"
  | "POLICY.UNKNOWN.INCOMPLETE_VISIBILITY";

export type DecisionSummary = {
  version: 1;
  state: DecisionState;
  gates: {
    strongIdentityClaim: boolean;
    sensitiveDataIntent: boolean;
    verifiedDomainMismatch: boolean;
  };
  evidence: DecisionEvidenceCode[];
  sensitiveIntents: SensitiveIntent[];
  intervention: "bypassed" | "not-required" | "required";
  organization?: string;
  registrableDomain?: string;
};

type DecisionInputs = {
  identity: IdentityAssessment | undefined;
  behavior: BehaviorSummary | undefined;
  structural: StructuralSummary | undefined;
  url: UrlAnalysis;
  bypassed?: boolean;
};

const evidenceCodes = new Set<DecisionEvidenceCode>([
  "POLICY.CAUTION.STRONG_MISMATCH",
  "POLICY.CAUTION.BEHAVIORAL_CONTEXT",
  "POLICY.CAUTION.WEAK_URL_SIGNAL",
  "POLICY.DANGER.THREE_GATES",
  "POLICY.GATE.SENSITIVE_DATA_INTENT",
  "POLICY.GATE.STRONG_IDENTITY_CLAIM",
  "POLICY.GATE.VERIFIED_DOMAIN_MISMATCH",
  "POLICY.NO_STRONG_INDICATORS",
  "POLICY.UNKNOWN.INCOMPLETE_VISIBILITY"
]);

const sensitiveIntentValues = new Set<SensitiveIntent>([
  "card",
  "credential",
  "otp",
  "recovery",
  "seed-or-private-key"
]);

function sensitiveIntentsOf(
  structural: StructuralSummary | undefined
): SensitiveIntent[] {
  if (!structural) return [];
  const intents: SensitiveIntent[] = [];
  if (structural.passwordFields > 0 || structural.usernameFields > 0)
    intents.push("credential");
  if (structural.otpFields > 0) intents.push("otp");
  if (structural.cardFields > 0) intents.push("card");
  if (structural.recoveryForms > 0) intents.push("recovery");
  if (structural.seedOrKeyFields > 0) intents.push("seed-or-private-key");
  return intents;
}

export function evaluateDecision(inputs: DecisionInputs): DecisionSummary {
  const sensitiveIntents = sensitiveIntentsOf(inputs.structural);
  const strongIdentityClaim =
    inputs.identity?.candidate?.confidence === "strong";
  const verifiedDomainMismatch =
    strongIdentityClaim && inputs.identity?.domainStatus === "mismatch";
  const sensitiveDataIntent = sensitiveIntents.length > 0;
  const danger =
    strongIdentityClaim && sensitiveDataIntent && verifiedDomainMismatch;
  const incompleteVisibility =
    !inputs.identity ||
    !inputs.structural ||
    inputs.identity.summary.truncated ||
    inputs.structural.coverage === "partial" ||
    inputs.behavior?.coverage === "partial";
  const behavioralContext =
    inputs.behavior?.evidence.some(
      (code) => code !== "BEHAVIOR.REQUEST_BODIES_NOT_COLLECTED"
    ) ?? false;

  const evidence: DecisionEvidenceCode[] = [];
  if (strongIdentityClaim) evidence.push("POLICY.GATE.STRONG_IDENTITY_CLAIM");
  if (sensitiveDataIntent) evidence.push("POLICY.GATE.SENSITIVE_DATA_INTENT");
  if (verifiedDomainMismatch)
    evidence.push("POLICY.GATE.VERIFIED_DOMAIN_MISMATCH");

  let state: DecisionState;
  if (danger) {
    state = "danger";
    evidence.push("POLICY.DANGER.THREE_GATES");
  } else if (verifiedDomainMismatch) {
    state = "caution";
    evidence.push("POLICY.CAUTION.STRONG_MISMATCH");
  } else if (inputs.url.state === "caution") {
    state = "caution";
    evidence.push("POLICY.CAUTION.WEAK_URL_SIGNAL");
  } else if (inputs.url.state === "unknown" || incompleteVisibility) {
    state = "unknown";
    evidence.push("POLICY.UNKNOWN.INCOMPLETE_VISIBILITY");
  } else if (behavioralContext) {
    state = "caution";
    evidence.push("POLICY.CAUTION.BEHAVIORAL_CONTEXT");
  } else {
    state = "no-strong-indicators";
    evidence.push("POLICY.NO_STRONG_INDICATORS");
  }

  return {
    version: 1,
    state,
    gates: {
      strongIdentityClaim,
      sensitiveDataIntent,
      verifiedDomainMismatch
    },
    evidence,
    sensitiveIntents,
    intervention: danger
      ? inputs.bypassed
        ? "bypassed"
        : "required"
      : "not-required",
    ...(inputs.identity?.organization
      ? { organization: inputs.identity.organization }
      : {}),
    ...(inputs.identity?.registrableDomain
      ? { registrableDomain: inputs.identity.registrableDomain }
      : {})
  };
}

export function isDecisionSummary(value: unknown): value is DecisionSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  const gates = summary.gates as Record<string, unknown> | undefined;
  return (
    summary.version === 1 &&
    ["caution", "danger", "no-strong-indicators", "unknown"].includes(
      String(summary.state)
    ) &&
    !!gates &&
    typeof gates.strongIdentityClaim === "boolean" &&
    typeof gates.sensitiveDataIntent === "boolean" &&
    typeof gates.verifiedDomainMismatch === "boolean" &&
    Array.isArray(summary.evidence) &&
    summary.evidence.length > 0 &&
    summary.evidence.length <= 4 &&
    summary.evidence.every((code) =>
      evidenceCodes.has(code as DecisionEvidenceCode)
    ) &&
    Array.isArray(summary.sensitiveIntents) &&
    summary.sensitiveIntents.length <= sensitiveIntentValues.size &&
    summary.sensitiveIntents.every((intent) =>
      sensitiveIntentValues.has(intent as SensitiveIntent)
    ) &&
    ["bypassed", "not-required", "required"].includes(
      String(summary.intervention)
    ) &&
    (summary.organization === undefined ||
      (typeof summary.organization === "string" &&
        summary.organization.length <= 160)) &&
    (summary.registrableDomain === undefined ||
      (typeof summary.registrableDomain === "string" &&
        summary.registrableDomain.length <= 253))
  );
}
