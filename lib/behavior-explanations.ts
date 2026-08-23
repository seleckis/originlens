import type { BehaviorEvidenceCode } from "./behavior-analysis";

const explanations: Record<BehaviorEvidenceCode, string> = {
  "BEHAVIOR.ACTION_MUTATION":
    "A form action changed after the initial bounded observation.",
  "BEHAVIOR.CANVAS_TEXT_UNOBSERVABLE":
    "Canvas-rendered labels are not readable through the bounded DOM analyzer.",
  "BEHAVIOR.CLICK_TRIGGERED_SENSITIVE_INSERTION":
    "A sensitive field appeared shortly after a user click.",
  "BEHAVIOR.CROSS_ORIGIN_SENSITIVE_ACTION":
    "A sensitive form currently targets another origin.",
  "BEHAVIOR.DELAYED_SENSITIVE_INSERTION":
    "A sensitive field appeared after the delayed-insertion threshold.",
  "BEHAVIOR.IDENTITY_SURFACE_REMOVAL":
    "A visible identity surface such as a logo or header was removed.",
  "BEHAVIOR.LOGIN_SPA_TRANSITION":
    "A same-document navigation occurred while sensitive fields were present.",
  "BEHAVIOR.PERMISSION_OR_CLIPBOARD_CONTROL":
    "A bounded control advertises clipboard or browser-permission behavior; the API request itself is not observable.",
  "BEHAVIOR.RAW_IP_SENSITIVE_ACTION":
    "A sensitive form currently targets a raw IP address.",
  "BEHAVIOR.REQUEST_BODIES_NOT_COLLECTED":
    "Request bodies and entered values are deliberately outside OriginLens visibility.",
  "BEHAVIOR.SUSPICIOUS_DOWNLOAD_CLICK":
    "A clicked link advertised a download or executable-style filename."
};

export function behaviorEvidenceText(code: BehaviorEvidenceCode): string {
  return explanations[code];
}
