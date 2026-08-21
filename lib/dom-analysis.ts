export const STRUCTURAL_NODE_LIMIT = 500;
export const STRUCTURAL_FRAME_LIMIT = 32;

export type StructuralEvidenceCode =
  | "STRUCTURAL.CLOSED_SHADOW_ROOTS_UNOBSERVABLE"
  | "STRUCTURAL.FRAME_ENUMERATION_UNAVAILABLE"
  | "STRUCTURAL.FRAME_LIMIT_REACHED"
  | "STRUCTURAL.FRAME_UNAVAILABLE"
  | "STRUCTURAL.INVALID_FORM_ACTION"
  | "STRUCTURAL.OVERLAY_CREDENTIAL_FORM"
  | "STRUCTURAL.SCAN_TRUNCATED"
  | "STRUCTURAL.VISIBILITY_TRAVERSAL_TRUNCATED";

export type FrameStructuralSummary = {
  passwordFields: number;
  usernameFields: number;
  otpFields: number;
  cardFields: number;
  recoveryForms: number;
  seedOrKeyFields: number;
  loginButtons: number;
  crossOriginFormActions: number;
  invalidFormActions: number;
  hiddenCredentialForms: number;
  overlayCredentialForms: number;
  visibilityUnknownCredentialForms: number;
  observedFrameElements: number;
  spaNavigationsObserved: number;
  nestedFrame: boolean;
  scannedNodes: number;
  truncated: boolean;
};

export type StructuralSummary = Omit<FrameStructuralSummary, "nestedFrame"> & {
  analyzedFrames: number;
  unavailableFrames: number;
  nestedFrames: number;
  coverage: "bounded" | "partial";
  evidence: StructuralEvidenceCode[];
};

export type AnalyzeDocumentOptions = {
  nestedFrame?: boolean;
  spaNavigationsObserved?: number;
};

const ATTRIBUTE_CHARACTER_LIMIT = 40;
const FORM_ACTION_CHARACTER_LIMIT = 2048;
const VISIBILITY_ANCESTOR_LIMIT = 16;
const AGGREGATE_COUNT_LIMIT = STRUCTURAL_NODE_LIMIT * STRUCTURAL_FRAME_LIMIT;

function emptyFrameSummary(
  options: AnalyzeDocumentOptions
): FrameStructuralSummary {
  return {
    passwordFields: 0,
    usernameFields: 0,
    otpFields: 0,
    cardFields: 0,
    recoveryForms: 0,
    seedOrKeyFields: 0,
    loginButtons: 0,
    crossOriginFormActions: 0,
    invalidFormActions: 0,
    hiddenCredentialForms: 0,
    overlayCredentialForms: 0,
    visibilityUnknownCredentialForms: 0,
    observedFrameElements: 0,
    spaNavigationsObserved: Math.min(
      STRUCTURAL_NODE_LIMIT,
      Math.max(0, options.spaNavigationsObserved ?? 0)
    ),
    nestedFrame: options.nestedFrame ?? window.top !== window,
    scannedNodes: 0,
    truncated: false
  };
}

function boundedElements<T extends Element>(
  collection: ArrayLike<T>,
  maximum = STRUCTURAL_NODE_LIMIT
): { items: T[]; truncated: boolean } {
  const length = Math.min(collection.length, maximum);
  const items: T[] = [];
  for (let index = 0; index < length; index++) {
    const item = collection[index];
    if (item) items.push(item);
  }
  return { items, truncated: collection.length > maximum };
}

function boundedAttribute(element: Element, name: string): string {
  return (element.getAttribute(name) ?? "").slice(0, ATTRIBUTE_CHARACTER_LIMIT);
}

function structuralToken(element: Element): string {
  return ["name", "id", "autocomplete", "aria-label"]
    .map((name) => boundedAttribute(element, name))
    .join(" ")
    .toLowerCase();
}

type VisibilityContext = {
  hidden: boolean;
  overlay: boolean;
  traversalTruncated: boolean;
};

function visibilityContext(element: Element): VisibilityContext {
  let current: Element | null = element;
  let depth = 0;
  let hidden = false;
  let overlay = false;

  while (current && depth < VISIBILITY_ANCESTOR_LIMIT) {
    const style = getComputedStyle(current);
    hidden ||=
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0 ||
      current.hasAttribute("hidden") ||
      current.getAttribute("aria-hidden") === "true";

    const zIndex = Number.parseInt(style.zIndex, 10);
    overlay ||=
      (style.position === "fixed" || style.position === "sticky") &&
      (Number.isNaN(zIndex) || zIndex >= 10);

    current = current.parentElement;
    depth++;
  }

  return {
    hidden,
    overlay,
    traversalTruncated: current !== null
  };
}

