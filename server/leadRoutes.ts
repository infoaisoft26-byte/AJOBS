import { Router, Request, Response } from "express";
import { getFirestoreDb, getFirebaseAuth } from "./firestoreHelper";

const router = Router();

/**
 * Server-side Admin Authorization Verification Helper
 */
async function checkAdminAuthorization(req: Request): Promise<{ authorized: boolean; reason?: string; statusCode?: number }> {
  try {
    const authHeader = req.headers.authorization || "";
    let uid: string | null = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]?.trim();
      if (token) {
        try {
          const auth = getFirebaseAuth();
          const decoded = await auth.verifyIdToken(token);
          uid = decoded.uid;
        } catch (tokenErr: any) {
          console.warn("[Lead API] ID token verification failed:", tokenErr?.message || tokenErr);
        }
      }
    }

    // Fallback headers/query
    if (!uid && req.headers["x-user-id"]) {
      uid = String(req.headers["x-user-id"]);
    } else if (!uid && req.query?.userId) {
      uid = String(req.query.userId);
    } else if (!uid && req.body?.userId) {
      uid = String(req.body.userId);
    }

    if (!uid) {
      return { authorized: false, reason: "Authentication token or user ID is required.", statusCode: 401 };
    }

    const db = getFirestoreDb();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      try {
        const fbUser = await getFirebaseAuth().getUser(uid);
        if (fbUser.email && (fbUser.email === "infoaisoft26@gmail.com" || fbUser.customClaims?.role === "admin")) {
          return { authorized: true };
        }
      } catch (e) {}
      return { authorized: false, reason: "User account not found.", statusCode: 403 };
    }

    const userData = userDoc.data() || {};
    const role = (userData.role || "").toLowerCase();
    const isAdmin =
      role === "admin" ||
      role === "superadmin" ||
      role === "super_admin" ||
      userData.isAdmin === true ||
      userData.email === "infoaisoft26@gmail.com";

    if (!isAdmin) {
      return { authorized: false, reason: "Access denied: Admin or Superadmin privileges required.", statusCode: 403 };
    }

    return { authorized: true };
  } catch (err: any) {
    console.error("[Lead API] Admin authorization check exception:", err?.message || err);
    return { authorized: false, reason: "Unable to verify admin authorization.", statusCode: 403 };
  }
}

/**
 * Common handler for GET and POST /api/leads/list
 */
async function handleListLeads(req: Request, res: Response) {
  // 1. Verify caller authorization server-side
  const authResult = await checkAdminAuthorization(req);
  if (!authResult.authorized) {
    return res.status(authResult.statusCode || 403).json({
      success: false,
      error: authResult.reason || "Unauthorized access: Admin privileges required."
    });
  }

  try {
    const db = getFirestoreDb();

    // 2. Query Firestore with timeout protection
    const fetchPromise = (async () => {
      const leadsRef = db.collection("leads");
      let leadsSnap;

      try {
        leadsSnap = await leadsRef.orderBy("createdAt", "desc").limit(100).get();
      } catch (queryErr: any) {
        console.warn("[Lead API] orderBy createdAt failed, attempting raw fetch:", queryErr?.message || queryErr);
        try {
          leadsSnap = await leadsRef.limit(100).get();
        } catch (rawErr: any) {
          console.error("[Lead API] Raw collection fetch error:", rawErr?.message || rawErr);
          throw rawErr;
        }
      }

      // Handle missing or empty collection safely
      if (!leadsSnap || leadsSnap.empty) {
        return { success: true, count: 0, leads: [] };
      }

      const leads: any[] = [];
      leadsSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        leads.push({
          id: docSnap.id,
          leadId: data.leadId || docSnap.id,
          fullName: data.fullName || "New Prospect",
          email: data.email || "",
          mobile: data.mobile || "",
          role: data.role || "Candidate",
          source: data.source || "Direct",
          campaign: data.campaign || "Organic Search",
          status: data.status || "new",
          kycStatus: data.kycStatus || "pending",
          nextFollowUpAt: data.nextFollowUpAt || null,
          adminNotes: data.adminNotes || "",
          assignedTo: data.assignedTo || "Unassigned",
          createdAt: data.createdAt || new Date().toISOString(),
          ...data
        });
      });

      // Sort client-side if raw fetch was used
      leads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return {
        success: true,
        count: leads.length,
        leads
      };
    })();

    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 5000)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if ("timeout" in result) {
      console.warn("[Lead API] Fetching leads timed out after 5s");
      return res.status(200).json({
        success: false,
        error: "Lead service is temporarily unavailable."
      });
    }

    return res.json(result);
  } catch (error: any) {
    console.error("[Lead API] List leads server-side exception:", error?.stack || error?.message || error);
    // Return safe JSON only - never HTML or 500 error stack trace
    return res.status(200).json({
      success: false,
      error: "Lead service is temporarily unavailable."
    });
  }
}

/**
 * Endpoints for /list (both GET and POST)
 */
router.get("/list", handleListLeads);
router.post("/list", handleListLeads);

/**
 * Capture or Create Lead
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
    } = req.body || {};

    if (!email && !mobile) {
      return res.status(400).json({ success: false, error: "Email or mobile number is required" });
    }

    const nowIso = new Date().toISOString();
    const leadSource = source || utm_source || "Direct";
    const leadCampaign = campaign || utm_campaign || "Organic Search";

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const db = getFirestoreDb();
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
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
    return res.status(200).json({ success: false, error: "Lead service is temporarily unavailable." });
  }
});

/**
 * Update Lead Status / Notes / Follow-up / Assignment
 */
router.post("/update", async (req, res) => {
  const authResult = await checkAdminAuthorization(req);
  if (!authResult.authorized) {
    return res.status(authResult.statusCode || 403).json({
      success: false,
      error: authResult.reason || "Unauthorized access: Admin privileges required."
    });
  }

  try {
    const {
      leadId,
      status,
      assignedConsultancyId,
      assignedRecruiterId,
      nextFollowUpAt,
      adminNotes
    } = req.body || {};

    if (!leadId) {
      return res.status(400).json({ success: false, error: "leadId is required" });
    }

    const nowIso = new Date().toISOString();
    const updatePayload: any = { updatedAt: nowIso };

    if (status) updatePayload.status = status;
    if (assignedConsultancyId !== undefined) updatePayload.assignedConsultancyId = assignedConsultancyId;
    if (assignedRecruiterId !== undefined) updatePayload.assignedRecruiterId = assignedRecruiterId;
    if (nextFollowUpAt) updatePayload.nextFollowUpAt = nextFollowUpAt;
    if (adminNotes !== undefined) updatePayload.adminNotes = adminNotes;

    const db = getFirestoreDb();
    await db.collection("leads").doc(leadId).set(updatePayload, { merge: true });

    return res.json({
      success: true,
      message: `Lead ${leadId} updated successfully.`
    });
  } catch (error: any) {
    console.error("[Lead API] Update lead error:", error);
    return res.status(200).json({ success: false, error: "Lead service is temporarily unavailable." });
  }
});

export default router;
