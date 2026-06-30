import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from "firebase/firestore";
import config from "../firebase-applet-config.json";

// Initialize Firebase with the config loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);

// Enable persistent authentication
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

// Enable multi-tab offline Firestore persistence
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db)
    .then(() => {
      console.log("[Firestore] Multi-Tab Offline Persistence Activated successfully.");
    })
    .catch((err) => {
      if (err.code === "failed-precondition") {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn("[Firestore] Offline persistence failed precondition: Multiple tabs active.");
      } else if (err.code === "unimplemented") {
        // The current browser does not support all of the features required to enable persistence
        console.warn("[Firestore] Offline persistence is unimplemented/unsupported in this client browser.");
      } else {
        console.error("[Firestore] Error enabling offline persistence:", err);
      }
    });
}
