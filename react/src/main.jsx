import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { MadpomoProvider } from "./store.jsx";
/* The design system is shared with the plain-JS build: one copy of
   style.css and tokens.css, at the project root. */
import "../../style.css";
import "./styles/react.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MadpomoProvider>
      <App />
    </MadpomoProvider>
  </StrictMode>
);
