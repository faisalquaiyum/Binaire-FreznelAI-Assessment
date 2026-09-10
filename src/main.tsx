import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider, defaultTheme } from "@adobe/react-spectrum";
import { App } from "./App";
import "./styles/app.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider theme={defaultTheme} colorScheme="light">
      <App />
    </Provider>
  </StrictMode>,
);
