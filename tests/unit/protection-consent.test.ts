import { describe, expect, it } from "vitest";

import {
  enabledProtectionConsent,
  isProtectionConsent,
  PROTECTION_CONSENT_KEY,
  PROTECTION_CONSENT_VERSION
} from "../../lib/protection-consent";

describe("protection consent", () => {
  it("accepts only the current explicit enabled record", () => {
    expect(PROTECTION_CONSENT_KEY).toBe("protectionConsent");
    expect(enabledProtectionConsent).toEqual({
      enabled: true,
      version: PROTECTION_CONSENT_VERSION
    });
    expect(isProtectionConsent(enabledProtectionConsent)).toBe(true);
    expect(isProtectionConsent(undefined)).toBe(false);
    expect(isProtectionConsent({ enabled: false, version: 1 })).toBe(false);
    expect(isProtectionConsent({ enabled: true, version: 0 })).toBe(false);
    expect(isProtectionConsent(true)).toBe(false);
  });
});
