import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Vérification du root (évite crash silencieux)
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root introuvable dans index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);