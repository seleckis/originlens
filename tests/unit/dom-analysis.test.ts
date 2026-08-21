import { describe, expect, it } from "vitest";
import {
  analyzeDocument,
  combineFrameStructuralSummaries,
  isFrameStructuralSummary,
  isStructuralSummary
} from "../../lib/dom-analysis";

describe("analyzeDocument", () => {
  it("classifies sensitive form structure without reading a field value", () => {
    document.body.innerHTML =
      '<form action="https://evil.test/collect"><input type="email" autocomplete="username"><input type="password" value="never-read"><button name="sign-in">Sign in</button></form>';
    const password = document.querySelector<HTMLInputElement>(
      "input[type=password]"
    );
    Object.defineProperty(password!, "value", {
      get: () => {
        throw new Error("Field values must never be read");
      }
    });
    const summary = analyzeDocument(document);
    expect(summary.passwordFields).toBe(1);
    expect(summary.usernameFields).toBe(1);
    expect(summary.loginButtons).toBe(1);
    expect(summary.crossOriginFormActions).toBe(1);
  });
  it("does not classify ordinary newsletter and search controls as credentials", () => {
    document.body.innerHTML =
      '<form><input type="search" name="query"><input type="email" name="newsletter-email"><button>Subscribe</button></form>';
    const summary = analyzeDocument(document);
    expect(summary.passwordFields).toBe(0);
    expect(summary.usernameFields).toBe(0);
    expect(summary.loginButtons).toBe(0);
  });

  it("reports hidden and dynamically available credential structure deterministically", () => {
    document.body.innerHTML =
      '<div hidden><form><input type="password"></form></div><form><input autocomplete="one-time-code"><textarea name="seed-phrase"></textarea></form>';
    const summary = analyzeDocument(document);
    expect(summary.hiddenCredentialForms).toBe(1);
    expect(summary.otpFields).toBe(1);
    expect(summary.seedOrKeyFields).toBe(1);
  });

  it("reports overlay forms, malformed actions, frames, and bounded SPA facts", () => {
    document.body.innerHTML =
      '<form action="https://[invalid" style="position: fixed; z-index: 100"><input type="password"><button type="submit">Continue</button></form><iframe></iframe>';
    const summary = analyzeDocument(document, {
      nestedFrame: true,
      spaNavigationsObserved: 2
    });
    expect(summary.overlayCredentialForms).toBe(1);
    expect(summary.invalidFormActions).toBe(1);
    expect(summary.observedFrameElements).toBe(1);
    expect(summary.spaNavigationsObserved).toBe(2);
    expect(summary.nestedFrame).toBe(true);
  });

  it("bounds hostile attributes before classification", () => {
    document.body.innerHTML = `<form><input type="password"><input name="${"x".repeat(
      100_000
    )}username"><button type="submit"></button></form>`;
    const summary = analyzeDocument(document);
    expect(summary.passwordFields).toBe(1);
    expect(summary.usernameFields).toBe(0);
    expect(summary.loginButtons).toBe(1);
  });

  it("aggregates frame summaries and makes visibility limits explicit", () => {
    document.body.innerHTML =
      '<form style="position: fixed; z-index: 50"><input type="password"></form>';
    const top = analyzeDocument(document);
    const nested = analyzeDocument(document, { nestedFrame: true });
    const summary = combineFrameStructuralSummaries([top, nested], {
      unavailableFrames: 1
    });

    expect(summary.passwordFields).toBe(2);
    expect(summary.analyzedFrames).toBe(2);
    expect(summary.nestedFrames).toBe(1);
    expect(summary.coverage).toBe("partial");
    expect(summary.evidence).toContain("STRUCTURAL.FRAME_UNAVAILABLE");
    expect(summary.evidence).toContain(
      "STRUCTURAL.CLOSED_SHADOW_ROOTS_UNOBSERVABLE"
    );
    expect(summary.evidence).toContain("STRUCTURAL.OVERLAY_CREDENTIAL_FORM");
    expect(isFrameStructuralSummary(top)).toBe(true);
    expect(isStructuralSummary(summary)).toBe(true);
  });
});
