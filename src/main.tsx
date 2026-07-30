import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/src/auth/AuthProvider";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;


const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root introuvable dans index.html");
}

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
