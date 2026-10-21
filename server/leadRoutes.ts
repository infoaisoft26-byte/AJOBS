import { Router, Request, Response } from "express";
import { getFirestoreDb, getFirebaseAuth } from "./firestoreHelper.js";

const router = Router();

/**
 * Server-side Admin Authorization Verification Helper
 * Protects against infinite Firestore hangs with a timeout race.
 */
async function checkAdminAuthorization(req: Request): Promise<{ authorized: boolean; reason?: string; statusCode?: number }> {
  const authHeader = String(req.headers.authorization || "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { authorized: false, reason: "A verified admin session is required.", statusCode: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { authorized: false, reason: "A verified admin session is required.", statusCode: 401 };
  }

  try {
    const auth = getFirebaseAuth();
    // Never decode an invalid token manually and never trust role/identity
    // supplied in headers, query parameters, or request bodies.
    const decoded = await auth.verifyIdToken(token, true);
    const db = getFirestoreDb();
    const [adminSnap, userSnap] = await Promise.all([
      db.collection("admins").doc(decoded.uid).get(),
      db.collection("users").doc(decoded.uid).get()
    ]);

    const adminData = adminSnap.exists ? (adminSnap.data() || {}) : {};
    const userData = userSnap.exists ? (userSnap.data() || {}) : {};
    const role = String(adminData.role || userData.role || (decoded as any).role || "").trim().toLowerCase();
    const status = String(adminData.status || userData.status || userData.accountStatus || "active").trim().toLowerCase();
    const inactive = userData.isActive === false || adminData.isActive === false ||
      ["disabled", "suspended", "inactive", "blocked"].includes(status);
    const adminRecord = adminSnap.exists && !inactive;
    const adminRole = ["admin", "superadmin", "super_admin"].includes(role) &&
      userData.isAdmin !== false && userData.isSuperAdmin !== false && !inactive;

    if (adminRecord || adminRole) return { authorized: true };
    return { authorized: false, reason: "Admin access required.", statusCode: 403 };
  } catch (error: any) {
    console.warn("[Lead API] Firebase admin authentication failed:", error?.message || "Invalid token");
    return { authorized: false, reason: "Authentication failed. Please sign in again.", statusCode: 401 };
  }
}

const inMemoryLeadsMap = new Map<string, any>();

/**
 * Common handler for GET and POST /api/leads/list
 */
