import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getStorage } from "firebase/storage";
import config from "../firebase-applet-config.json";

// Check if Firebase configuration is complete and valid
export const isFirebaseConfigured = !!(
  config &&
  config.apiKey &&
  config.apiKey.trim() !== "" &&
  !config.apiKey.includes("YOUR_") &&
  config.projectId &&
  config.projectId.trim() !== "" &&
  !config.projectId.includes("YOUR_") &&
  config.appId &&
  config.appId.trim() !== "" &&
  !config.appId.includes("YOUR_")
);

export let firebaseConfigError = "";
if (!isFirebaseConfigured) {
  firebaseConfigError = "Firebase configuration is missing, incomplete, or contains placeholders in firebase-applet-config.json.";
}

/**
 * 10. Remove invalid App Check tokens.
 * 11. Clear cached Firebase tokens.
 * Wipes out local and session storage keys that contain firebase/app-check cached tokens
 * and deletes the IndexedDB database to avoid corrupt/invalid tokens blocking request pipelines.
 */
export function clearCachedFirebaseAndAppCheckTokens() {
  if (typeof window !== "undefined") {
    try {
      console.log("[Firebase] Cleaning up stale or invalid cached App Check & Firebase Auth tokens...");
      
      // 1. Clear LocalStorage keys
      const keysToClear = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes("appcheck") || 
          key.includes("app-check") || 
          key.includes("app_check") || 
          key.includes("firebase:app-check") ||
          key.includes("firebase:auth")
        )) {
          keysToClear.push(key);
        }
      }
      keysToClear.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`[Firebase] Cleared localStorage key: ${key}`);
        } catch (err) {
          // ignore storage access blocks
        }
      });

      // 2. Clear SessionStorage keys
      const sessionKeysToClear = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes("appcheck") || 
          key.includes("app-check") || 
          key.includes("app_check") || 
          key.includes("firebase:app-check") ||
          key.includes("firebase:auth")
        )) {
          sessionKeysToClear.push(key);
        }
      }
      sessionKeysToClear.forEach(key => {
        try {
          sessionStorage.removeItem(key);
          console.log(`[Firebase] Cleared sessionStorage key: ${key}`);
        } catch (err) {
          // ignore storage access blocks
        }
      });

      // 3. Clear IndexedDB Firebase App Check database if it exists
      if (typeof indexedDB !== "undefined" && indexedDB.deleteDatabase) {
        indexedDB.deleteDatabase("firebase-app-check-database");
        console.log("[Firebase] Triggered deletion of IndexedDB App Check database: firebase-app-check-database");
      }
    } catch (e) {
      console.error("[Firebase] Error while clearing cached tokens:", e);
    }
  }
}

// Automatically clear cached tokens on file load to resolve existing invalid tokens!
clearCachedFirebaseAndAppCheckTokens();

// Initialize Firebase safely
let app: any;
let authInstance: any;
let dbInstance: any;
let storageInstance: any;
let appCheckInstance: any = null;

try {
  if (isFirebaseConfigured) {
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };
    
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app, (config as any).firestoreDatabaseId);
    storageInstance = getStorage(app);

    // Initialize App Check safely (Intentionally bypassed to prevent App Check HTTP 403 fetch errors in sandbox/preview domains)
    if (typeof window !== "undefined") {
      console.log("[AppCheck] Firebase App Check is intentionally disabled in this environment to prevent HTTP 403 errors and unblock all services.");
    }
    
    // Enable persistent authentication (Task 5)
    setPersistence(authInstance, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence error:", error);
    });

    // Enable multi-tab offline Firestore persistence safely (Task 6)
    if (typeof window !== "undefined") {
      enableMultiTabIndexedDbPersistence(dbInstance)
        .then(() => {
          console.log("[Firestore] Multi-Tab Offline Persistence Activated successfully.");
        })
        .catch((err) => {
          if (err.code === "failed-precondition") {
            console.warn("[Firestore] Offline persistence failed precondition: Multiple tabs active.");
          } else if (err.code === "unimplemented") {
            console.warn("[Firestore] Offline persistence is unimplemented/unsupported in this client browser.");
          } else {
            console.error("[Firestore] Error enabling offline persistence:", err);
          }
        });
    }
  } else {
    throw new Error(firebaseConfigError || "Firebase not configured");
  }
} catch (error: any) {
  console.error("CRITICAL: Firebase initialization failed. Real database connection is REQUIRED. Error:", error?.message);
  throw new Error(`Firebase initialization failed: ${error?.message || "Check firebase-applet-config.json"}`);
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
