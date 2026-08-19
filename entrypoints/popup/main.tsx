import React from "react";
import ReactDOM from "react-dom/client";

import "../shared.css";
import App from "./App";
import "./style.css";

const root = document.querySelector<HTMLDivElement>("#root");

if (!root) {
  throw new Error("OriginLens popup root was not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
