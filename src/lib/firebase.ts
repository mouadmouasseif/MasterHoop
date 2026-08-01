import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyDn_C0B1RpoU03iI5SZSI1qC10kZWWlNFo",
  authDomain: "master-hoop-a1d0a.firebaseapp.com",
  projectId: "master-hoop-a1d0a",
  storageBucket: "master-hoop-a1d0a.appspot.com",
  messagingSenderId: "2544230303",
  appId: "1:2544230303:web:f6f45f628db48d23a6a7aa",
  measurementId: "",
};

const env = import.meta.env;
const getEnvValue = (key: keyof typeof fallbackFirebaseConfig) => {
  const envKey = `VITE_FIREBASE_${key.replace(/[A-Z]/g, (char) => `_${char}`).toUpperCase()}`;
  const value = env[envKey]?.trim();
  return value || fallbackFirebaseConfig[key];
};

// Firebase config
const firebaseConfig = {
  apiKey: getEnvValue("apiKey"),

  authDomain: getEnvValue("authDomain"),

  projectId: getEnvValue("projectId"),

  storageBucket: getEnvValue("storageBucket"),

  messagingSenderId: getEnvValue("messagingSenderId"),

  appId: getEnvValue("appId"),

  measurementId: getEnvValue("measurementId"),

  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID?.trim() || "",
};

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== "measurementId" && key !== "firestoreDatabaseId" && !value)
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
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
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
