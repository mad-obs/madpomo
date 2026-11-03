import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { MadpomoProvider } from "./store.jsx";
/* The design system is shared with the plain-JS build: one copy of
   style.css and tokens.css, at the project root. */
import "../../style.css";
import "../../mobile.css";
import "./styles/react.css";

/* What makes an installed madpomo open without a network. Registered with a
   relative path so the scope follows wherever the build is deployed, and
   skipped on file:// where workers are not allowed at all. */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* No worker means no offline start. Everything else still works, so
         this is not worth a message on the page. */
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MadpomoProvider>
      <App />
    </MadpomoProvider>
  </StrictMode>
);
