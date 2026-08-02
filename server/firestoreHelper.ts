import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
    privateKey!.includes("BEGIN PRIVATE KEY");

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
      console.warn("[Firebase Admin] Service account cert initialization error:", err?.message || err);
    }
  }

  return initializeApp({
    projectId: projectId || fallbackProjectId
  });
};

const adminApp = initAdminApp();

export const adminDb: Firestore = getFirestore(adminApp);

export function getAdminApp() {
  return adminApp;
}

export function getFirestoreDb(): Firestore {
  return adminDb;
}

export function getFirebaseAuth(): Auth {
  return getAuth(adminApp);
}