function isInput(
  field: HTMLInputElement | HTMLTextAreaElement
): field is HTMLInputElement {
  return field instanceof HTMLInputElement;
}

function isSubmitControl(element: HTMLElement): boolean {
  if (element instanceof HTMLButtonElement) return element.type === "submit";
  return element instanceof HTMLInputElement && element.type === "submit";
}

export function analyzeDocument(
  document: Document,
  options: AnalyzeDocumentOptions = {}
): FrameStructuralSummary {
  const result = emptyFrameSummary(options);
  const fieldsResult = boundedElements(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea"
    )
  );
  const buttonsResult = boundedElements(
    document.querySelectorAll<HTMLElement>("button, input[type=submit]")
  );
  const formsResult = boundedElements(document.forms);
  const framesResult = boundedElements(
    document.querySelectorAll<HTMLIFrameElement | HTMLFrameElement>(
      "iframe, frame"
    )
  );
  const fields = fieldsResult.items;
  const buttons = buttonsResult.items;
  const credentialForms = new Set<HTMLFormElement>();

  result.scannedNodes = fields.length;
  result.observedFrameElements = framesResult.items.length;
  result.truncated =
    fieldsResult.truncated ||
    buttonsResult.truncated ||
    formsResult.truncated ||
    framesResult.truncated;

  for (const field of fields) {
    const data = structuralToken(field);
    const form = field.closest("form");
    const password = isInput(field) && field.type === "password";
    const otp = /one-time-code|\b(otp|verification.?code|authenticator)\b/.test(
      data
    );

    if (password) result.passwordFields++;
    if (otp) result.otpFields++;
    if (/cc-number|cc-exp|cc-csc|\b(card.?number|cvv|cvc|expiry)\b/.test(data))
      result.cardFields++;
    if (/\b(recover|reset.?password|forgot.?password)\b/.test(data))
      result.recoveryForms++;
    if (/\b(seed.?phrase|private.?key|recovery.?phrase)\b/.test(data))
      result.seedOrKeyFields++;
    if (form && (password || otp)) credentialForms.add(form);
  }

  for (const button of buttons) {
    const form = button.closest("form");
    const namedLoginControl =
      /\b(sign.?in|log.?in|continue|verify|confirm)\b/.test(
        structuralToken(button)
      );
    if (namedLoginControl && form) credentialForms.add(form);
    if (
      namedLoginControl ||
      (form && credentialForms.has(form) && isSubmitControl(button))
    )
      result.loginButtons++;
  }

  for (const field of fields) {
    const form = field.closest("form");
    if (
      form &&
      credentialForms.has(form) &&
      ((isInput(field) && field.type === "email") ||
        /\b(username|user-name|email|login)\b/.test(structuralToken(field)))
    )
      result.usernameFields++;
  }

  for (const form of credentialForms) {
    const visibility = visibilityContext(form);
    if (visibility.hidden) result.hiddenCredentialForms++;
    if (visibility.overlay) result.overlayCredentialForms++;
    if (visibility.traversalTruncated)
      result.visibilityUnknownCredentialForms++;
  }

  for (const form of formsResult.items) {
    const action = form.getAttribute("action");
    if (!action) continue;
    if (action.length > FORM_ACTION_CHARACTER_LIMIT) {
      result.invalidFormActions++;
      continue;
    }
    try {
      if (
        new URL(action, document.location.href).origin !==
        document.location.origin
      )
        result.crossOriginFormActions++;
    } catch {
      result.invalidFormActions++;
    }
  }

  return result;
}

const frameNumberFields = [
  "passwordFields",
  "usernameFields",
  "otpFields",
  "cardFields",
  "recoveryForms",
  "seedOrKeyFields",
  "loginButtons",
  "crossOriginFormActions",
  "invalidFormActions",
  "hiddenCredentialForms",
  "overlayCredentialForms",
  "visibilityUnknownCredentialForms",
  "observedFrameElements",
  "spaNavigationsObserved",
  "scannedNodes"
] as const satisfies readonly (keyof FrameStructuralSummary)[];

export function isFrameStructuralSummary(
  value: unknown
): value is FrameStructuralSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  return (
    frameNumberFields.every(
      (key) =>
        typeof summary[key] === "number" &&
        Number.isInteger(summary[key]) &&
        summary[key] >= 0 &&
        summary[key] <= STRUCTURAL_NODE_LIMIT
    ) &&
    typeof summary.nestedFrame === "boolean" &&
    typeof summary.truncated === "boolean"
  );
}

function addBounded(current: number, addition: number): number {
  return Math.min(AGGREGATE_COUNT_LIMIT, current + addition);
}

