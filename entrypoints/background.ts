import {
  combineFrameBehaviorSummaries,
  isFrameBehaviorSummary,
  type FrameBehaviorSummary
} from "../lib/behavior-analysis";
import {
  compareClaimToUrl,
  isPageIdentitySummary,
  type IdentityAssessment,
  type PageIdentitySummary
} from "../lib/claimed-identity";
import { evaluateDecision, type DecisionSummary } from "../lib/decision-policy";
import {
  combineFrameStructuralSummaries,
  isFrameStructuralSummary,
  STRUCTURAL_FRAME_LIMIT,
  type FrameStructuralSummary
} from "../lib/dom-analysis";
import {
  createNavigationSummary,
  NAVIGATION_ORIGIN_LIMIT
} from "../lib/navigation-analysis";
import {
  disabledResolverConfig,
  IdentityResolverClient,
  isResolverConfig,
  resolverCandidateMatches,
  type ResolverConfig,
  type ResolverResult,
  type ResolverStatus
} from "../lib/identity-resolver";
import { analyzeUrl } from "../lib/url-analysis";
import {
  getProtectionConsent,
  isProtectionConsent,
  PROTECTION_CONSENT_KEY
} from "../lib/protection-consent";

type NavigationState = {
  committed: boolean;
  failed: boolean;
  origins: string[];
  qualifiers: string[];
};

type TabResolverState = {
  fingerprint: string;
  state: "complete" | "pending";
  result?: ResolverResult;
};

const RESOLVER_CONFIG_KEY = "identityResolverConfig";
const ONBOARDING_PATH = "/onboarding.html";

