export type StructuralSummary = {
  passwordFields: number;
  usernameFields: number;
  otpFields: number;
  cardFields: number;
  recoveryForms: number;
  seedOrKeyFields: number;
  loginButtons: number;
  crossOriginFormActions: number;
  hiddenCredentialForms: number;
  nestedFrame: boolean;
  scannedNodes: number;
  truncated: boolean;
};

const limit = 500;
const empty = (): StructuralSummary => ({
  passwordFields: 0,
  usernameFields: 0,
  otpFields: 0,
  cardFields: 0,
  recoveryForms: 0,
  seedOrKeyFields: 0,
  loginButtons: 0,
  crossOriginFormActions: 0,
  hiddenCredentialForms: 0,
  nestedFrame: window.top !== window,
  scannedNodes: 0,
  truncated: false
});
const structuralToken = (element: Element) =>
  `${element.getAttribute("name") ?? ""} ${element.getAttribute("id") ?? ""} ${element.getAttribute("autocomplete") ?? ""} ${element.getAttribute("aria-label") ?? ""}`
    .toLowerCase()
    .slice(0, 160);
const hidden = (element: Element) => {
  const style = getComputedStyle(element);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0 ||
    element.hasAttribute("hidden")
  );
};

export function analyzeDocument(document: Document): StructuralSummary {
  const result = empty();
  const fields = [
    ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea"
    )
  ].slice(0, limit);
  result.scannedNodes = fields.length;
  result.truncated =
    document.querySelectorAll("input, textarea").length > limit;
  const credentialForms = new Set<HTMLFormElement>();
  for (const field of fields) {
    if (
      field instanceof HTMLInputElement &&
      field.type === "password" &&
      field.form
    )
      credentialForms.add(field.form);
  }
  for (const button of [
    ...document.querySelectorAll<HTMLElement>("button, input[type=submit]")
  ].slice(0, limit)) {
    const data = structuralToken(button);
    if (/\b(sign.?in|log.?in|continue|verify|confirm)\b/.test(data)) {
      result.loginButtons++;
      if (button.closest("form")) credentialForms.add(button.closest("form")!);
    }
  }
  for (const field of fields) {
    const data = structuralToken(field);
    const form = field.closest("form");
    const isPassword =
      field instanceof HTMLInputElement && field.type === "password";
    if (isPassword) result.passwordFields++;
    if (
      form &&
      credentialForms.has(form) &&
      ((field instanceof HTMLInputElement && field.type === "email") ||
        /\b(username|user-name|email|login)\b/.test(data))
    )
      result.usernameFields++;
    if (/one-time-code|\b(otp|verification.?code|authenticator)\b/.test(data))
      result.otpFields++;
    if (/cc-number|cc-exp|cc-csc|\b(card.?number|cvv|cvc|expiry)\b/.test(data))
      result.cardFields++;
    if (/\b(recover|reset.?password|forgot.?password)\b/.test(data))
      result.recoveryForms++;
    if (/\b(seed.?phrase|private.?key|recovery.?phrase)\b/.test(data))
      result.seedOrKeyFields++;
    if (isPassword && form && hidden(form)) result.hiddenCredentialForms++;
  }
  for (const form of [...document.forms].slice(0, limit)) {
    const action = form.getAttribute("action");
    if (action)
      try {
        if (
          new URL(action, document.location.href).origin !==
          document.location.origin
        )
          result.crossOriginFormActions++;
      } catch {
        /* malformed action is not benign */
      }
  }
  return result;
}

export function isStructuralSummary(
  value: unknown
): value is StructuralSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  const numberFields = [
    "passwordFields",
    "usernameFields",
    "otpFields",
    "cardFields",
    "recoveryForms",
    "seedOrKeyFields",
    "loginButtons",
    "crossOriginFormActions",
    "hiddenCredentialForms",
    "scannedNodes"
  ];
  return (
    numberFields.every(
      (key) =>
        typeof summary[key] === "number" &&
        Number.isInteger(summary[key]) &&
        summary[key] >= 0 &&
        summary[key] <= limit
    ) &&
    typeof summary.nestedFrame === "boolean" &&
    typeof summary.truncated === "boolean"
  );
}
