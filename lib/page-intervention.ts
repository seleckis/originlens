import type { DecisionSummary } from "./decision-policy";

type PageInterventionOptions = {
  onBypass: () => Promise<boolean>;
};

export type PageIntervention = {
  destroy: () => void;
  reset: () => void;
  update: (decision: DecisionSummary) => void;
};

const WARNING_HOST_ID = "originlens-high-confidence-warning";
const ATTRIBUTE_CHARACTER_LIMIT = 40;

function boundedAttribute(element: Element, name: string): string {
  return (element.getAttribute(name) ?? "")
    .slice(0, ATTRIBUTE_CHARACTER_LIMIT)
    .toLowerCase();
}

function isSensitiveTarget(document: Document, target: EventTarget | null) {
  const view = document.defaultView;
  if (!view || !(target instanceof view.Element)) return false;
  const field = target.closest("input, textarea");
  if (!field) return false;
  const inputType =
    field instanceof view.HTMLInputElement ? field.type.toLowerCase() : "";
  const structure = ["name", "id", "autocomplete", "aria-label"]
    .map((name) => boundedAttribute(field, name))
    .join(" ");
  return (
    inputType === "password" ||
    /one-time-code|cc-number|cc-exp|cc-csc|\b(otp|verification.?code|authenticator|seed.?phrase|private.?key|recovery.?phrase)\b/.test(
      structure
    )
  );
}

function formHasSensitiveTarget(
  document: Document,
  target: EventTarget | null
) {
  const view = document.defaultView;
  if (!view || !(target instanceof view.HTMLFormElement)) return false;
  return [...target.querySelectorAll("input, textarea")].some((field) =>
    isSensitiveTarget(document, field)
  );
}

function leavePage(document: Document): void {
  const view = document.defaultView;
  if (!view) return;
  if (view.history.length > 1) view.history.back();
  else view.location.replace("about:blank");
}

export function createPageIntervention(
  document: Document,
  options: PageInterventionOptions
): PageIntervention {
  let currentDecision: DecisionSummary | undefined;
  let host: HTMLElement | undefined;
  let dialog: HTMLDialogElement | undefined;
  let previousFocus: HTMLElement | null = null;

  const removeWarning = () => {
    if (dialog?.open) dialog.close();
    host?.remove();
    host = undefined;
    dialog = undefined;
  };

  const showWarning = () => {
    const decision = currentDecision;
    if (!decision || decision.intervention !== "required") return;
    if (host?.isConnected && dialog?.open) return;
    removeWarning();

    const rootElement = document.documentElement;
    if (!rootElement) return;
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    host = document.createElement("div");
    host.id = WARNING_HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      dialog {
        width: min(560px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        overflow: auto;
        box-sizing: border-box;
        border: 3px solid #8f1d1d;
        border-radius: 18px;
        padding: 28px;
        color: #241b1b;
        background: #fffaf7;
        box-shadow: 0 24px 80px rgb(36 0 0 / 45%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
      }
      dialog::backdrop { background: rgb(22 12 12 / 72%); }
      h1 { margin: 0; color: #761717; font-size: 26px; line-height: 1.2; }
      p { margin: 14px 0 0; font-size: 16px; }
      ul { margin: 18px 0 0; padding-left: 22px; }
      li { margin: 8px 0; }
      strong, code { overflow-wrap: anywhere; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
      button {
        min-height: 46px;
        border: 2px solid #761717;
        border-radius: 10px;
        padding: 0 18px;
        color: #761717;
        background: #fff;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }
      button.primary { color: #fff; background: #761717; }
      button:focus-visible { outline: 4px solid #e49a40; outline-offset: 3px; }
      .footnote { color: #594b4b; font-size: 13px; }
    `;

    dialog = document.createElement("dialog");
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "originlens-warning-title");
    dialog.setAttribute("aria-describedby", "originlens-warning-description");

    const title = document.createElement("h1");
    title.id = "originlens-warning-title";
    title.textContent = "Possible phishing page";
    const description = document.createElement("p");
    description.id = "originlens-warning-description";
    description.textContent =
      "OriginLens found three independent warning conditions before sensitive-data entry.";
    const facts = document.createElement("ul");
    const identityFact = document.createElement("li");
    identityFact.textContent = `This page strongly claims to be ${decision.organization ?? "a verified organization"}.`;
    const domainFact = document.createElement("li");
    domainFact.textContent = `The actual registrable domain is ${decision.registrableDomain ?? "unavailable"}, which is not a verified relationship for that organization.`;
    const intentFact = document.createElement("li");
    intentFact.textContent = `The page requests ${decision.sensitiveIntents.join(", ")} data.`;
    facts.append(identityFact, domainFact, intentFact);

    const footnote = document.createElement("p");
    footnote.className = "footnote";
    footnote.textContent =
      "OriginLens does not read field values. Continuing bypasses this warning only for the current navigation.";
    const actions = document.createElement("div");
    actions.className = "actions";
    const leave = document.createElement("button");
    leave.type = "button";
    leave.className = "primary";
    leave.textContent = "Leave this page";
    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.textContent = "Continue anyway";
    actions.append(leave, continueButton);
    dialog.append(title, description, facts, footnote, actions);
    shadow.append(style, dialog);
    rootElement.append(host);

    leave.addEventListener("click", () => leavePage(document));
    continueButton.addEventListener("click", () => {
      void (async () => {
        continueButton.disabled = true;
        const accepted = await options.onBypass().catch(() => false);
        if (!accepted) {
          continueButton.disabled = false;
          return;
        }
        removeWarning();
        previousFocus?.focus();
      })();
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      leavePage(document);
    });

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    leave.focus();
  };

  const guardSensitiveAction = (event: Event) => {
    if (currentDecision?.intervention !== "required") return;
    const guarded =
      event.type === "submit"
        ? formHasSensitiveTarget(document, event.target)
        : isSensitiveTarget(document, event.target);
    if (!guarded) return;
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
    showWarning();
  };

  document.addEventListener("beforeinput", guardSensitiveAction, true);
  document.addEventListener("focusin", guardSensitiveAction, true);
  document.addEventListener("submit", guardSensitiveAction, true);

  const observer = new MutationObserver(() => {
    if (currentDecision?.intervention === "required" && !host?.isConnected)
      showWarning();
  });
  observer.observe(document.documentElement, { childList: true });

  return {
    destroy() {
      observer.disconnect();
      document.removeEventListener("beforeinput", guardSensitiveAction, true);
      document.removeEventListener("focusin", guardSensitiveAction, true);
      document.removeEventListener("submit", guardSensitiveAction, true);
      removeWarning();
    },
    reset() {
      currentDecision = undefined;
      removeWarning();
    },
    update(decision) {
      currentDecision = decision;
      if (decision.intervention === "required") showWarning();
      else removeWarning();
    }
  };
}
