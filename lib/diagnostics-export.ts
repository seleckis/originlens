import type { BehaviorSummary } from "./behavior-analysis";
import type { IdentityAssessment } from "./claimed-identity";
import type { DecisionSummary } from "./decision-policy";
import type { StructuralSummary } from "./dom-analysis";
import type { ResolverStatus } from "./identity-resolver";
import { localMlCapability } from "./ml-capability";

type SanitizedDiagnosticsInputs = {
  behavior?: BehaviorSummary;
  decision?: DecisionSummary;
  identity?: IdentityAssessment;
  resolver?: ResolverStatus;
  structural?: StructuralSummary;
};

export function createSanitizedDiagnostics(
  inputs: SanitizedDiagnosticsInputs
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    privacy: {
      containsFieldValues: false,
      containsPageText: false,
      containsVisitedLocation: false,
      containsHistory: false
    },
    decision: inputs.decision
      ? {
          state: inputs.decision.state,
          gates: inputs.decision.gates,
          evidence: inputs.decision.evidence,
          sensitiveIntents: inputs.decision.sensitiveIntents,
          intervention: inputs.decision.intervention,
          organization: inputs.decision.organization ?? null,
          hasRegistrableDomain: Boolean(inputs.decision.registrableDomain)
        }
      : null,
    identity: inputs.identity
      ? {
          domainStatus: inputs.identity.domainStatus,
          evidence: inputs.identity.evidence,
          identityId: inputs.identity.candidate?.identityId ?? null,
          confidence: inputs.identity.candidate?.confidence ?? null,
          relationship: inputs.identity.relationship ?? null,
          truncated: inputs.identity.summary.truncated
        }
      : null,
    structural: inputs.structural ?? null,
    behavior: inputs.behavior ?? null,
    resolver: inputs.resolver
      ? {
          enabled: inputs.resolver.enabled,
          configured: inputs.resolver.configured,
          outboundFields: inputs.resolver.outboundFields,
          lastResult: inputs.resolver.lastResult ?? null
        }
      : null,
    localMl: localMlCapability
  };
}
