import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { sendGoogleIndexingNotification } from "./googleIndexingService.js";
import { getPublicSiteUrl } from "./siteConfig.js";

function normRole(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function requireAdmin(req: Request) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) throw Object.assign(new Error("Admin authentication required."), { status: 401 });
  const decoded = await getFirebaseAuth().verifyIdToken(header.slice(7).trim(), true);
  const db = getFirestoreDb();
  const [userDoc, adminDoc, employeeDoc] = await Promise.all([
    db.collection("users").doc(decoded.uid).get(),
    db.collection("admins").doc(decoded.uid).get(),
    db.collection("employees").doc(decoded.uid).get()
  ]);
  const user = userDoc.data() || {};
  const admin = adminDoc.data() || {};
  const employee = employeeDoc.data() || {};
  const role = normRole((decoded as any).role || user.role || admin.role || employee.role);
  const adminStatus = normRole(admin.status || "active");
  const employeeStatus = normRole(employee.status || user.status || "active");
  const activeAdmin = adminDoc.exists && !["disabled", "suspended", "inactive"].includes(adminStatus);
  const permissions = [
    ...(Array.isArray(user.permissions) ? user.permissions : []),
    ...(Array.isArray(employee.permissions) ? employee.permissions : [])
  ].map(normRole);
  const canReviewJobs = employee.canApproveJobs === true || user.canApproveJobs === true ||
    permissions.some((permission: string) => ["approve_jobs", "job_approver", "jobs_approve", "job_review"].includes(permission));
  const activeEmployeeApprover = employeeDoc.exists && canReviewJobs &&
    !["disabled", "suspended", "inactive", "terminated"].includes(employeeStatus);
  if (!["admin", "superadmin", "super_admin"].includes(role) && !activeAdmin && !activeEmployeeApprover) {
    throw Object.assign(new Error("Only Admin, Super Admin, or an authorized AIJOBS job-review employee can verify jobs."), { status: 403 });
  }
  return { decoded, db, reviewerRole: activeEmployeeApprover ? "employee" : role };
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function slugify(title: string, id: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 70);
  return `${base || "job"}-${id}`;
}

