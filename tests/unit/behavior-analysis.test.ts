import { beforeEach, describe, expect, it } from "vitest";
import {
  combineFrameBehaviorSummaries,
  createBehaviorTracker,
  isBehaviorSummary,
  isFrameBehaviorSummary
} from "../../lib/behavior-analysis";

function childListRecord(removedNodes: Node[] = []): MutationRecord {
  return {
    type: "childList",
    removedNodes
  } as unknown as MutationRecord;
}

describe("bounded behavioral analysis", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("detects delayed and click-triggered sensitive insertion without values", () => {
    let elapsed = 0;
    document.body.innerHTML = '<button id="reveal">Continue</button>';
    const tracker = createBehaviorTracker(document, { now: () => elapsed });
    tracker.observeClick(document.querySelector("button"));
    elapsed = 1_000;
    document.body.insertAdjacentHTML(
      "beforeend",
      '<form><input type="password" value="never-read"></form>'
    );
    const password = document.querySelector<HTMLInputElement>("input")!;
    Object.defineProperty(password, "value", {
      get: () => {
        throw new Error("Behavior analysis must not read values");
      }
    });
    tracker.observeMutations([childListRecord()]);
    const summary = tracker.current();
    expect(summary.delayedSensitiveInsertions).toBe(1);
    expect(summary.clickTriggeredSensitiveInsertions).toBe(1);
    expect(summary.evidence).toEqual(
      expect.arrayContaining([
        "BEHAVIOR.DELAYED_SENSITIVE_INSERTION",
        "BEHAVIOR.CLICK_TRIGGERED_SENSITIVE_INSERTION"
      ])
    );
    expect(JSON.stringify(summary)).not.toContain("never-read");
  });

  it("reports action mutation and bounded sensitive destinations", () => {
    document.body.innerHTML = `
      <form action="/local"><input type="password"></form>
      <button id="request-clipboard" aria-label="Request clipboard permission"></button>
    `;
    const tracker = createBehaviorTracker(document);
    document
      .querySelector("form")!
      .setAttribute("action", "http://127.0.0.1/collect");
    tracker.observeMutations([
      {
        type: "attributes",
        attributeName: "action",
        target: document.querySelector("form")!
      } as unknown as MutationRecord
    ]);
    const summary = tracker.current();
    expect(summary).toMatchObject({
      actionMutations: 1,
      crossOriginSensitiveActions: 1,
      rawIpSensitiveActions: 1,
      permissionOrClipboardControls: 1
    });
    expect(summary.evidence).toEqual(
      expect.arrayContaining([
        "BEHAVIOR.ACTION_MUTATION",
        "BEHAVIOR.CROSS_ORIGIN_SENSITIVE_ACTION",
        "BEHAVIOR.RAW_IP_SENSITIVE_ACTION",
        "BEHAVIOR.PERMISSION_OR_CLIPBOARD_CONTROL"
      ])
    );
  });

  it("detects suspicious download clicks, SPA login transitions, and identity removal", () => {
    document.body.innerHTML = `
      <header id="brand"><img alt="Example logo"></header>
      <form><input type="password"></form>
      <a href="/security-update.exe">Download</a>
    `;
    const tracker = createBehaviorTracker(document);
    tracker.observeClick(document.querySelector("a"));
    tracker.observeSpaNavigation();
    const header = document.querySelector("header")!;
    header.remove();
    tracker.observeMutations([childListRecord([header])]);
    expect(tracker.current()).toMatchObject({
      suspiciousDownloadClicks: 1,
      loginSpaTransitions: 1,
      identitySurfaceRemovals: 1
    });
  });

  it("does not flag ordinary downloads or non-sensitive action changes", () => {
    document.body.innerHTML = `
      <form action="/newsletter"><input type="email"></form>
      <a href="/annual-report.pdf" download>Annual report</a>
    `;
    const tracker = createBehaviorTracker(document);
    const form = document.querySelector("form")!;
    form.setAttribute("action", "/newsletter/subscribe");
    tracker.observeMutations([
      {
        type: "attributes",
        attributeName: "action",
        target: form
      } as unknown as MutationRecord
    ]);
    tracker.observeClick(document.querySelector("a"));

    expect(tracker.current()).toMatchObject({
      actionMutations: 0,
      suspiciousDownloadClicks: 0
    });
  });

  it("marks canvas identity visibility partial and validates aggregates", () => {
    document.body.innerHTML = "<canvas></canvas>";
    const frame = createBehaviorTracker(document).current();
    const aggregate = combineFrameBehaviorSummaries([frame]);
    expect(frame.evidence).toContain("BEHAVIOR.CANVAS_TEXT_UNOBSERVABLE");
    expect(aggregate.coverage).toBe("partial");
    expect(isFrameBehaviorSummary(frame)).toBe(true);
    expect(isBehaviorSummary(aggregate)).toBe(true);
    expect(
      isFrameBehaviorSummary({
        ...frame,
        delayedSensitiveInsertions: 65
      })
    ).toBe(false);
  });
});