export function combineFrameStructuralSummaries(
  frames: readonly FrameStructuralSummary[],
  options: {
    enumerationUnavailable?: boolean;
    frameLimitReached?: boolean;
    unavailableFrames?: number;
  } = {}
): StructuralSummary {
  const empty = emptyFrameSummary({ nestedFrame: false });
  const combined: StructuralSummary = {
    passwordFields: empty.passwordFields,
    usernameFields: empty.usernameFields,
    otpFields: empty.otpFields,
    cardFields: empty.cardFields,
    recoveryForms: empty.recoveryForms,
    seedOrKeyFields: empty.seedOrKeyFields,
    loginButtons: empty.loginButtons,
    crossOriginFormActions: empty.crossOriginFormActions,
    invalidFormActions: empty.invalidFormActions,
    hiddenCredentialForms: empty.hiddenCredentialForms,
    overlayCredentialForms: empty.overlayCredentialForms,
    visibilityUnknownCredentialForms: empty.visibilityUnknownCredentialForms,
    observedFrameElements: empty.observedFrameElements,
    spaNavigationsObserved: empty.spaNavigationsObserved,
    scannedNodes: empty.scannedNodes,
    truncated: false,
    analyzedFrames: Math.min(STRUCTURAL_FRAME_LIMIT, frames.length),
    unavailableFrames: Math.min(
      STRUCTURAL_FRAME_LIMIT,
      Math.max(0, options.unavailableFrames ?? 0)
    ),
    nestedFrames: 0,
    coverage: "bounded",
    evidence: ["STRUCTURAL.CLOSED_SHADOW_ROOTS_UNOBSERVABLE"]
  };

  for (const frame of frames.slice(0, STRUCTURAL_FRAME_LIMIT)) {
    for (const field of frameNumberFields)
      combined[field] = addBounded(combined[field], frame[field]);
    if (frame.nestedFrame) combined.nestedFrames++;
    combined.truncated ||= frame.truncated;
  }

  const evidence = new Set<StructuralEvidenceCode>(combined.evidence);
  if (combined.truncated) evidence.add("STRUCTURAL.SCAN_TRUNCATED");
  if (combined.invalidFormActions > 0)
    evidence.add("STRUCTURAL.INVALID_FORM_ACTION");
  if (combined.overlayCredentialForms > 0)
    evidence.add("STRUCTURAL.OVERLAY_CREDENTIAL_FORM");
  if (combined.visibilityUnknownCredentialForms > 0)
    evidence.add("STRUCTURAL.VISIBILITY_TRAVERSAL_TRUNCATED");
  if (combined.unavailableFrames > 0)
    evidence.add("STRUCTURAL.FRAME_UNAVAILABLE");
  if (options.enumerationUnavailable)
    evidence.add("STRUCTURAL.FRAME_ENUMERATION_UNAVAILABLE");
  if (options.frameLimitReached) evidence.add("STRUCTURAL.FRAME_LIMIT_REACHED");

  combined.evidence = [...evidence];
  combined.coverage = combined.evidence.some((code) =>
    [
      "STRUCTURAL.FRAME_ENUMERATION_UNAVAILABLE",
      "STRUCTURAL.FRAME_LIMIT_REACHED",
      "STRUCTURAL.FRAME_UNAVAILABLE",
      "STRUCTURAL.SCAN_TRUNCATED",
      "STRUCTURAL.VISIBILITY_TRAVERSAL_TRUNCATED"
    ].includes(code)
  )
    ? "partial"
    : "bounded";
  return combined;
}

export function isStructuralSummary(
  value: unknown
): value is StructuralSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  const aggregateNumberFields = [
    ...frameNumberFields,
    "analyzedFrames",
    "unavailableFrames",
    "nestedFrames"
  ];
  return (
    aggregateNumberFields.every(
      (key) =>
        typeof summary[key] === "number" &&
        Number.isInteger(summary[key]) &&
        summary[key] >= 0 &&
        summary[key] <= AGGREGATE_COUNT_LIMIT
    ) &&
    typeof summary.truncated === "boolean" &&
    (summary.coverage === "bounded" || summary.coverage === "partial") &&
    Array.isArray(summary.evidence) &&
    summary.evidence.length <= 8 &&
    summary.evidence.every((code) =>
      [
        "STRUCTURAL.CLOSED_SHADOW_ROOTS_UNOBSERVABLE",
        "STRUCTURAL.FRAME_ENUMERATION_UNAVAILABLE",
        "STRUCTURAL.FRAME_LIMIT_REACHED",
        "STRUCTURAL.FRAME_UNAVAILABLE",
        "STRUCTURAL.INVALID_FORM_ACTION",
        "STRUCTURAL.OVERLAY_CREDENTIAL_FORM",
        "STRUCTURAL.SCAN_TRUNCATED",
        "STRUCTURAL.VISIBILITY_TRAVERSAL_TRUNCATED"
      ].includes(String(code))
    )
  );
}
