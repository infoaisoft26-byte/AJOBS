import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

const formatPrivateKey = (key?: string) => {
  if (!key) return undefined;
  let cleaned = key.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, "\n");
};

const privateKey = formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
const fallbackProjectId = config.projectId || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "planning-with-ai-1ea1c";

const initAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

const isValidCert =
    Boolean(projectId) &&
    Boolean(clientEmail) &&
    Boolean(privateKey) &&
    (privateKey!.includes("BEGIN PRIVATE KEY") || privateKey!.includes("BEGIN RSA PRIVATE KEY")) &&
    (privateKey!.includes("END PRIVATE KEY") || privateKey!.includes("END RSA PRIVATE KEY")) &&
    !projectId!.toLowerCase().includes("your_") &&
    !clientEmail!.toLowerCase().includes("your_");

  if (isValidCert) {
    try {
      return initializeApp({
        credential: cert({
          projectId: projectId!,
          clientEmail: clientEmail!,
          privateKey: privateKey!
        })
      });
    } catch (err: any) {
      console.info("[Firebase Admin] Service account cert fallback to project ID initialization:", err?.message || err);
    }
  }

  return initializeApp({
    projectId: projectId || fallbackProjectId
  });
};

const adminApp = initAdminApp();

const targetDatabaseId = config.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID;

export const adminDb: Firestore = targetDatabaseId
  ? getFirestore(adminApp, targetDatabaseId)
  : getFirestore(adminApp);

export function getAdminApp() {
  return adminApp;
}

export function getFirestoreDb(): Firestore {
  return adminDb;
}

export function getFirebaseAuth(): Auth {
  return getAuth(adminApp);
}
