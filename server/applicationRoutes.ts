import { Router } from "express";
import { getFirestoreDb, getFirebaseAuth } from "./firestoreHelper.js";
import { sendGoogleIndexingNotification } from "./googleIndexingService.js";

const router = Router();

router.post("/admin/jobs/review", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "Admin authentication required." });
    const decoded = await getFirebaseAuth().verifyIdToken(authHeader.slice(7).trim());
    const db = getFirestoreDb();
    let role = String((decoded as any).role || "").toLowerCase();
    if (!role || !["admin", "superadmin", "super_admin"].includes(role)) {
      const [userDoc, adminDoc] = await Promise.all([
        db.collection("users").doc(decoded.uid).get(),
        db.collection("admins").doc(decoded.uid).get()
      ]);
      role = String(userDoc.data()?.role || adminDoc.data()?.role || "").toLowerCase();
      const activeAdmin = adminDoc.exists && !["disabled", "suspended"].includes(String(adminDoc.data()?.status || "").toLowerCase());
      if (!["admin", "superadmin", "super_admin"].includes(role) && !activeAdmin) {
        return res.status(403).json({ success: false, error: "Only Admin or Super Admin can verify jobs." });
      }
    }

    const { jobId, decision, rejectionReason } = req.body || {};
    if (!jobId || !["approve", "reject"].includes(decision)) return res.status(400).json({ success: false, error: "Valid jobId and decision are required." });
    const jobRef = db.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return res.status(404).json({ success: false, error: "Job posting not found." });
    const job = jobSnap.data() || {};
    const now = new Date().toISOString();

    if (decision === "approve") {
      const missing = ["title", "companyName", "location", "description"].filter((key) => !String(job[key] || "").trim());
      if (missing.length) return res.status(400).json({ success: false, error: `Cannot publish: missing ${missing.join(", ")}.` });
      const slug = job.slug || `${String(job.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${jobId}`;
      const canonicalUrl = job.canonicalUrl || `${process.env.VITE_SITE_URL || "https://aijobs1.vercel.app"}/jobs/${slug}`;
      const update = { status: "live", approved: true, verificationStatus: "verified", candidateFeePolicyConfirmed: true, candidateFeePolicyVerifiedByAdmin: true, verifiedBy: decoded.uid, verifiedByEmail: decoded.email || "", verifiedAt: now, publishedAt: now, updatedAt: now, slug, canonicalUrl, googlePublishingStatus: "SUBMITTING" };
      const batch = db.batch();
      batch.set(jobRef, update, { merge: true });
      batch.set(db.collection("company_jobs").doc(jobId), update, { merge: true });
      batch.set(db.collection("consultancy_jobs").doc(jobId), update, { merge: true });
      batch.set(db.collection("audit_logs").doc(`job_review_${Date.now()}`), { action: "JOB_VERIFIED_AND_PUBLISHED", category: "Job", jobId, jobTitle: job.title, consultancyId: job.consultancyId || null, performedBy: decoded.uid, performedByEmail: decoded.email || "", createdAt: now });
      if (job.consultancyId) batch.set(db.collection("notifications").doc(`job_approved_${Date.now()}`), { userId: job.consultancyId, title: "Job verified and published", message: `${job.title} at ${job.companyName} was approved by AIJOBS Admin and submitted to Google.`, type: "success", read: false, createdAt: now, jobId });
      await batch.commit();
      const indexing = await sendGoogleIndexingNotification({ id: jobId, title: job.title, slug, canonicalUrl }, "URL_UPDATED", decoded.email || decoded.uid);
      await jobRef.set({ googlePublishingStatus: indexing.success ? "SUBMITTED" : "FAILED", googleIndexingLogId: indexing.logId, googleSubmittedAt: now }, { merge: true });
      return res.json({ success: true, status: "live", indexing: { success: indexing.success, status: indexing.success ? "SUBMITTED" : "FAILED", message: indexing.message } });
    }

    const update = { status: "rejected", approved: false, verificationStatus: "rejected", rejectionReason: String(rejectionReason || "Job verification requirements were not met."), reviewedBy: decoded.uid, reviewedAt: now, updatedAt: now, googlePublishingStatus: "NOT_SUBMITTED" };
    const batch = db.batch();
    batch.set(jobRef, update, { merge: true });
    batch.set(db.collection("company_jobs").doc(jobId), update, { merge: true });
    batch.set(db.collection("consultancy_jobs").doc(jobId), update, { merge: true });
    batch.set(db.collection("audit_logs").doc(`job_reject_${Date.now()}`), { action: "JOB_REJECTED", category: "Job", jobId, reason: update.rejectionReason, performedBy: decoded.uid, createdAt: now });
    if (job.consultancyId) batch.set(db.collection("notifications").doc(`job_rejected_${Date.now()}`), { userId: job.consultancyId, title: "Job needs correction", message: update.rejectionReason, type: "warning", read: false, createdAt: now, jobId });
    await batch.commit();
    return res.json({ success: true, status: "rejected" });
  } catch (err: any) {
    console.error("[/api/applications/admin/jobs/review]", err?.message || err);
    return res.status(500).json({ success: false, error: "Job review failed." });
  }
});

