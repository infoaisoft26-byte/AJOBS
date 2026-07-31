import { Router } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const router = Router();

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
