import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { sendGoogleIndexingNotification } from "./googleIndexingService.js";

function normalizeRole(v: any) {
  return String(v || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function requireAdmin(req: Request) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw Object.assign(new Error("Authentication required."), { status: 401 });
  const decoded = await getFirebaseAuth().verifyIdToken(token, true);
  const db = getFirestoreDb();
  const [userSnap, adminSnap] = await Promise.all([
    db.collection("users").doc(decoded.uid).get(),
    db.collection("admins").doc(decoded.uid).get()
  ]);
  const role = normalizeRole(userSnap.data()?.role || decoded.role);
  if (!(role === "admin" || role === "superadmin" || role === "super_admin" || adminSnap.exists)) {
    throw Object.assign(new Error("Admin access required."), { status: 403 });
  }
  return { decoded, db };
}

export async function handleHiringIndexingRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/hire/admin/index-job") return false;
  try {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed." });
      return true;
    }
    const { decoded, db } = await requireAdmin(req);
    const jobId = String(req.body?.jobId || "").trim();
    const requestType = req.body?.requestType === "URL_DELETED" ? "URL_DELETED" : "URL_UPDATED";
    if (!jobId) {
      res.status(400).json({ success: false, error: "jobId is required." });
      return true;
    }
    const jobRef = db.collection("jobs").doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Job not found." });
      return true;
    }
    const job: any = snap.data() || {};
    if (requestType === "URL_UPDATED" && String(job.status).toLowerCase() !== "approved") {
      res.status(409).json({ success: false, error: "Only approved jobs can be submitted for Google indexing." });
      return true;
    }
    const now = new Date().toISOString();
    const result = await sendGoogleIndexingNotification({ id: jobId, title: job.title || "Job", slug: job.slug, canonicalUrl: job.canonicalUrl || job.publicUrl }, requestType, decoded.email || decoded.uid);
    await jobRef.set({
      googleIndexing: {
        status: result.success ? "SUCCESS" : "FAILED",
        submittedAt: now,
        lastAttemptAt: now,
        response: { code: result.responseCode, message: result.message, logId: result.logId },
        error: result.success ? null : result.message
      }
    }, { merge: true });
    res.json({ success: result.success, ...result });
    return true;
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({ success: false, error: error?.message || "Indexing request failed." });
    return true;
  }
}
