export const PROTECTION_CONSENT_KEY = "protectionConsent";
export const PROTECTION_CONSENT_VERSION = 2 as const;

export interface ProtectionConsent {
  enabled: true;
  version: typeof PROTECTION_CONSENT_VERSION;
}

export const enabledProtectionConsent: ProtectionConsent = {
  enabled: true,
  version: PROTECTION_CONSENT_VERSION
};

export function isProtectionConsent(
  value: unknown
): value is ProtectionConsent {
  if (!value || typeof value !== "object") return false;
  const consent = value as Record<string, unknown>;
  return (
    consent.enabled === true && consent.version === PROTECTION_CONSENT_VERSION
  );
}

export async function getProtectionConsent(): Promise<
  ProtectionConsent | undefined
> {
  const stored = await browser.storage.local.get(PROTECTION_CONSENT_KEY);
  const consent = stored[PROTECTION_CONSENT_KEY];
  return isProtectionConsent(consent) ? consent : undefined;
}

export async function isProtectionEnabled(): Promise<boolean> {
  try {
    return Boolean(await getProtectionConsent());
  } catch {
    return false;
  }
}

export async function enableProtection(): Promise<void> {
  await browser.storage.local.set({
    [PROTECTION_CONSENT_KEY]: enabledProtectionConsent
  });
}

export async function disableProtection(): Promise<void> {
  await browser.storage.local.remove(PROTECTION_CONSENT_KEY);
}
