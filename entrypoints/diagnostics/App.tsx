const checks = [
  {
    label: "Manifest",
    value: "Version 3",
    detail: "Event-driven extension service worker"
  },
  {
    label: "Required permission",
    value: "activeTab only",
    detail: "Temporary current-tab access after opening OriginLens"
  },
  {
    label: "Network",
    value: "No endpoints configured",
    detail: "This build contains no application network calls"
  },
  {
    label: "Telemetry",
    value: "Disabled",
    detail: "No analytics SDK or telemetry pipeline"
  },
  {
    label: "Page analysis",
    value: "Not implemented",
    detail: "No page content or form data is inspected in Stage 0"
  }
] as const;

const urlFixtures = [
  "https://www.example.co.uk/news",
  "https://mañana.com/",
  "https://bank@example.test:8443/",
  "https://pаypal.example.test/"
] as const;

export default function App() {
  return (
    <main className="diagnostics shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          O
        </span>
        <div>
          <h1 className="brand-name">Diagnostics</h1>
          <p className="tagline">
            Inspectable facts about this OriginLens build.
          </p>
        </div>
      </header>

      <section className="diagnostics-card card" aria-labelledby="build-facts">
        <p className="eyebrow">Local extension state</p>
        <h2 id="build-facts">Stage 0 build facts</h2>
        <p className="muted">
          These are extension configuration facts, not a verdict about any
          website.
        </p>

        <ul>
          {checks.map((check) => (
            <li key={check.label}>
              <span className="check-mark" aria-hidden="true">
                ·
              </span>
              <div>
                <span className="check-label">{check.label}</span>
                <strong>{check.value}</strong>
                <small>{check.detail}</small>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="diagnostics-card card" aria-labelledby="url-fixtures">
        <p className="eyebrow">Local browser fixtures</p>
        <h2 id="url-fixtures">Synthetic URL analysis</h2>
        <p className="muted">
          These fixed examples are evaluated locally; no URL is opened or
          transmitted.
        </p>
        <ul>
          {urlFixtures.map((url) => {
            const result = analyzeUrl(url);
            return (
              <li key={url}>
                <div>
                  <span className="check-label">{url}</span>
                  <strong>{result.state}</strong>
                  <small>
                    {result.evidence.map((item) => item.code).join(", ") ||
                      "No weak URL signals"}
                  </small>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
import { analyzeUrl } from "../../lib/url-analysis";
