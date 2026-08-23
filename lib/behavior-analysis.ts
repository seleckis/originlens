export const BEHAVIOR_EVENT_LIMIT = 64;
export const BEHAVIOR_FRAME_LIMIT = 32;
export const DELAYED_INSERTION_MS = 750;

export type BehaviorEvidenceCode =
  | "BEHAVIOR.ACTION_MUTATION"
  | "BEHAVIOR.CANVAS_TEXT_UNOBSERVABLE"
  | "BEHAVIOR.CLICK_TRIGGERED_SENSITIVE_INSERTION"
  | "BEHAVIOR.CROSS_ORIGIN_SENSITIVE_ACTION"
  | "BEHAVIOR.DELAYED_SENSITIVE_INSERTION"
  | "BEHAVIOR.IDENTITY_SURFACE_REMOVAL"
  | "BEHAVIOR.LOGIN_SPA_TRANSITION"
  | "BEHAVIOR.PERMISSION_OR_CLIPBOARD_CONTROL"
  | "BEHAVIOR.RAW_IP_SENSITIVE_ACTION"
  | "BEHAVIOR.REQUEST_BODIES_NOT_COLLECTED"
  | "BEHAVIOR.SUSPICIOUS_DOWNLOAD_CLICK";

export type FrameBehaviorSummary = {
  version: 1;
  actionMutations: number;
  canvasElements: number;
  clickTriggeredSensitiveInsertions: number;
  crossOriginSensitiveActions: number;
  delayedSensitiveInsertions: number;
  identitySurfaceRemovals: number;
  loginSpaTransitions: number;
  permissionOrClipboardControls: number;
  rawIpSensitiveActions: number;
  suspiciousDownloadClicks: number;
  nestedFrame: boolean;
  evidence: BehaviorEvidenceCode[];
};

export type BehaviorSummary = Omit<FrameBehaviorSummary, "nestedFrame"> & {
  analyzedFrames: number;
  nestedFrames: number;
  coverage: "bounded" | "partial";
};

export type BehaviorTracker = {
  current: () => FrameBehaviorSummary;
  observeClick: (target: EventTarget | null) => void;
  observeMutations: (records: readonly MutationRecord[]) => void;
  observeSpaNavigation: () => void;
};

type TrackerOptions = {
  nestedFrame?: boolean;
  now?: () => number;
};

