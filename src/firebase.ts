import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
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

// Initialize Firebase safely
let app: any;
let authInstance: any;
let dbInstance: any;

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
    
    // Enable persistent authentication
    setPersistence(authInstance, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence error:", error);
    });

    // Enable multi-tab offline Firestore persistence safely
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
  console.warn("Firebase initialization skipped or failed safely:", error?.message);
  // Fallback / dummy initializations to prevent import errors and application crashes
  const dummyConfig = {
    apiKey: "AIzaSyDummyKeyToPreventApplicationCrashing",
    authDomain: "dummy-auth-domain.firebaseapp.com",
    projectId: "dummy-project-id",
    storageBucket: "dummy-storage-bucket.firebasestorage.app",
    messagingSenderId: "12345678",
    appId: "1:12345678:web:dummy"
  };
  try {
    app = getApps().length === 0 ? initializeApp(dummyConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (fallbackErr) {
    console.error("Critical fallback initialization failed:", fallbackErr);
    // Ultimate fallbacks
    app = {} as any;
    authInstance = {
      onAuthStateChanged: () => () => {},
      signOut: async () => {},
      currentUser: null,
    } as any;
    dbInstance = {} as any;
  }
}

export const auth = authInstance;
export const db = dbInstance;