export async function handleAdminJobReviewRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/applications/admin/jobs/review") return false;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  try {
    const { decoded, db, reviewerRole } = await requireAdmin(req);
    const jobId = firstText(req.body?.jobId);
    const decision = normRole(req.body?.decision);
    const rejectionReason = firstText(req.body?.rejectionReason, "Job verification requirements were not met.");
    if (!jobId || !["approve", "reject"].includes(decision)) {
      res.status(400).json({ success: false, error: "Valid jobId and decision are required." });
      return true;
    }

    const jobRef = db.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      res.status(404).json({ success: false, error: "Job posting not found." });
      return true;
    }

    const job: any = jobSnap.data() || {};
    const title = firstText(job.title, job.jobTitle, job.positionTitle);
    const companyName = firstText(job.companyName, job.hiringOrganizationName, job.company, job.clientCompanyName);
    const location = firstText(job.location, job.jobLocation, job.city, job.workLocation, job.workMode === "Remote" ? "Remote" : "");
    const description = firstText(job.description, job.jobDescription, job.responsibilities, job.summary);
    const now = new Date().toISOString();

    if (decision === "reject") {
      const update = {
        status: "rejected",
        approvalStatus: "rejected",
        approved: false,
        verificationStatus: "rejected",
        rejectionReason,
        reviewedBy: decoded.uid,
        reviewedByRole: reviewerRole,
        reviewedAt: now,
        updatedAt: now,
        googlePublishingStatus: "NOT_SUBMITTED"
      };
      const batch = db.batch();
      batch.set(jobRef, update, { merge: true });
      batch.set(db.collection("company_jobs").doc(jobId), update, { merge: true });
      batch.set(db.collection("consultancy_jobs").doc(jobId), update, { merge: true });
      batch.set(db.collection("audit_logs").doc(`job_reject_${Date.now()}`), {
        action: "JOB_REJECTED", category: "Job", jobId, jobTitle: title || jobId, reason: rejectionReason,
        performedBy: decoded.uid, performedByEmail: decoded.email || "", performedByRole: reviewerRole, createdAt: now
      });
      const ownerUid = firstText(job.ownerUid, job.recruiterId, job.consultancyId, job.employerId, job.createdBy, job.postedBy);
      if (ownerUid) batch.set(db.collection("notifications").doc(`job_rejected_${Date.now()}`), {
        userId: ownerUid, title: "Job rejected", message: rejectionReason, type: "warning", read: false, createdAt: now, jobId
      });
      await batch.commit();
      res.json({ success: true, status: "rejected" });
      return true;
    }

    const missing: string[] = [];
    if (!title) missing.push("job title");
    if (!companyName) missing.push("company name");
    if (!location) missing.push("location");
    if (!description) missing.push("job description");
    if (missing.length) {
      res.status(400).json({ success: false, error: `Cannot publish this job yet. Missing: ${missing.join(", ")}. Please edit the job and add these details first.` });
      return true;
    }

    const slug = firstText(job.slug) || slugify(title, jobId);
    const canonicalUrl = firstText(job.canonicalUrl, job.publicUrl) || `${getPublicSiteUrl()}/jobs/${slug}`;
    const update = {
      title,
      jobTitle: title,
      companyName,
      location,
      jobLocation: location,
      description,
      jobDescription: description,
      status: "approved",
      approvalStatus: "approved",
      approved: true,
      verificationStatus: "verified",
      candidateFeePolicyConfirmed: true,
      candidateFeePolicyVerifiedByAdmin: true,
      reviewedBy: decoded.uid,
        reviewedByRole: reviewerRole,
      reviewedAt: now,
      approvedAt: now,
      verifiedBy: decoded.uid,
      verifiedByEmail: decoded.email || "",
      verifiedAt: now,
      publishedAt: now,
      updatedAt: now,
      slug,
      canonicalUrl,
      publicUrl: canonicalUrl,
      googlePublishingStatus: "SUBMITTING"
    };

    const batch = db.batch();
    batch.set(jobRef, update, { merge: true });
    batch.set(db.collection("company_jobs").doc(jobId), update, { merge: true });
    batch.set(db.collection("consultancy_jobs").doc(jobId), update, { merge: true });
    batch.set(db.collection("audit_logs").doc(`job_review_${Date.now()}`), {
      action: "JOB_VERIFIED_AND_PUBLISHED", category: "Job", jobId, jobTitle: title,
      performedBy: decoded.uid, performedByEmail: decoded.email || "", performedByRole: reviewerRole, createdAt: now
    });
    const ownerUid = firstText(job.ownerUid, job.recruiterId, job.consultancyId, job.employerId, job.createdBy, job.postedBy);
    if (ownerUid) batch.set(db.collection("notifications").doc(`job_approved_${Date.now()}`), {
      userId: ownerUid, title: "Job approved and published", message: `${title} at ${companyName} was approved by AIJOBS Admin.`,
      type: "success", read: false, createdAt: now, jobId, link: canonicalUrl
    });
    await batch.commit();

    let indexing = { success: false, status: "FAILED", message: "Google indexing was not attempted." } as any;
    try {
      const result: any = await sendGoogleIndexingNotification({ id: jobId, title, slug, canonicalUrl }, "URL_UPDATED", decoded.email || decoded.uid);
      indexing = { success: !!result?.success, status: result?.success ? "SUBMITTED" : "FAILED", message: result?.message || "" };
      await jobRef.set({
        googlePublishingStatus: indexing.status,
        googleIndexingLogId: result?.logId || null,
        googleSubmittedAt: result?.success ? now : null,
        googleIndexing: {
          status: indexing.status,
          submittedAt: result?.success ? now : null,
          lastAttemptAt: now,
          response: result?.success ? result?.message || null : null,
          error: result?.success ? null : result?.message || "Indexing request failed"
        }
      }, { merge: true });
    } catch (indexError: any) {
      console.warn("[AdminJobReview] Google indexing failed after job approval:", indexError?.message || indexError);
      indexing = { success: false, status: "FAILED", message: indexError?.message || "Google indexing failed." };
      await jobRef.set({
        googlePublishingStatus: "FAILED",
        googleIndexing: { status: "FAILED", submittedAt: null, lastAttemptAt: now, response: null, error: indexing.message }
      }, { merge: true }).catch(() => undefined);
    }

    res.json({ success: true, status: "approved", canonicalUrl, indexing });
    return true;
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    console.error("[/api/applications/admin/jobs/review]", error?.message || error);
    res.status(status).json({ success: false, error: error?.message || "Job review failed." });
    return true;
  }
}