const ATTRIBUTE_CHARACTER_LIMIT = 80;
const URL_CHARACTER_LIMIT = 2048;
const suspiciousDownloadPattern =
  /\.(?:apk|bat|cmd|com|dmg|exe|iso|jar|msi|pkg|ps1|scr)(?:$|[?#])/i;

const numberFields = [
  "actionMutations",
  "canvasElements",
  "clickTriggeredSensitiveInsertions",
  "crossOriginSensitiveActions",
  "delayedSensitiveInsertions",
  "identitySurfaceRemovals",
  "loginSpaTransitions",
  "permissionOrClipboardControls",
  "rawIpSensitiveActions",
  "suspiciousDownloadClicks"
] as const satisfies readonly (keyof FrameBehaviorSummary)[];

const evidenceCodes = new Set<BehaviorEvidenceCode>([
  "BEHAVIOR.ACTION_MUTATION",
  "BEHAVIOR.CANVAS_TEXT_UNOBSERVABLE",
  "BEHAVIOR.CLICK_TRIGGERED_SENSITIVE_INSERTION",
  "BEHAVIOR.CROSS_ORIGIN_SENSITIVE_ACTION",
  "BEHAVIOR.DELAYED_SENSITIVE_INSERTION",
  "BEHAVIOR.IDENTITY_SURFACE_REMOVAL",
  "BEHAVIOR.LOGIN_SPA_TRANSITION",
  "BEHAVIOR.PERMISSION_OR_CLIPBOARD_CONTROL",
  "BEHAVIOR.RAW_IP_SENSITIVE_ACTION",
  "BEHAVIOR.REQUEST_BODIES_NOT_COLLECTED",
  "BEHAVIOR.SUSPICIOUS_DOWNLOAD_CLICK"
]);

function boundedIncrement(value: number, addition = 1): number {
  return Math.min(BEHAVIOR_EVENT_LIMIT, value + addition);
}

function structuralToken(element: Element): string {
  return ["name", "id", "autocomplete", "aria-label"]
    .map((name) =>
      (element.getAttribute(name) ?? "").slice(0, ATTRIBUTE_CHARACTER_LIMIT)
    )
    .join(" ")
    .toLowerCase();
}

function isSensitiveField(field: Element): boolean {
  const type =
    field instanceof HTMLInputElement ? field.type.toLowerCase() : "";
  return (
    type === "password" ||
    /one-time-code|cc-number|cc-exp|cc-csc|\b(otp|verification.?code|authenticator|recover|seed.?phrase|private.?key|recovery.?phrase)\b/.test(
      structuralToken(field)
    )
  );
}

function sensitiveFieldCount(document: Document): number {
  return [...document.querySelectorAll("input, textarea")]
    .slice(0, BEHAVIOR_EVENT_LIMIT)
    .filter(isSensitiveField).length;
}

function isIpHostname(hostname: string): boolean {
  return hostname.includes(":") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function sensitiveDestinations(document: Document): {
  crossOrigin: number;
  rawIp: number;
} {
  let crossOrigin = 0;
  let rawIp = 0;
  for (const form of [...document.forms].slice(0, BEHAVIOR_EVENT_LIMIT)) {
    if (
      ![...form.querySelectorAll("input, textarea")]
        .slice(0, BEHAVIOR_EVENT_LIMIT)
        .some(isSensitiveField)
    )
      continue;
    const action = form.getAttribute("action");
    if (!action || action.length > URL_CHARACTER_LIMIT) continue;
    try {
      const destination = new URL(action, document.location.href);
      if (destination.origin !== document.location.origin)
        crossOrigin = boundedIncrement(crossOrigin);
      if (isIpHostname(destination.hostname)) rawIp = boundedIncrement(rawIp);
    } catch {
      /* Invalid actions are already represented by structural evidence. */
    }
  }
  return { crossOrigin, rawIp };
}

function permissionOrClipboardControlCount(document: Document): number {
  return [...document.querySelectorAll("button, [role=button]")]
    .slice(0, BEHAVIOR_EVENT_LIMIT)
    .filter((element) =>
      /\b(camera|clipboard|copy|geolocation|location|microphone|notification|permission)\b/.test(
        structuralToken(element)
      )
    ).length;
}

function evidenceFor(summary: FrameBehaviorSummary): BehaviorEvidenceCode[] {
  const evidence: BehaviorEvidenceCode[] = [
    "BEHAVIOR.REQUEST_BODIES_NOT_COLLECTED"
  ];
  if (summary.actionMutations > 0) evidence.push("BEHAVIOR.ACTION_MUTATION");
  if (summary.canvasElements > 0)
    evidence.push("BEHAVIOR.CANVAS_TEXT_UNOBSERVABLE");
  if (summary.clickTriggeredSensitiveInsertions > 0)
    evidence.push("BEHAVIOR.CLICK_TRIGGERED_SENSITIVE_INSERTION");
  if (summary.crossOriginSensitiveActions > 0)
    evidence.push("BEHAVIOR.CROSS_ORIGIN_SENSITIVE_ACTION");
  if (summary.delayedSensitiveInsertions > 0)
    evidence.push("BEHAVIOR.DELAYED_SENSITIVE_INSERTION");
  if (summary.identitySurfaceRemovals > 0)
    evidence.push("BEHAVIOR.IDENTITY_SURFACE_REMOVAL");
  if (summary.loginSpaTransitions > 0)
    evidence.push("BEHAVIOR.LOGIN_SPA_TRANSITION");
  if (summary.permissionOrClipboardControls > 0)
    evidence.push("BEHAVIOR.PERMISSION_OR_CLIPBOARD_CONTROL");
  if (summary.rawIpSensitiveActions > 0)
    evidence.push("BEHAVIOR.RAW_IP_SENSITIVE_ACTION");
  if (summary.suspiciousDownloadClicks > 0)
    evidence.push("BEHAVIOR.SUSPICIOUS_DOWNLOAD_CLICK");
  return evidence;
}

export function createBehaviorTracker(
  document: Document,
  options: TrackerOptions = {}
): BehaviorTracker {
  const now = options.now ?? (() => performance.now());
  const startedAt = now();
  let lastClickAt = Number.NEGATIVE_INFINITY;
  let previousSensitiveFields = sensitiveFieldCount(document);
  const counts = {
    actionMutations: 0,
    clickTriggeredSensitiveInsertions: 0,
    delayedSensitiveInsertions: 0,
    identitySurfaceRemovals: 0,
    loginSpaTransitions: 0,
    suspiciousDownloadClicks: 0
  };

  const updateSensitiveInsertionCounts = () => {
    const current = sensitiveFieldCount(document);
    const inserted = Math.max(0, current - previousSensitiveFields);
    if (inserted > 0 && now() - startedAt >= DELAYED_INSERTION_MS)
      counts.delayedSensitiveInsertions = boundedIncrement(
        counts.delayedSensitiveInsertions,
        inserted
      );
    if (inserted > 0 && now() - lastClickAt <= 1_500)
      counts.clickTriggeredSensitiveInsertions = boundedIncrement(
        counts.clickTriggeredSensitiveInsertions,
        inserted
      );
    previousSensitiveFields = current;
  };

  return {
    current() {
      updateSensitiveInsertionCounts();
      const destinations = sensitiveDestinations(document);
      const summary: FrameBehaviorSummary = {
        version: 1,
        ...counts,
        canvasElements: Math.min(
          BEHAVIOR_EVENT_LIMIT,
          document.querySelectorAll("canvas").length
        ),
        crossOriginSensitiveActions: destinations.crossOrigin,
        permissionOrClipboardControls:
          permissionOrClipboardControlCount(document),
        rawIpSensitiveActions: destinations.rawIp,
        nestedFrame: options.nestedFrame ?? window.top !== window,
        evidence: []
      };
      summary.evidence = evidenceFor(summary);
      return summary;
    },
    observeClick(target) {
      lastClickAt = now();
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = (anchor.getAttribute("href") ?? "").slice(
        0,
        URL_CHARACTER_LIMIT
      );
      const downloadName = (anchor.getAttribute("download") ?? "").slice(
        0,
        ATTRIBUTE_CHARACTER_LIMIT
      );
      if (
        suspiciousDownloadPattern.test(href) ||
        suspiciousDownloadPattern.test(downloadName)
      )
        counts.suspiciousDownloadClicks = boundedIncrement(
          counts.suspiciousDownloadClicks
        );
    },
    observeMutations(records) {
      for (const record of records.slice(0, BEHAVIOR_EVENT_LIMIT)) {
        if (
          record.type === "attributes" &&
          record.attributeName === "action" &&
          record.target instanceof HTMLFormElement &&
          [...record.target.querySelectorAll("input, textarea")]
            .slice(0, BEHAVIOR_EVENT_LIMIT)
            .some(isSensitiveField)
        )
          counts.actionMutations = boundedIncrement(counts.actionMutations);
        if (record.type !== "childList") continue;
        for (const removed of [...record.removedNodes].slice(
          0,
          BEHAVIOR_EVENT_LIMIT
        )) {
          if (
            removed instanceof Element &&
            (removed.matches(
              '[class*="brand" i], [class*="logo" i], [id*="brand" i], [id*="logo" i]'
            ) ||
              removed.querySelector(
                '[class*="brand" i], [class*="logo" i], [id*="brand" i], [id*="logo" i]'
              ))
          )
            counts.identitySurfaceRemovals = boundedIncrement(
              counts.identitySurfaceRemovals
            );
        }
      }
      updateSensitiveInsertionCounts();
    },
    observeSpaNavigation() {
      if (sensitiveFieldCount(document) > 0)
        counts.loginSpaTransitions = boundedIncrement(
          counts.loginSpaTransitions
        );
    }
  };
}

export function isFrameBehaviorSummary(
  value: unknown
): value is FrameBehaviorSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  return (
    summary.version === 1 &&
    numberFields.every(
      (field) =>
        typeof summary[field] === "number" &&
        Number.isInteger(summary[field]) &&
        summary[field] >= 0 &&
        summary[field] <= BEHAVIOR_EVENT_LIMIT
    ) &&
    typeof summary.nestedFrame === "boolean" &&
    Array.isArray(summary.evidence) &&
    summary.evidence.length <= evidenceCodes.size &&
    summary.evidence.every((code) =>
      evidenceCodes.has(code as BehaviorEvidenceCode)
    )
  );
}

export function combineFrameBehaviorSummaries(
  frames: readonly FrameBehaviorSummary[]
): BehaviorSummary {
  const selected = frames.slice(0, BEHAVIOR_FRAME_LIMIT);
  const combined: BehaviorSummary = {
    version: 1,
    actionMutations: 0,
    canvasElements: 0,
    clickTriggeredSensitiveInsertions: 0,
    crossOriginSensitiveActions: 0,
    delayedSensitiveInsertions: 0,
    identitySurfaceRemovals: 0,
    loginSpaTransitions: 0,
    permissionOrClipboardControls: 0,
    rawIpSensitiveActions: 0,
    suspiciousDownloadClicks: 0,
    analyzedFrames: selected.length,
    nestedFrames: 0,
    coverage: "bounded",
    evidence: []
  };
  const evidence = new Set<BehaviorEvidenceCode>();
  for (const frame of selected) {
    for (const field of numberFields)
      combined[field] = Math.min(
        BEHAVIOR_EVENT_LIMIT * BEHAVIOR_FRAME_LIMIT,
        combined[field] + frame[field]
      );
    if (frame.nestedFrame) combined.nestedFrames++;
    for (const code of frame.evidence) evidence.add(code);
  }
  combined.evidence = [...evidence];
  combined.coverage = evidence.has("BEHAVIOR.CANVAS_TEXT_UNOBSERVABLE")
    ? "partial"
    : "bounded";
  return combined;
}

export function isBehaviorSummary(value: unknown): value is BehaviorSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  return (
    summary.version === 1 &&
    numberFields.every(
      (field) =>
        typeof summary[field] === "number" &&
        Number.isInteger(summary[field]) &&
        summary[field] >= 0 &&
        summary[field] <= BEHAVIOR_EVENT_LIMIT * BEHAVIOR_FRAME_LIMIT
    ) &&
    typeof summary.analyzedFrames === "number" &&
    Number.isInteger(summary.analyzedFrames) &&
    summary.analyzedFrames >= 0 &&
    summary.analyzedFrames <= BEHAVIOR_FRAME_LIMIT &&
    typeof summary.nestedFrames === "number" &&
    Number.isInteger(summary.nestedFrames) &&
    summary.nestedFrames >= 0 &&
    summary.nestedFrames <= BEHAVIOR_FRAME_LIMIT &&
    (summary.coverage === "bounded" || summary.coverage === "partial") &&
    Array.isArray(summary.evidence) &&
    summary.evidence.length <= evidenceCodes.size &&
    summary.evidence.every((code) =>
      evidenceCodes.has(code as BehaviorEvidenceCode)
    )
  );
}
