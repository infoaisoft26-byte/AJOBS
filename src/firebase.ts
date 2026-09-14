import { GoogleAuthProvider, browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { enableMultiTabIndexedDbPersistence, getFirestore, setLogLevel } from "firebase/firestore";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import config from "../firebase-applet-config.json";

// Firebase Auth must use the branded production domain. In this Vite app the
// NEXT_PUBLIC_* value is injected at build time from vite.config.ts.
const firebaseAuthDomain =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "auth.aijobs1.in";

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
          if (seen.has(value)) return "[Circular]";
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
        console.debug("[Firestore] Handled native connection idle reset gracefully.");
        return;
      }
    } catch (e) {}
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
    } catch (e) {}
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
 * Clear stale Firebase App Check tokens without touching Firebase Auth session
 * persistence or other application state.
 */
export function clearCachedFirebaseAndAppCheckTokens() {
  if (typeof window === "undefined") return;

  try {
    const keysToClear: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("appcheck") ||
          key.includes("app-check") ||
          key.includes("app_check") ||
          key.includes("firebase:app-check"))
      ) {
        keysToClear.push(key);
      }
    }
    keysToClear.forEach((key) => localStorage.removeItem(key));

    const sessionKeysToClear: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.includes("appcheck") ||
          key.includes("app-check") ||
          key.includes("app_check") ||
          key.includes("firebase:app-check"))
      ) {
        sessionKeysToClear.push(key);
      }
    }
    sessionKeysToClear.forEach((key) => sessionStorage.removeItem(key));

    if (typeof indexedDB !== "undefined" && indexedDB.deleteDatabase) {
      indexedDB.deleteDatabase("firebase-app-check-database");
    }
  } catch (error) {
    console.error("[Firebase] Error while clearing cached App Check tokens:", error);
  }
}

clearCachedFirebaseAndAppCheckTokens();

let app: any;
let authInstance: any;
let dbInstance: any;
let storageInstance: any;

function installProtectedApiTokenInjector(authClient: any) {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  const marker = "__aijobsProtectedApiFetchInstalled";
  if ((window as any)[marker]) return;
  (window as any)[marker] = true;

  const protectedPaths = new Set([
    "/api/admin-platform-insights",
    "/api/consultancy-natural-search",
  ]);
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const parsed = new URL(rawUrl, window.location.origin);
      if (parsed.origin === window.location.origin && protectedPaths.has(parsed.pathname)) {
        const currentUser = authClient.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken();
          const existingHeaders = new Headers(input instanceof Request ? input.headers : init?.headers);
          existingHeaders.set("Authorization", `Bearer ${token}`);
          init = { ...(init || {}), headers: existingHeaders };
        }
      }
    } catch (error) {
      console.warn("[Firebase] Could not attach API auth token:", error);
    }
    return originalFetch(input, init);
  };
}

try {
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigError || "Firebase not configured");
  }

  const firebaseConfig = {
    apiKey: config.apiKey,
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "auth.aijobs1.in",
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(app);
  dbInstance = getFirestore(app, (config as any).firestoreDatabaseId);
  storageInstance = getStorage(app);

  if (typeof window !== "undefined") {
    console.info(`[Firebase] Client initialized with Auth domain: ${firebaseAuthDomain}`);
    installProtectedApiTokenInjector(authInstance);
  }

  setPersistence(authInstance, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
  });

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
} catch (error: any) {
  console.error("CRITICAL: Firebase initialization failed. Real database connection is REQUIRED. Error:", error?.message);
  throw new Error(`Firebase initialization failed: ${error?.message || "Check firebase-applet-config.json"}`);
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
