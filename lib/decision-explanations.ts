import type {
  DecisionEvidenceCode,
  DecisionState,
  DecisionSummary,
  SensitiveIntent
} from "./decision-policy";

const evidenceText: Record<DecisionEvidenceCode, string> = {
  "POLICY.CAUTION.BEHAVIORAL_CONTEXT":
    "A bounded behavioral or destination-context change merits caution but cannot produce danger by itself.",
  "POLICY.CAUTION.STRONG_MISMATCH":
    "A strong identity claim does not match a verified domain, but sensitive-data intent was not observed.",
  "POLICY.CAUTION.WEAK_URL_SIGNAL":
    "One or more weak URL signals require caution; they are not identity proof.",
  "POLICY.DANGER.THREE_GATES":
    "Danger requires all three explicit gates; no additive score is used.",
  "POLICY.GATE.SENSITIVE_DATA_INTENT":
    "The page structure requests a sensitive data type without reading any field value.",
  "POLICY.GATE.STRONG_IDENTITY_CLAIM":
    "Bounded high-salience evidence strongly claims one registry organization.",
  "POLICY.GATE.VERIFIED_DOMAIN_MISMATCH":
    "The registrable domain has no verified relationship to the claimed organization.",
  "POLICY.NO_STRONG_INDICATORS":
    "The explicit danger gates were not all satisfied and no caution condition was observed.",
  "POLICY.UNKNOWN.INCOMPLETE_VISIBILITY":
    "The page or analysis coverage is unavailable or incomplete."
};

const intentText: Record<SensitiveIntent, string> = {
  card: "payment-card",
  credential: "username/password",
  otp: "one-time-code",
  recovery: "account-recovery",
  "seed-or-private-key": "seed-phrase/private-key"
};

export function decisionHeading(state: DecisionState): string {
  switch (state) {
    case "danger":
      return "Danger";
    case "caution":
      return "Caution";
    case "unknown":
      return "Unknown";
    case "no-strong-indicators":
      return "No strong phishing indicators detected";
  }
}

export function decisionEvidenceText(code: DecisionEvidenceCode): string {
  return evidenceText[code];
}

export function decisionSensitiveIntentText(decision: DecisionSummary): string {
  return decision.sensitiveIntents
    .map((intent) => intentText[intent])
    .join(", ");
}
