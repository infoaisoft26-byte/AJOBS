import { Router } from "express";
import { getFirestoreDb } from "./firestoreHelper";

const router = Router();

/**
 * 1. Capture or Create Lead
 */
router.post("/create", async (req, res) => {
  try {
    const {
      userId,
      role,
      fullName,
      email,
      mobile,
      city,
      source,
      medium,
      campaign,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      referralCode,
      landingPage,
      firstVisitAt,
      assignedConsultancyId,
      assignedRecruiterId
    } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({ success: false, error: "Email or mobile number is required" });
    }

    const db = getFirestoreDb();
    const nowIso = new Date().toISOString();

    // Determine lead source priority
    const leadSource = source || utm_source || "Direct";
    const leadCampaign = campaign || utm_campaign || "Organic Search";

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const leadRef = db.collection("leads").doc(leadId);

    const leadData = {
      leadId,
      userId: userId || null,
      role: role || "Candidate",
      fullName: fullName || "New Prospect",
      email: email || "",
      mobile: mobile || "",
      city: city || "Unknown / India",
      source: leadSource,
      medium: medium || utm_medium || "web",
      campaign: leadCampaign,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      referralCode: referralCode || null,
      landingPage: landingPage || "/",
      firstVisitAt: firstVisitAt || nowIso,
      registeredAt: userId ? nowIso : null,
      status: "new",
      assignedTo: assignedRecruiterId ? "Recruiter" : assignedConsultancyId ? "Consultancy" : "Unassigned",
      assignedRecruiterId: assignedRecruiterId || null,
      assignedConsultancyId: assignedConsultancyId || null,
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default 24h follow-up
      adminNotes: `Lead captured via ${leadSource} (${leadCampaign})`,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await leadRef.set(leadData);

    return res.json({
      success: true,
      leadId,
      message: "Lead recorded successfully in CRM."
    });
  } catch (error: any) {
    console.error("[Lead API] Create lead error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Get All Live Leads (Admin CRM API)
 */
router.get("/list", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const leadsSnap = await db.collection("leads").orderBy("createdAt", "desc").limit(100).get();

    const leads: any[] = [];
    leadsSnap.forEach((docSnap) => {
      leads.push({ id: docSnap.id, ...docSnap.data() });
    });

    return res.json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error: any) {
    console.error("[Lead API] List leads error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Update Lead Status / Notes / Follow-up / Assignment
 */
router.post("/update", async (req, res) => {
  try {
    const {
      leadId,
      status,
      assignedConsultancyId,
      assignedRecruiterId,
      nextFollowUpAt,
      adminNotes
    } = req.body;

    if (!leadId) {
      return res.status(400).json({ success: false, error: "leadId is required" });
    }

    const db = getFirestoreDb();
    const nowIso = new Date().toISOString();

    const updatePayload: any = {
      updatedAt: nowIso
    };

    if (status) updatePayload.status = status;
    if (assignedConsultancyId !== undefined) updatePayload.assignedConsultancyId = assignedConsultancyId;
    if (assignedRecruiterId !== undefined) updatePayload.assignedRecruiterId = assignedRecruiterId;
    if (nextFollowUpAt) updatePayload.nextFollowUpAt = nextFollowUpAt;
    if (adminNotes !== undefined) updatePayload.adminNotes = adminNotes;

    await db.collection("leads").doc(leadId).set(updatePayload, { merge: true });

    return res.json({
      success: true,
      message: `Lead ${leadId} updated successfully.`
    });
  } catch (error: any) {
    console.error("[Lead API] Update lead error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
