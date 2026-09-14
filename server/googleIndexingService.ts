import crypto from "crypto";
import { getFirestoreDb } from "./firestoreHelper.js";
import { SITE_URL } from "./siteConfig.js";

export interface IndexingLogRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  jobUrl: string;
  requestType: "URL_UPDATED" | "URL_DELETED";
  responseCode: number;
  responseData?: any;
  status: "SUCCESS" | "FAILED" | "PENDING" | "SKIPPED_MISSING_CREDENTIALS";
  error?: string;
  submittedAt: string;
  submittedBy: string;
}

function base64UrlEncode(str: string | Buffer): string {
  const base64 = typeof str === "string" ? Buffer.from(str).toString("base64") : str.toString("base64");
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "job";
}

function getCanonicalJobUrl(job: { id: string; title: string; slug?: string; canonicalUrl?: string }): string {
  const canonical = String(job.canonicalUrl || "").trim();
  if (canonical.startsWith(`${SITE_URL}/jobs/`)) {
    try {
      const parsed = new URL(canonical);
      if (parsed.origin === new URL(SITE_URL).origin && parsed.pathname.startsWith("/jobs/")) {
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString();
      }
    } catch {
      // Rebuild from the trusted production domain below.
    }
  }

  const slug = String(job.slug || `${slugify(job.title || "job")}-${job.id}`).trim();
  return `${SITE_URL}/jobs/${encodeURIComponent(slug)}`;
}

function normalizeCredentialValue(value: string): string {
  let raw = String(value || "").trim();

  // Vercel values are sometimes pasted with surrounding JSON quotes.
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    if (raw.startsWith('"')) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") raw = parsed.trim();
      } catch {
        raw = raw.slice(1, -1).trim();
      }
    } else {
      raw = raw.slice(1, -1).trim();
    }
  }

  return raw;
}

function extractServiceAccountValue(value: string): { clientEmail?: string; privateKey?: string } {
  let raw = normalizeCredentialValue(value);

  // Accept a full service-account JSON object if it was pasted into the key field.
  for (let i = 0; i < 2; i += 1) {
    if (!raw.startsWith("{")) break;
    try {
      const parsed: any = JSON.parse(raw);
      const clientEmail = String(parsed?.client_email || "").trim() || undefined;
      const privateKey = String(parsed?.private_key || "").trim() || undefined;
      if (clientEmail || privateKey) return { clientEmail, privateKey };
      break;
    } catch {
      break;
    }
  }

  return { privateKey: raw || undefined };
}

function normalizePrivateKey(value: string): string {
  const extracted = extractServiceAccountValue(value);
  let key = String(extracted.privateKey || "").trim();

  // Handle the common Vercel one-line form where newlines are stored literally as \n.
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  // If a key was stored as base64, decode it only when the decoded content is clearly PEM.
  if (!key.includes("-----BEGIN ")) {
    const compact = key.replace(/\s+/g, "");
    if (compact.length > 100 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
      try {
        const decoded = Buffer.from(compact, "base64").toString("utf8").trim();
        if (decoded.includes("-----BEGIN ") && decoded.includes("PRIVATE KEY-----")) {
          key = decoded.replace(/\r\n/g, "\n");
        }
      } catch {
        // Validation below will return a clear configuration error.
      }
    }
  }

  return key;
}

function getIndexingCredentials(): { clientEmail?: string; privateKey?: string; source: string } {
  const serviceAccountJson = String(process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON || "").trim();
  if (serviceAccountJson) {
    const parsed = extractServiceAccountValue(serviceAccountJson);
    if (parsed.clientEmail && parsed.privateKey) {
      return { clientEmail: parsed.clientEmail, privateKey: parsed.privateKey, source: "GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON" };
    }
  }

  const googleEmailRaw = String(process.env.GOOGLE_INDEXING_CLIENT_EMAIL || "").trim();
  const googleKeyRaw = String(process.env.GOOGLE_INDEXING_PRIVATE_KEY || "").trim();
  const googleKeyParts = extractServiceAccountValue(googleKeyRaw);
  const googleClientEmail = normalizeCredentialValue(googleEmailRaw) || googleKeyParts.clientEmail;
  if (googleClientEmail && googleKeyParts.privateKey) {
    return { clientEmail: googleClientEmail, privateKey: googleKeyParts.privateKey, source: "GOOGLE_INDEXING" };
  }

  const firebaseEmailRaw = String(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "").trim();
  const firebaseKeyRaw = String(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").trim();
  const firebaseKeyParts = extractServiceAccountValue(firebaseKeyRaw);
  const firebaseClientEmail = normalizeCredentialValue(firebaseEmailRaw) || firebaseKeyParts.clientEmail;
  if (firebaseClientEmail && firebaseKeyParts.privateKey) {
    return { clientEmail: firebaseClientEmail, privateKey: firebaseKeyParts.privateKey, source: "FIREBASE_ADMIN_FALLBACK" };
  }

  return { source: "MISSING" };
}

function extractGoogleError(respJson: any, respText: string, status: number): string {
  const message = respJson?.error?.message || respJson?.message || "";
  const code = respJson?.error?.status || respJson?.error?.code || status;
  return message ? `Google Indexing API ${code}: ${message}` : `Google Indexing API HTTP ${status}: ${respText || "Unknown error"}`;
}

/**
 * Obtains an OAuth 2.0 access token for Google Indexing API using Service Account credentials.
 */
async function getGoogleIndexingAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;
  const formattedPrivateKey = normalizePrivateKey(privateKey);

  let keyObject: crypto.KeyObject;
  try {
    if (!formattedPrivateKey.includes("PRIVATE KEY-----")) {
      throw new Error("PEM header missing");
    }
    keyObject = crypto.createPrivateKey({ key: formattedPrivateKey, format: "pem" });
  } catch {
    throw new Error(
      'Google Indexing private key format is invalid. In Vercel, set GOOGLE_INDEXING_PRIVATE_KEY to the service-account JSON "private_key" value, including BEGIN/END PRIVATE KEY. Quoted PEM, literal \\n, full service-account JSON, and base64 PEM are supported.'
    );
  }

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(keyObject);
  const jwt = `${signatureInput}.${base64UrlEncode(signature)}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Google OAuth Token Exchange Failed (${tokenResp.status}): ${errText}`);
  }

  const tokenData: any = await tokenResp.json();
  if (!tokenData?.access_token) throw new Error("Google OAuth token exchange returned no access_token.");
  return tokenData.access_token;
}