async function handleListLeads(req: Request, res: Response) {
  // Always enforce JSON content type
  res.setHeader("Content-Type", "application/json");

  console.log(`[Leads] request started: path=${req.path}, method=${req.method}, ip=${req.ip}, authPresent=${!!req.headers.authorization}`);

  try {
    // 1. Verify caller authorization server-side
    const authResult = await checkAdminAuthorization(req);
    console.log(`[Leads] auth verified: authorized=${authResult.authorized}, statusCode=${authResult.statusCode || 200}, reason=${authResult.reason || 'authorized'}`);
    
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 403).json({
        success: false,
        error: authResult.reason || "Admin access required."
      });
    }

    const db = getFirestoreDb();

    // 2. Query Firestore with timeout protection
    const fetchPromise = (async () => {
      const leadsRef = db.collection("leads");
      let leadsSnap: any;

      try {
        leadsSnap = await leadsRef.orderBy("createdAt", "desc").limit(100).get();
        console.log(`[Leads] database queried: collection=leads (ordered), fetched=${leadsSnap?.size ?? 0} docs`);
      } catch (queryErr: any) {
        console.warn("[Lead API] orderBy createdAt failed, attempting raw fetch:", queryErr?.message || queryErr);
        try {
          leadsSnap = await leadsRef.limit(100).get();
          console.log(`[Leads] database queried: collection=leads (raw), fetched=${leadsSnap?.size ?? 0} docs`);
        } catch (rawErr: any) {
          console.error("[Lead API] Raw collection fetch error:", rawErr?.message || rawErr);
          throw rawErr;
        }
      }

      if (leadsSnap && !leadsSnap.empty) {
        const parseDate = (val: any): string => {
          if (!val) return new Date().toISOString();
          if (typeof val === "string") return val;
          if (typeof val === "object" && typeof val.toDate === "function") {
            try { return val.toDate().toISOString(); } catch { return new Date().toISOString(); }
          }
          if (val instanceof Date) return val.toISOString();
          try { return new Date(val).toISOString(); } catch { return new Date().toISOString(); }
        };

        leadsSnap.forEach((docSnap: any) => {
          const data = docSnap.data() || {};
          const name = data.candidateName || data.fullName || data.name || "Unknown Candidate";
          const email = data.candidateEmail || data.email || "";
          const phone = data.candidatePhone || data.mobile || data.phone || "";
          const status = data.status || data.currentStatus || data.pipelineStage || "new";
          const source = data.source || (data.consultancy && data.consultancy !== "Direct" ? "Agency" : "Unknown");
          const assignedTo = data.assignedTo || data.recruiter || "";

          const item = {
            id: docSnap.id,
            leadId: data.leadId || docSnap.id,
            candidateName: name,
            candidateEmail: email,
            candidatePhone: phone,
            fullName: name,
            email,
            mobile: phone,
            phone,
            status,
            source,
            medium: data.medium || data.utm_medium || "",
            assignedTo,
            role: data.role || "Candidate",
            campaign: data.campaign || data.utm_campaign || "Organic Search",
            content: data.content || data.utm_content || "",
            term: data.term || data.utm_term || "",
            gclid: data.gclid || "",
            landingPage: data.landingPage || data.marketingAttribution?.landingPage || "",
            kycStatus: data.kycStatus || "pending",
            nextFollowUpAt: data.nextFollowUpAt || null,
            adminNotes: data.adminNotes || "",
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDate(data.updatedAt || data.createdAt)
          };
          inMemoryLeadsMap.set(item.leadId, item);
        });
      }

      const leadsList = Array.from(inMemoryLeadsMap.values());
      leadsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      console.log(`[Leads] records count: ${leadsList.length}`);

      return {
        success: true,
        count: leadsList.length,
        leads: leadsList
      };
    })();

    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 2500)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if ("timeout" in result) {
      console.warn("[Lead API] Fetching leads from Firestore timed out; returning cached/local leads");
      const leadsList = Array.from(inMemoryLeadsMap.values());
      leadsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      console.log(`[Leads] timeout records count: ${leadsList.length}`);
      return res.status(200).json({
        success: true,
        count: leadsList.length,
        leads: leadsList
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[Leads] error code:", error?.code || error?.message || error);
    const leadsList = Array.from(inMemoryLeadsMap.values());
    leadsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return res.status(200).json({
      success: true,
      count: leadsList.length,
      leads: leadsList
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
  res.setHeader("Content-Type", "application/json");
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
    const name = fullName || "New Prospect";
    const phone = mobile || "";

    const leadData = {
      id: leadId,
      leadId,
      userId: userId || null,
      role: role || "Candidate",
      candidateName: name,
      fullName: name,
      candidateEmail: email || "",
      email: email || "",
      candidatePhone: phone,
      mobile: phone,
      phone,
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

    inMemoryLeadsMap.set(leadId, leadData);

    try {
      const db = getFirestoreDb();
      await db.collection("leads").doc(leadId).set(leadData);
    } catch (dbErr) {
      console.warn("[Lead API] Could not persist lead to Firestore, stored in memory:", dbErr);
    }

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
  res.setHeader("Content-Type", "application/json");
  const authResult = await checkAdminAuthorization(req);
  if (!authResult.authorized) {
    return res.status(authResult.statusCode || 403).json({
      success: false,
      error: authResult.reason || "Admin access required."
    });
  }

  try {
    const {
      leadId,
      status,
      assignedTo,
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
    if (assignedTo !== undefined) updatePayload.assignedTo = assignedTo;
    if (assignedConsultancyId !== undefined) updatePayload.assignedConsultancyId = assignedConsultancyId;
    if (assignedRecruiterId !== undefined) updatePayload.assignedRecruiterId = assignedRecruiterId;
    if (nextFollowUpAt) updatePayload.nextFollowUpAt = nextFollowUpAt;
    if (adminNotes !== undefined) updatePayload.adminNotes = adminNotes;

    const existingInMemory = inMemoryLeadsMap.get(leadId) || {};
    inMemoryLeadsMap.set(leadId, { ...existingInMemory, ...updatePayload });

    try {
      const db = getFirestoreDb();
      await db.collection("leads").doc(leadId).set(updatePayload, { merge: true });
    } catch (dbErr) {
      console.warn("[Lead API] Could not update lead in Firestore, updated in memory:", dbErr);
    }

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
