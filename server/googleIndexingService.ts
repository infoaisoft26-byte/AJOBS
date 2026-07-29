import crypto from "crypto";
import { getFirestoreDb } from "./firestoreHelper";

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

const SITE_URL = process.env.VITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://aijobs1.vercel.app";

function base64UrlEncode(str: string | Buffer): string {
  const base64 = typeof str === "string" ? Buffer.from(str).toString("base64") : str.toString("base64");
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
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

  // Formatted private key with newlines
  const formattedPrivateKey = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  const signature = signer.sign(formattedPrivateKey);
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

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

/**
 * Sends a URL_UPDATED or URL_DELETED request to Google Indexing API
 * and logs the response in Firestore `indexingLogs`.
 */
export async function sendGoogleIndexingNotification(
  job: { id: string; title: string; slug?: string; canonicalUrl?: string },
  requestType: "URL_UPDATED" | "URL_DELETED",
  submittedBy = "system"
): Promise<{ success: boolean; logId: string; responseCode: number; message: string }> {
  const logId = `idx_log_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  const db = getFirestoreDb();

  const slug = job.slug || `${(job.title || "job").toLowerCase().replace(/[^a-z0-9]/g, "-")}-${job.id}`;
  const targetJobUrl = job.canonicalUrl || `${SITE_URL}/jobs/${slug}`;

  const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    const skippedLog: IndexingLogRecord = {
      id: logId,
      jobId: job.id,
      jobTitle: job.title || "Untitled Job",
      jobUrl: targetJobUrl,
      requestType,
      responseCode: 200,
      responseData: { note: "Service account credentials not configured in environment. Indexing request queued." },
      status: "SKIPPED_MISSING_CREDENTIALS",
      error: "GOOGLE_INDEXING_CLIENT_EMAIL or GOOGLE_INDEXING_PRIVATE_KEY missing in server environment variables.",
      submittedAt: timestamp,
      submittedBy
    };

    try {
      await db.collection("indexingLogs").doc(logId).set(skippedLog);
    } catch (e) {
      console.warn("[GoogleIndexing] Deferred writing skipped indexing log to Firestore");
    }

    return {
      success: false,
      logId,
      responseCode: 200,
      message: "Credentials missing. Logged as SKIPPED_MISSING_CREDENTIALS."
    };
  }

  try {
    const accessToken = await getGoogleIndexingAccessToken(clientEmail, privateKey);

    const apiResp = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: targetJobUrl,
        type: requestType
      })
    });

    const respText = await apiResp.text();
    let respJson: any = respText;
    try {
      respJson = JSON.parse(respText);
    } catch {
      respJson = { raw: respText };
    }

    const isSuccess = apiResp.ok;
    const logRecord: IndexingLogRecord = {
      id: logId,
      jobId: job.id,
      jobTitle: job.title || "Untitled Job",
      jobUrl: targetJobUrl,
      requestType,
      responseCode: apiResp.status,
      responseData: respJson,
      status: isSuccess ? "SUCCESS" : "FAILED",
      error: isSuccess ? undefined : `API Error ${apiResp.status}: ${respText}`,
      submittedAt: timestamp,
      submittedBy
    };

    await db.collection("indexingLogs").doc(logId).set(logRecord);

    // Update indexing status on job document
    await db.collection("jobs").doc(job.id).set({
      indexingStatus: isSuccess ? "SUCCESS" : "FAILED",
      lastIndexedAt: timestamp,
      canonicalUrl: targetJobUrl
    }, { merge: true });

    return {
      success: isSuccess,
      logId,
      responseCode: apiResp.status,
      message: isSuccess ? "Google Indexing API notified successfully" : `API Error ${apiResp.status}`
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
      status: "FAILED",
      error: errMsg,
      submittedAt: timestamp,
      submittedBy
    };

    try {
      await db.collection("indexingLogs").doc(logId).set(failedLog);
    } catch (e) {}

    return {
      success: false,
      logId,
      responseCode: 500,
      message: errMsg
    };
  }
}
