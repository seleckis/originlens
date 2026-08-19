import { describe, expect, it } from "vitest";
import { analyzeDocument } from "../../lib/dom-analysis";

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
      '<form hidden><input type="password"></form><form><input autocomplete="one-time-code"><textarea name="seed-phrase"></textarea></form>';
    const summary = analyzeDocument(document);
    expect(summary.hiddenCredentialForms).toBe(1);
    expect(summary.otpFields).toBe(1);
    expect(summary.seedOrKeyFields).toBe(1);
  });
});
