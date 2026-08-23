export const localMlCapability = {
  version: 1,
  included: false,
  enabled: false,
  decision: "not-justified" as const,
  reason:
    "Measured fixture gaps identify missing visual/text visibility and registry coverage, but no representative, licensed, temporally separated training and evaluation corpus exists yet.",
  deterministicFallback: true,
  modelBytes: 0,
  runtimeDependencies: [] as const
};
