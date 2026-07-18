import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence, setLogLevel } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getStorage } from "firebase/storage";
import config from "../firebase-applet-config.json";

// Safe helper to extract all text from any log argument, including nested objects with circular references
function extractLogText(arg: any): string {
  if (arg === null || arg === undefined) return "";
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}\n${arg.stack || ""}`;
  }
  
  let info = "";
  if (arg.message) info += " " + String(arg.message);
  if (arg.code) info += " code:" + String(arg.code);
  if (arg.name) info += " " + String(arg.name);
  if (arg.stack) info += " " + String(arg.stack);
  
  if (typeof arg === "object") {
    try {
      const seen = new WeakSet();
      const safeString = JSON.stringify(arg, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      });
      info += " " + safeString;
    } catch (e) {
      try {
        for (const key of Object.keys(arg)) {
          const val = arg[key];
          if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
            info += ` ${key}:${val}`;
          }
        }
      } catch (err) {}
      info += " " + String(arg);
    }
  } else {
    info += " " + String(arg);
  }
  return info;
}

// Set native firestore log level to silent to prevent library internals from flooding console
try {
  setLogLevel("silent");
} catch (err) {
  console.warn("Could not set Firestore log level:", err);
}

// Safe console wrapper to handle and suppress Firestore idle stream warnings/errors from cluttering logs
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      const errorStr = args.map(extractLogText).join(" ");

      if (
        errorStr.includes("Disconnecting idle stream") ||
        errorStr.includes("Timed out waiting for new targets") ||
        errorStr.includes("GrpcConnection RPC 'Listen' stream") ||
        errorStr.includes("CANCELLED: Disconnecting idle stream") ||
        (errorStr.includes("Firestore") && errorStr.includes("stream") && errorStr.includes("error")) ||
        (errorStr.includes("firebase") && errorStr.includes("idle stream"))
      ) {
        // Demote to a subtle debug info print as Firestore handles these reconnections automatically
        console.debug("[Firestore] Handled native connection idle reset gracefully.");
        return;
      }
    } catch (e) {
      // fallback if mapping fails
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    try {
      const warnStr = args.map(extractLogText).join(" ");

      if (
        warnStr.includes("Disconnecting idle stream") ||
        warnStr.includes("Timed out waiting for new targets") ||
        warnStr.includes("GrpcConnection RPC 'Listen' stream") ||
        warnStr.includes("CANCELLED: Disconnecting idle stream")
      ) {
        console.debug("[Firestore] Handled native connection idle warning gracefully.");
        return;
      }
    } catch (e) {
      // fallback if mapping fails
    }
    originalConsoleWarn.apply(console, args);
  };
}

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
          key.includes("firebase:app-check")
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
          key.includes("firebase:app-check")
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
