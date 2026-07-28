import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",

  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",

  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",

  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",

  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",

  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",

  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== "measurementId" && !value)
  .map(([key]) => key);

if (missingFirebaseKeys.length > 0) {
  throw new Error(
    `Configuration Firebase incomplete: ${missingFirebaseKeys.join(", ")}. Verifie .env.local et .env.example.`
  );
}

if (!firebaseConfig.apiKey.startsWith("AIza")) {
  throw new Error("Configuration Firebase invalide: VITE_FIREBASE_API_KEY ne ressemble pas a une cle Web Firebase.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics (browser only)
if (typeof window !== "undefined") {
  try {
    getAnalytics(app);
  } catch (err) {
    console.warn("Analytics disabled:", err);
  }
}

// Exports
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// IMPORTANT: exports needed by App.tsx
export const activeFirebaseAuthDomain =
  firebaseConfig.authDomain;

export const activeFirebaseProjectId =
  firebaseConfig.projectId;

// Google provider
export const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Prevent multiple popup opens
let pendingGoogleLogin:
  | Promise<any>
  | null = null;

// Google login
export const loginWithGoogle = async () => {
  if (pendingGoogleLogin) {
    return pendingGoogleLogin.then(
      (result) => result.user
    );
  }

  try {
    pendingGoogleLogin = signInWithPopup(
      auth,
      googleProvider
    );

    const result = await pendingGoogleLogin;

    console.log(
      "LOGIN SUCCESS:",
      result.user
    );

    return result.user;
  } catch (error: any) {
    console.error(
      "GOOGLE LOGIN ERROR"
    );
    console.error(
      "Code:",
      error?.code
    );
    console.error(
      "Message:",
      error?.message
    );
    console.error(error);

    throw error;
  } finally {
    pendingGoogleLogin = null;
  }
};