function originOf(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function appendOrigin(state: NavigationState, rawUrl: string): void {
  const origin = originOf(rawUrl);
  if (!origin || state.origins.at(-1) === origin) return;
  state.origins.push(origin);
  state.origins = state.origins.slice(-NAVIGATION_ORIGIN_LIMIT);
}

const badgePresentation = {
  caution: {
    color: "#9a5b13",
    text: "!",
    title: "OriginLens — caution"
  },
  danger: {
    color: "#a62020",
    text: "!",
    title: "OriginLens — danger: inspect before entering sensitive data"
  },
  "no-strong-indicators": {
    color: "#59645f",
    text: "",
    title: "OriginLens — no strong phishing indicators detected"
  },
  unknown: {
    color: "#59645f",
    text: "?",
    title: "OriginLens — analysis unavailable or incomplete"
  },
  disabled: {
    color: "#59645f",
    text: "",
    title: "OriginLens — protection is off; open OriginLens to enable"
  }
} as const;

export default defineBackground(() => {
  const navigations = new Map<number, NavigationState>();
  const summaries = new Map<number, Map<number, FrameStructuralSummary>>();
  const behaviorSummaries = new Map<
    number,
    Map<number, FrameBehaviorSummary>
  >();
  const identities = new Map<number, PageIdentitySummary>();
  const assessments = new Map<number, IdentityAssessment>();
  const decisions = new Map<number, DecisionSummary>();
  const bypassedTabs = new Set<number>();
  const tabResolverStates = new Map<number, TabResolverState>();
  const resolverClient = new IdentityResolverClient();
  let protectionEnabled = false;
  let resolverConfig: ResolverConfig = disabledResolverConfig;
  let lastResolverResult: ResolverResult | undefined;
  const protectionConsentReady = getProtectionConsent()
    .then((consent) => {
      protectionEnabled = Boolean(consent);
    })
    .catch(() => undefined);
  const resolverConfigReady = browser.storage.local
    .get(RESOLVER_CONFIG_KEY)
    .then((stored) => {
      const configured = stored[RESOLVER_CONFIG_KEY];
      if (isResolverConfig(configured)) resolverConfig = configured;
    })
    .catch(() => undefined);

  const resolverStatus = (): ResolverStatus => {
    let endpointOrigin: string | undefined;
    try {
      endpointOrigin = resolverConfig.endpoint
        ? new URL(resolverConfig.endpoint).origin
        : undefined;
    } catch {
      endpointOrigin = undefined;
    }
    return {
      version: 1,
      enabled: resolverConfig.enabled,
      configured: resolverConfig.enabled && isResolverConfig(resolverConfig),
      outboundFields: ["organization", "locale"],
      ...(endpointOrigin ? { endpointOrigin } : {}),
      ...(lastResolverResult
        ? {
            lastResult: {
              status: lastResolverResult.status,
              evidenceCode: lastResolverResult.evidenceCode,
              organization: lastResolverResult.request.organization,
              locale: lastResolverResult.request.locale,
              candidateCount: lastResolverResult.candidates.length,
              ...(lastResolverResult.expiresAt
                ? { expiresAt: lastResolverResult.expiresAt }
                : {})
            }
          }
        : {})
    };
  };

  const updateBadge = async (
    tabId: number,
    decision: DecisionSummary | undefined
  ) => {
    const presentation = !protectionEnabled
      ? badgePresentation.disabled
      : decision
        ? badgePresentation[decision.state]
        : badgePresentation.unknown;
    await Promise.all([
      browser.action.setBadgeText({ tabId, text: presentation.text }),
      browser.action.setBadgeBackgroundColor({
        tabId,
        color: presentation.color
      }),
      browser.action.setTitle({ tabId, title: presentation.title })
    ]);
  };

  const resolverAssessment = (
    tabId: number,
    identity: IdentityAssessment,
    rawUrl: string | undefined
  ): IdentityAssessment => {
    if (
      !resolverConfig.enabled ||
      identity.domainStatus !== "mismatch" ||
      !identity.organization ||
      !identity.registrableDomain
    )
      return identity;
    const fingerprint = [
      resolverConfig.endpoint,
      resolverConfig.keyId,
      resolverConfig.locale,
      identity.organization,
      identity.registrableDomain
    ].join("\u0000");
    const existing = tabResolverStates.get(tabId);
    if (!existing || existing.fingerprint !== fingerprint) {
      tabResolverStates.set(tabId, { fingerprint, state: "pending" });
      void resolverClient
        .resolve(resolverConfig, identity.organization)
        .then((result) => {
          if (tabResolverStates.get(tabId)?.fingerprint !== fingerprint) return;
          lastResolverResult = result;
          tabResolverStates.set(tabId, {
            fingerprint,
            state: "complete",
            result
          });
          publishDecision(tabId, rawUrl);
        });
      return identity;
    }
    if (existing.state === "pending") return identity;
    const matching = existing.result
      ? resolverCandidateMatches(existing.result, identity.registrableDomain)
      : undefined;
    return matching
      ? {
          ...identity,
          domainStatus: "verified",
          evidence: ["IDENTITY.DOMAIN.RESOLVER_CANDIDATE"],
          relationship: "resolver-candidate"
        }
      : identity;
  };

  const publishDecision = (tabId: number, rawUrl: string | undefined) => {
    const frames = [...(summaries.get(tabId)?.values() ?? [])].slice(
      0,
      STRUCTURAL_FRAME_LIMIT
    );
    const structural =
      frames.length > 0 ? combineFrameStructuralSummaries(frames) : undefined;
    const behaviorFrames = [
      ...(behaviorSummaries.get(tabId)?.values() ?? [])
    ].slice(0, STRUCTURAL_FRAME_LIMIT);
    const behavior =
      behaviorFrames.length > 0
        ? combineFrameBehaviorSummaries(behaviorFrames)
        : undefined;
    const identitySummary = identities.get(tabId);
    const localIdentity = identitySummary
      ? compareClaimToUrl(identitySummary, rawUrl)
      : undefined;
    const identity = localIdentity
      ? resolverAssessment(tabId, localIdentity, rawUrl)
      : undefined;
    if (identity) assessments.set(tabId, identity);
    const decision = evaluateDecision({
      identity,
      structural,
      behavior,
      url: analyzeUrl(rawUrl),
      bypassed: bypassedTabs.has(tabId)
    });
    decisions.set(tabId, decision);
    void updateBadge(tabId, decision).catch(() => undefined);
    void browser.tabs
      .sendMessage(
        tabId,
        { type: "originlens.decision-update", decision },
        { frameId: 0 }
      )
      .catch(() => undefined);
    return decision;
  };

  const resetTabAnalysis = (tabId: number) => {
    summaries.delete(tabId);
    behaviorSummaries.delete(tabId);
    identities.delete(tabId);
    assessments.delete(tabId);
    decisions.delete(tabId);
    bypassedTabs.delete(tabId);
    tabResolverStates.delete(tabId);
    void updateBadge(tabId, undefined).catch(() => undefined);
  };

  const republishKnownTabs = () => {
    if (!protectionEnabled) return;
    for (const tabId of identities.keys())
      void browser.tabs
        .get(tabId)
        .then((tab) => publishDecision(tabId, tab.url))
        .catch(() => undefined);
  };

  const clearAllAnalysis = () => {
    const tabIds = new Set([
      ...navigations.keys(),
      ...summaries.keys(),
      ...behaviorSummaries.keys(),
      ...identities.keys(),
      ...assessments.keys(),
      ...decisions.keys(),
      ...bypassedTabs,
      ...tabResolverStates.keys()
    ]);
    navigations.clear();
    for (const tabId of tabIds) resetTabAnalysis(tabId);
    resolverClient.clear();
    lastResolverResult = undefined;
  };

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !(PROTECTION_CONSENT_KEY in changes)) return;
    protectionEnabled = isProtectionConsent(
      changes[PROTECTION_CONSENT_KEY]?.newValue
    );
    if (!protectionEnabled) clearAllAnalysis();
  });

  browser.runtime.onInstalled.addListener(() => {
    void protectionConsentReady.then(() => {
      if (protectionEnabled) return;
      void browser.tabs
        .create({ url: browser.runtime.getURL(ONBOARDING_PATH) })
        .catch(() => undefined);
    });
  });

  browser.webNavigation.onBeforeNavigate.addListener((details) => {
    if (!protectionEnabled) return;
    if (details.frameId === 0) {
      const existing = navigations.get(details.tabId);
      const state =
        existing && !existing.committed && !existing.failed
          ? existing
          : {
              committed: false,
              failed: false,
              origins: [],
              qualifiers: []
            };
      appendOrigin(state, details.url);
      navigations.set(details.tabId, state);
      resetTabAnalysis(details.tabId);
      return;
    }
    summaries.get(details.tabId)?.delete(details.frameId);
    behaviorSummaries.get(details.tabId)?.delete(details.frameId);
  });

  browser.webNavigation.onCommitted.addListener((details) => {
    if (!protectionEnabled) return;
    if (details.frameId !== 0) return;
    const state = navigations.get(details.tabId) ?? {
      committed: false,
      failed: false,
      origins: [],
      qualifiers: []
    };
    appendOrigin(state, details.url);
    state.qualifiers = details.transitionQualifiers.filter((qualifier) =>
      ["client_redirect", "server_redirect"].includes(qualifier)
    );
    state.committed = true;
    state.failed = false;
    navigations.set(details.tabId, state);
  });

  browser.webNavigation.onErrorOccurred.addListener((details) => {
    if (!protectionEnabled) return;
    if (details.frameId !== 0) return;
    const state = navigations.get(details.tabId);
    if (state && !state.committed) state.failed = true;
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    navigations.delete(tabId);
    summaries.delete(tabId);
    behaviorSummaries.delete(tabId);
    identities.delete(tabId);
    assessments.delete(tabId);
    decisions.delete(tabId);
    bypassedTabs.delete(tabId);
    tabResolverStates.delete(tabId);
  });

  browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (!message || typeof message !== "object") return undefined;
    const payload = message as {
      tabId?: unknown;
      type?: unknown;
      summary?: unknown;
      behavior?: unknown;
      identity?: unknown;
      config?: unknown;
      organization?: unknown;
    };

    if (payload.type === "originlens.get-resolver-config") {
      void resolverConfigReady.then(() => respond(resolverConfig));
      return true;
    }

    if (payload.type === "originlens.get-resolver-status") {
      void resolverConfigReady.then(() => respond(resolverStatus()));
      return true;
    }

    if (
      payload.type === "originlens.protection-revoked" &&
      typeof sender.tab?.id === "number" &&
      (sender.frameId ?? 0) === 0
    ) {
      const tabId = sender.tab.id;
      void getProtectionConsent()
        .then((consent) => {
          if (consent) return;
          protectionEnabled = false;
          navigations.delete(tabId);
          resetTabAnalysis(tabId);
        })
        .catch(() => {
          protectionEnabled = false;
          navigations.delete(tabId);
          resetTabAnalysis(tabId);
        })
        .finally(() => respond(undefined));
      return true;
    }

    if (payload.type === "originlens.set-resolver-config") {
      if (!isResolverConfig(payload.config)) {
        respond({ ok: false, error: "Invalid resolver configuration" });
        return true;
      }
      const nextConfig = payload.config;
      void resolverConfigReady.then(async () => {
        resolverConfig = nextConfig;
        resolverClient.clear();
        tabResolverStates.clear();
        lastResolverResult = undefined;
        try {
          await browser.storage.local.set({
            [RESOLVER_CONFIG_KEY]: resolverConfig
          });
          republishKnownTabs();
          respond({ ok: true, config: resolverConfig });
        } catch {
          respond({ ok: false, error: "Configuration was not saved" });
        }
      });
      return true;
    }

    if (
      payload.type === "originlens.test-resolver" &&
      typeof payload.organization === "string"
    ) {
      const organization = payload.organization;
      void resolverConfigReady.then(() =>
        resolverClient.resolve(resolverConfig, organization).then((result) => {
          lastResolverResult = result;
          respond(result);
        })
      );
      return true;
    }

    if (
      payload.type === "originlens.get-identity-assessment" &&
      typeof payload.tabId === "number"
    ) {
      void protectionConsentReady.then(() =>
        respond(
          protectionEnabled
            ? assessments.get(payload.tabId as number)
            : undefined
        )
      );
      return true;
    }

    if (
      payload.type === "originlens.get-decision-summary" &&
      typeof payload.tabId === "number"
    ) {
      void protectionConsentReady.then(() =>
        respond(
          protectionEnabled ? decisions.get(payload.tabId as number) : undefined
        )
      );
      return true;
    }

    if (
      payload.type === "originlens.get-navigation-summary" &&
      typeof payload.tabId === "number"
    ) {
      void protectionConsentReady.then(() => {
        const state = protectionEnabled
          ? navigations.get(payload.tabId as number)
          : undefined;
        respond(
          state?.committed
            ? createNavigationSummary(state.origins, state.qualifiers)
            : undefined
        );
      });
      return true;
    }

    if (
      payload.type === "originlens.warning-bypassed" &&
      typeof sender.tab?.id === "number" &&
      (sender.frameId ?? 0) === 0 &&
      decisions.get(sender.tab.id)?.state === "danger"
    ) {
      if (!protectionEnabled) {
        respond(undefined);
        return true;
      }
      bypassedTabs.add(sender.tab.id);
      respond(publishDecision(sender.tab.id, sender.tab.url));
      return true;
    }

    if (
      payload.type === "originlens.reset-intervention" &&
      typeof sender.tab?.id === "number" &&
      (sender.frameId ?? 0) === 0
    ) {
      if (!protectionEnabled) {
        respond(undefined);
        return true;
      }
      resetTabAnalysis(sender.tab.id);
      respond(undefined);
      return true;
    }

    if (
      payload.type === "originlens.get-behavior-summary" &&
      typeof payload.tabId === "number"
    ) {
      void protectionConsentReady.then(() => {
        const frames = protectionEnabled
          ? [
              ...(behaviorSummaries.get(payload.tabId as number)?.values() ??
                [])
            ].slice(0, STRUCTURAL_FRAME_LIMIT)
          : [];
        respond(
          frames.length > 0 ? combineFrameBehaviorSummaries(frames) : undefined
        );
      });
      return true;
    }

    if (
      payload.type === "originlens.get-structural-summary" &&
      typeof payload.tabId === "number"
    ) {
      void protectionConsentReady.then(() => {
        const frames = protectionEnabled
          ? [...(summaries.get(payload.tabId as number)?.values() ?? [])].slice(
              0,
              STRUCTURAL_FRAME_LIMIT
            )
          : [];
        respond(
          frames.length > 0
            ? combineFrameStructuralSummaries(frames)
            : undefined
        );
      });
      return true;
    }

    if (
      payload.type !== "originlens.structural-summary" ||
      typeof sender.tab?.id !== "number" ||
      !isFrameStructuralSummary(payload.summary)
    )
      return undefined;

    const tabId = sender.tab.id;
    const frameId = sender.frameId ?? 0;
    void protectionConsentReady.then(() => {
      if (!protectionEnabled) {
        respond(undefined);
        return;
      }
      const tabSummaries =
        summaries.get(tabId) ?? new Map<number, FrameStructuralSummary>();
      if (
        tabSummaries.has(frameId) ||
        tabSummaries.size < STRUCTURAL_FRAME_LIMIT
      )
        tabSummaries.set(frameId, payload.summary as FrameStructuralSummary);
      summaries.set(tabId, tabSummaries);
      if (isFrameBehaviorSummary(payload.behavior)) {
        const tabBehavior =
          behaviorSummaries.get(tabId) ??
          new Map<number, FrameBehaviorSummary>();
        if (
          tabBehavior.has(frameId) ||
          tabBehavior.size < STRUCTURAL_FRAME_LIMIT
        )
          tabBehavior.set(frameId, payload.behavior);
        behaviorSummaries.set(tabId, tabBehavior);
      }
      if (frameId === 0 && isPageIdentitySummary(payload.identity))
        identities.set(tabId, payload.identity);
      publishDecision(tabId, sender.tab?.url);
      respond(undefined);
    });
    return true;
  });

  void resolverConfigReady.then(() => {
    if (!resolverConfig.enabled) return;
    republishKnownTabs();
  });
});
