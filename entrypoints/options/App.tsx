export default function App() {
  const openDiagnostics = async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL("/diagnostics.html")
    });
  };

  return (
    <main className="settings shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          O
        </span>
        <div>
          <h1 className="brand-name">OriginLens options</h1>
          <p className="tagline">See who a site really is.</p>
        </div>
      </header>

      <section className="settings-card card">
        <p className="eyebrow">Stage 3</p>
        <h2>No configurable analysis yet</h2>
        <p className="muted">
          Detection settings will appear only when their behavior and privacy
          guarantees are implemented and testable.
        </p>

        <dl>
          <div>
            <dt>Telemetry</dt>
            <dd>Disabled; no analytics are included</dd>
          </div>
          <div>
            <dt>Network access</dt>
            <dd>Not configured</dd>
          </div>
          <div>
            <dt>Analysis</dt>
            <dd>
              Local URL, bounded structural, and provenance-backed identity
              diagnostics
            </dd>
          </div>
        </dl>

        <button
          className="button primary"
          type="button"
          onClick={() => void openDiagnostics()}
        >
          Open diagnostics
        </button>
      </section>
    </main>
  );
}
