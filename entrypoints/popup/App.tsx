import { useEffect, useState } from "react";

import { getCurrentOrigin } from "../../lib/current-origin";
import type { DisplayOrigin } from "../../lib/origin";

const initialOrigin: DisplayOrigin = {
  kind: "unavailable",
  label: "Checking current origin…"
};

export default function App() {
  const [origin, setOrigin] = useState(initialOrigin);

  useEffect(() => {
    void getCurrentOrigin().then(setOrigin);
  }, []);

  const openDiagnostics = async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL("/diagnostics.html")
    });
  };

  const openOptions = async () => {
    await browser.runtime.openOptionsPage();
  };

  return (
    <main className="popup shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          O
        </span>
        <div>
          <h1 className="brand-name">OriginLens</h1>
          <p className="tagline">See who a site really is.</p>
        </div>
      </header>

      <section className="origin-card card" aria-labelledby="origin-heading">
        <p className="eyebrow" id="origin-heading">
          Current origin
        </p>
        <p className="origin-value" data-origin-kind={origin.kind}>
          {origin.label}
        </p>
      </section>

      <section className="status-card" aria-labelledby="status-heading">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <h2 id="status-heading">Analysis not implemented yet</h2>
          <p>
            This Stage 0 shell does not evaluate or make claims about this site.
          </p>
        </div>
      </section>

      <p className="disclaimer">
        OriginLens cannot prove that a website is safe. Keep Chrome’s built-in
        protections enabled and prefer phishing-resistant authentication.
      </p>

      <footer className="popup-actions">
        <button
          className="button primary"
          type="button"
          onClick={() => void openDiagnostics()}
        >
          Diagnostics
        </button>
        <button
          className="button"
          type="button"
          onClick={() => void openOptions()}
        >
          Options
        </button>
      </footer>
    </main>
  );
}