/**
 * GET /api/applications/timeline
 * Fetches the application status change history for an application.
 */
router.get("/timeline", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { applicationId } = req.query;

    if (!applicationId || typeof applicationId !== "string") {
      return res.status(400).json({ success: false, error: "Missing required applicationId parameter" });
    }

    const snap = await db
      .collection("applications")
      .doc(applicationId)
      .collection("timeline")
      .orderBy("createdAt", "desc")
      .get();

    const history = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({ success: true, history });
  } catch (err: any) {
    console.error("Error fetching application timeline:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to fetch application timeline" });
  }
});

/**
 * POST /api/applications/update-status
 * Updates application status, logs timeline entry, and triggers status change email notification.
 */
router.post("/update-status", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { applicationId, candidateId, jobId, newStatus, previousStatus, remarks, changedBy, changedByRole } = req.body;

    if (!applicationId || !newStatus) {
      return res.status(400).json({ success: false, error: "Missing applicationId or newStatus" });
    }

    const appRef = db.collection("applications").doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }

    const appData = appSnap.data() || {};

    // 1. Update application doc
    await appRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // 2. Add entry to timeline subcollection
    await appRef.collection("timeline").add({
      applicationId,
      changedBy: changedBy || "system",
      changedByRole: changedByRole || "admin",
      previousStatus: previousStatus || appData.status || "Applied",
      newStatus,
      remarks: remarks || "",
      createdAt: new Date().toISOString()
    });

    // 3. Trigger email notification via 'mail' collection (Firebase Trigger Email Extension)
    try {
      const candSnap = await db.collection("users").doc(candidateId || appData.candidateId).get();
      const candData = candSnap.exists ? candSnap.data() : null;

      if (candData && candData.email) {
        await db.collection("mail").add({
          to: [candData.email],
          message: {
            subject: `Application Status Updated: ${appData.jobTitle || "Job Application"} — AIJobs`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0b0f19; color: #ffffff; border-radius: 12px;">
                <h2 style="color: #6366f1; margin-bottom: 10px;">Application Status Notification</h2>
                <p>Hello <strong>${candData.name || "Candidate"}</strong>,</p>
                <p>Your application status for <strong>${appData.jobTitle || "Position"}</strong> at <strong>${appData.companyName || "AIJobs Partner"}</strong> has been updated.</p>
                
                <div style="background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px;"><strong>New Status:</strong> <span style="color: #10b981; font-weight: bold;">${newStatus}</span></p>
                  ${remarks ? `<p style="margin-top: 10px; font-size: 13px; color: #cbd5e1;"><em>Remarks: "${remarks}"</em></p>` : ""}
                </div>

                <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">
                  This is an automated notification sent by AIJobs. You can check full details on your candidate dashboard.
                </p>
              </div>
            `
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (emailErr) {
      console.warn("Failed to queue application status email:", emailErr);
    }

    return res.json({ success: true, message: "Application status updated successfully." });
  } catch (err: any) {
    console.error("Error updating application status:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update application status" });
  }
});

/**
 * POST /api/candidates/assign-recruiter
 * Assigns a candidate to a recruiter and logs assignment history.
 */
router.post("/assign-recruiter", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { candidateId, recruiterId, consultancyId, reassignmentReason } = req.body;

    if (!candidateId || !recruiterId) {
      return res.status(400).json({ success: false, error: "Missing candidateId or recruiterId" });
    }

    // 1. Check if candidate exists
    const candRef = db.collection("users").doc(candidateId);
    const candSnap = await candRef.get();

    if (!candSnap.exists) {
      return res.status(404).json({ success: false, error: "Candidate profile not found" });
    }

    const previousRecruiterId = candSnap.data()?.assignedRecruiterId || null;

    // 2. Update candidate record
    await candRef.update({
      assignedRecruiterId: recruiterId,
      assignedConsultancyId: consultancyId || candSnap.data()?.assignedConsultancyId || null,
      assignedAt: new Date().toISOString()
    });

    // 3. Log assignment in candidate_assignments collection
    await db.collection("candidate_assignments").add({
      candidateId,
      recruiterId,
      consultancyId: consultancyId || null,
      previousRecruiterId,
      reassignmentReason: reassignmentReason || "",
      assignedAt: new Date().toISOString(),
      status: "active"
    });

    return res.json({ success: true, message: "Candidate assigned to recruiter successfully" });
  } catch (err: any) {
    console.error("Error assigning candidate:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to assign candidate" });
  }
});

/**
 * GET /api/consultancy/recruiters-list
 * Lists recruiters associated with a consultancy.
 */
router.get("/recruiters-list", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { consultancyId } = req.query;

    if (!consultancyId || typeof consultancyId !== "string") {
      return res.status(400).json({ success: false, error: "Missing consultancyId parameter" });
    }

    const snap = await db
      .collection("users")
      .where("role", "==", "recruiter")
      .where("consultancyId", "==", consultancyId)
      .get();

    const recruiters = snap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data()
    }));

    return res.json({ success: true, recruiters });
  } catch (err: any) {
    console.error("Error fetching consultancy recruiters:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to fetch recruiters" });
  }
});

export default router;
