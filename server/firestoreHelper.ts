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

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(
        projectId && clientEmail && privateKey
          ? {
              credential: cert({
                projectId,
                clientEmail,
                privateKey
              })
            }
          : {
              projectId: fallbackProjectId
            }
      );

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
