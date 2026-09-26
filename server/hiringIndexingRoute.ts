import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { sendGoogleIndexingNotification } from "./googleIndexingService.js";
import { getPublicSiteUrl } from "./siteConfig.js";

function normalizeRole(v: any) {
  return String(v || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function slugify(title: string, id: string) {
  const base = String(title || "job")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
  return `${base || "job"}-${id}`;
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

function isApprovedJob(job: any) {
  return normalizeRole(job?.status) === "approved" && job?.approved !== false;
}

function getSeoProblems(job: any) {
  const problems: string[] = [];
  if (!String(job?.title || job?.jobTitle || "").trim()) problems.push("missing title");
  if (!String(job?.companyName || job?.hiringOrganizationName || "").trim()) problems.push("missing company");
  if (!String(job?.description || job?.jobDescription || "").trim()) problems.push("missing description");
  const isRemote = normalizeRole(job?.workMode) === "remote" || normalizeRole(job?.jobLocationType) === "telecommute";
  if (!isRemote && !String(job?.location || job?.jobLocation || job?.city || "").trim()) problems.push("missing location");
  return problems;
}

async function backfillPublicSeo(jobRef: any, jobId: string, job: any) {
  const title = String(job.title || job.jobTitle || "Job").trim();
  const slug = String(job.slug || "").trim() || slugify(title, jobId);
  const canonicalUrl = String(job.canonicalUrl || job.publicUrl || "").trim() || `${getPublicSiteUrl()}/jobs/${slug}`;
  const patch: any = {};
  if (!job.slug) patch.slug = slug;
  if (!job.canonicalUrl) patch.canonicalUrl = canonicalUrl;
  if (!job.publicUrl) patch.publicUrl = canonicalUrl;
  if (!job.publishedAt) patch.publishedAt = job.approvedAt || job.updatedAt || new Date().toISOString();
  if (Object.keys(patch).length) {
    patch.updatedAt = new Date().toISOString();
    await jobRef.set(patch, { merge: true });
  }
  return { slug, canonicalUrl, title };
}

async function submitOneJob(db: any, decoded: any, jobId: string, requestType: "URL_UPDATED" | "URL_DELETED") {
  const jobRef = db.collection("jobs").doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) {
    return { success: false, jobId, error: "Job not found." };
  }

  const job: any = snap.data() || {};
  if (requestType === "URL_UPDATED" && !isApprovedJob(job)) {
    return { success: false, jobId, error: "Only approved jobs can be submitted for Google indexing." };
  }

  if (requestType === "URL_UPDATED") {
    const problems = getSeoProblems(job);
    if (problems.length) {
      return { success: false, jobId, error: `Google Jobs requirements incomplete: ${problems.join(", ")}.` };
    }
  }

  const seo = await backfillPublicSeo(jobRef, jobId, job);
  const now = new Date().toISOString();
  const result = await sendGoogleIndexingNotification(
    { id: jobId, title: seo.title, slug: seo.slug, canonicalUrl: seo.canonicalUrl },
    requestType,
    decoded.email || decoded.uid
  );

  await jobRef.set({
    googlePublishingStatus: result.success ? "SUBMITTED" : "FAILED",
    googleIndexing: {
      status: result.success ? "SUCCESS" : "FAILED",
      submittedAt: result.success ? now : null,
      lastAttemptAt: now,
      response: { code: result.responseCode, message: result.message, logId: result.logId },
      error: result.success ? null : result.message
    }
  }, { merge: true });

  return {
    success: result.success,
    jobId,
    canonicalUrl: seo.canonicalUrl,
    responseCode: result.responseCode,
    message: result.message,
    logId: result.logId
  };
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
    const allApproved = req.body?.allApproved === true || req.body?.jobId === "*";
    const requestType: "URL_UPDATED" | "URL_DELETED" = req.body?.requestType === "URL_DELETED" ? "URL_DELETED" : "URL_UPDATED";

    if (allApproved) {
      if (requestType === "URL_DELETED") {
        res.status(400).json({ success: false, error: "Bulk delete indexing is not allowed." });
        return true;
      }

      const snap = await db.collection("jobs").where("status", "==", "approved").get();
      const jobs = snap.docs.filter((d: any) => d.data()?.approved !== false);
      const results: any[] = [];

      // Keep requests sequential to stay within Google Indexing API quotas and
      // to make the admin response easy to audit per URL.
      for (const docSnap of jobs) {
        results.push(await submitOneJob(db, decoded, docSnap.id, "URL_UPDATED"));
      }

      const succeeded = results.filter(r => r.success).length;
      const failed = results.length - succeeded;
      res.json({
        success: failed === 0,
        mode: "allApproved",
        total: results.length,
        succeeded,
        failed,
        results
      });
      return true;
    }

    const jobId = String(req.body?.jobId || "").trim();
    if (!jobId) {
      res.status(400).json({ success: false, error: "jobId is required." });
      return true;
    }

    const result = await submitOneJob(db, decoded, jobId, requestType);
    if (!result.success) {
      const status = result.error === "Job not found." ? 404 : 409;
      res.status(status).json(result);
      return true;
    }

    res.json(result);
    return true;
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({ success: false, error: error?.message || "Indexing request failed." });
    return true;
  }
}
