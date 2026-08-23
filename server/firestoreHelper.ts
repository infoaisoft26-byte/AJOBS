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
  cleaned = cleaned.replace(/[,;]+$/, "").trim();
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
    cleaned = cleaned.replace(/[,;]+$/, "").trim();
  }
  return cleaned.replace(/\\n/g, "\n");
};

const privateKey = formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

const parseServiceAccountJson = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    let value = raw.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Accept either direct JSON or base64-encoded JSON.
    if (!value.startsWith("{")) value = Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(value);
    const parsedKey = formatPrivateKey(parsed.private_key || parsed.privateKey);
    const parsedProjectId = parsed.project_id || parsed.projectId;
    const parsedClientEmail = parsed.client_email || parsed.clientEmail;
    if (!parsedProjectId || !parsedClientEmail || !parsedKey) return null;
    return { projectId: parsedProjectId, clientEmail: parsedClientEmail, privateKey: parsedKey };
  } catch (err: any) {
    console.error("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON is invalid:", err?.message || err);
    return null;
  }
};

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
const fallbackProjectId = config.projectId || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "planning-with-ai-1ea1c";

const initAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const jsonCredentials = parseServiceAccountJson();
  const activeProjectId = jsonCredentials?.projectId || projectId;
  const activeClientEmail = jsonCredentials?.clientEmail || clientEmail;
  const activePrivateKey = jsonCredentials?.privateKey || privateKey;

  const isValidCert =
    Boolean(activeProjectId) &&
    Boolean(activeClientEmail) &&
    Boolean(activePrivateKey) &&
    (activePrivateKey!.includes("BEGIN PRIVATE KEY") || activePrivateKey!.includes("BEGIN RSA PRIVATE KEY")) &&
    (activePrivateKey!.includes("END PRIVATE KEY") || activePrivateKey!.includes("END RSA PRIVATE KEY")) &&
    !activeProjectId!.toLowerCase().includes("your_") &&
    !activeClientEmail!.toLowerCase().includes("your_");

  if (isValidCert) {
    try {
      return initializeApp({
        credential: cert({
          projectId: activeProjectId!,
          clientEmail: activeClientEmail!,
          privateKey: activePrivateKey!
        })
      });
    } catch (err: any) {
      console.info("[Firebase Admin] Service account cert fallback to project ID initialization:", err?.message || err);
    }
  }

  return initializeApp({
    projectId: activeProjectId || fallbackProjectId
  });
};

const adminApp = initAdminApp();

const configuredDatabaseId = process.env.FIRESTORE_DATABASE_ID || config.firestoreDatabaseId;
// Firebase's primary database must be initialized without a custom database
// id. Older AI Studio exports placed an unrelated generated id in config,
// which made every Admin SDK request fail in Vercel.
const targetDatabaseId = configuredDatabaseId && configuredDatabaseId !== "(default)"
  ? configuredDatabaseId
  : undefined;

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
