import { describe, expect, it } from "vitest";
import { analyzeUrl } from "../../lib/url-analysis";
import {
  benignUrlFixtures,
  suspiciousUrlFixtures
} from "../fixtures/url-fixtures";

describe("analyzeUrl", () => {
  it("extracts a registrable domain without treating ordinary sites as risky", () => {
    const result = analyzeUrl("https://www.example.co.uk/news?private=value");
    expect(result.state).toBe("no-strong-indicators");
    expect(result.registrableDomain).toBe("example.co.uk");
  });
  it("shows Punycode for a legitimate internationalized host without caution", () => {
    const result = analyzeUrl("https://mañana.com/");
    expect(result.displayHostname).toBe("mañana.com");
    expect(result.evidence.map((item) => item.code)).toEqual([
      "URL.PUNYCODE_VISIBLE"
    ]);
  });
  it("explains user-info, IP literals, unusual ports, and mixed scripts", () => {
    const codes = analyzeUrl("https://bank@example.test:8443/").evidence.map(
      (item) => item.code
    );
    expect(codes).toContain("URL.USERINFO");
    expect(codes).toContain("URL.UNUSUAL_PORT");
    expect(
      analyzeUrl("http://192.0.2.7/").evidence.map((item) => item.code)
    ).toContain("URL.IP_LITERAL");
    expect(
      analyzeUrl("https://pаypal.example.test/").evidence.map(
        (item) => item.code
      )
    ).toContain("URL.MIXED_SCRIPT");
  });

  it("keeps synthetic benign fixtures non-blocking and explains suspicious fixtures", () => {
    for (const url of benignUrlFixtures)
      expect(analyzeUrl(url).state).not.toBe("caution");
    for (const url of suspiciousUrlFixtures)
      expect(analyzeUrl(url).state).toBe("caution");
  });
});
