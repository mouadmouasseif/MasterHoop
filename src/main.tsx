import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/src/auth/AuthProvider";
import { migrateLegacyLocalStorage } from "@/src/shared/legacyMigration";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CHUNK_RECOVERY_KEY = "basketmotion:chunk-recovery";


const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root introuvable dans index.html");
}

migrateLegacyLocalStorage();
installChunkLoadRecovery();

createRoot(rootElement).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);

function installChunkLoadRecovery() {
  if (typeof window === "undefined") return;

  const isChunkLoadError = (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason || "");
    return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|dynamically imported module/i.test(message);
  };

  const recover = async () => {
    if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) === "1") return;
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    } catch (error) {
      console.warn("BasketMotion cache recovery skipped:", error);
    } finally {
      window.location.reload();
    }
  };

  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      void recover();
    }
  });

  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error || event.message)) {
      event.preventDefault();
      void recover();
    }
  });

  window.addEventListener("load", () => {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
  });
}
