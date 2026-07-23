import { initializeApp, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

let adminApp: App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

export function getAdminApp(): App {
  if (!adminApp) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
      const projectId = config.projectId || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "planning-with-ai-1ea1c";

      adminApp = initializeApp({
        projectId
      });
    }
  }
  return adminApp;
}

export function getFirestoreDb(): Firestore {
  if (!adminDbInstance) {
    const app = getAdminApp();
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
    const databaseId = config.firestoreDatabaseId;

    if (databaseId) {
      adminDbInstance = getFirestore(app, databaseId);
    } else {
      adminDbInstance = getFirestore(app);
    }
  }
  return adminDbInstance;
}

export function getFirebaseAuth(): Auth {
  if (!adminAuthInstance) {
    const app = getAdminApp();
    adminAuthInstance = getAuth(app);
  }
  return adminAuthInstance;
}
