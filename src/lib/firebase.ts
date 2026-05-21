import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Firebase config
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDQDglkkDxNUh_Qa9hVh6cvWtS-Tf_w-MY",

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "master-hoop-a1d0a.firebaseapp.com",

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    "master-hoop-a1d0a",

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "master-hoop-a1d0a.firebasestorage.app",

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "390685374202",

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:390685374202:web:5e400bb84d7ea7543ebb43",

  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    "G-XSD3Z1TM84",
};

// Debug logs
console.log("Firebase config:", firebaseConfig);
console.log("Auth domain:", firebaseConfig.authDomain);
console.log("Project ID:", firebaseConfig.projectId);

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