/**
 * Sends a URL_UPDATED or URL_DELETED request to Google Indexing API.
 * Only canonical AIJOBS /jobs/ URLs are eligible, preventing accidental
 * indexing requests for admin, API, preview, or non-production URLs.
 */
export async function sendGoogleIndexingNotification(
  job: { id: string; title: string; slug?: string; canonicalUrl?: string },
  requestType: "URL_UPDATED" | "URL_DELETED",
  submittedBy = "system"
): Promise<{ success: boolean; logId: string; responseCode: number; message: string }> {
  const logId = `idx_log_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  const db = getFirestoreDb();
  const targetJobUrl = getCanonicalJobUrl(job);

  if (!targetJobUrl.startsWith(`${SITE_URL}/jobs/`)) {
    return {
      success: false,
      logId,
      responseCode: 400,
      message: "Only canonical production AIJOBS job URLs may be sent to Google Indexing API."
    };
  }

  const credentials = getIndexingCredentials();
  const clientEmail = credentials.clientEmail;
  const privateKey = credentials.privateKey;

  if (!clientEmail || !privateKey) {
    const skippedLog: IndexingLogRecord = {
      id: logId,
      jobId: job.id,
      jobTitle: job.title || "Untitled Job",
      jobUrl: targetJobUrl,
      requestType,
      responseCode: 200,
      responseData: { note: "Google Indexing service-account credentials are not configured in the server environment." },
      status: "SKIPPED_MISSING_CREDENTIALS",
      error: "Missing GOOGLE_INDEXING_CLIENT_EMAIL/GOOGLE_INDEXING_PRIVATE_KEY and no Firebase Admin credential fallback is available.",
      submittedAt: timestamp,
      submittedBy
    };

    try {
      await db.collection("indexingLogs").doc(logId).set(skippedLog);
    } catch {
      console.warn("[GoogleIndexing] Deferred writing skipped indexing log to Firestore");
    }

    return {
      success: false,
      logId,
      responseCode: 200,
      message: "Indexing credentials missing in Vercel environment variables."
    };
  }

  try {
    console.info(`[GoogleIndexing] Using ${credentials.source} credentials for ${targetJobUrl}`);
    const accessToken = await getGoogleIndexingAccessToken(clientEmail, privateKey);

    const apiResp = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ url: targetJobUrl, type: requestType })
    });

    const respText = await apiResp.text();
    let respJson: any = respText;
    try {
      respJson = JSON.parse(respText);
    } catch {
      respJson = { raw: respText };
    }

    const isSuccess = apiResp.ok;
    const errorMessage = isSuccess ? undefined : extractGoogleError(respJson, respText, apiResp.status);
    const logRecord: IndexingLogRecord = {
      id: logId,
      jobId: job.id,
      jobTitle: job.title || "Untitled Job",
      jobUrl: targetJobUrl,
      requestType,
      responseCode: apiResp.status,
      responseData: { ...respJson, credentialSource: credentials.source },
      status: isSuccess ? "SUCCESS" : "FAILED",
      error: errorMessage,
      submittedAt: timestamp,
      submittedBy
    };

    await db.collection("indexingLogs").doc(logId).set(logRecord);

    await db.collection("jobs").doc(job.id).set({
      indexingStatus: isSuccess ? "SUCCESS" : "FAILED",
      lastIndexedAt: timestamp,
      canonicalUrl: targetJobUrl
    }, { merge: true });

    return {
      success: isSuccess,
      logId,
      responseCode: apiResp.status,
      message: isSuccess ? "Google Indexing API notified successfully" : (errorMessage || `API Error ${apiResp.status}`)
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("[GoogleIndexing] Exception occurred:", errMsg);

    const failedLog: IndexingLogRecord = {
      id: logId,
      jobId: job.id,
      jobTitle: job.title || "Untitled Job",
      jobUrl: targetJobUrl,
      requestType,
      responseCode: 500,
      responseData: { credentialSource: credentials.source },
      status: "FAILED",
      error: errMsg,
      submittedAt: timestamp,
      submittedBy
    };

    try {
      await db.collection("indexingLogs").doc(logId).set(failedLog);
    } catch {
      // Keep indexing notification failures non-fatal for job publishing.
    }

    return {
      success: false,
      logId,
      responseCode: 500,
      message: errMsg
    };
  }
}
