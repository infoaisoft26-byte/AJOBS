import { Router, Request, Response } from "express";
import { getFirestoreDb, getFirebaseAuth } from "./firestoreHelper.js";

const router = Router();
const inMemoryLeadsMap = new Map<string, any>();

function normalizeRole(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseDate(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value && typeof value.toDate === "function") {
    try { return value.toDate().toISOString(); } catch { return new Date().toISOString(); }
  }
  if (value instanceof Date) return value.toISOString();
  try {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function checkAdminAuthorization(req: Request): Promise<{ authorized: boolean; reason?: string; statusCode?: number }> {
  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return { authorized: false, reason: "Authentication required.", statusCode: 401 };
    }

    let decoded: any;
    try {
      decoded = await getFirebaseAuth().verifyIdToken(authHeader.slice(7).trim(), true);
    } catch (tokenErr: any) {
      console.warn("[Lead API] Firebase ID token rejected:", tokenErr?.message || "Invalid token");
      return { authorized: false, reason: "Invalid or expired authentication token.", statusCode: 401 };
    }

    const db = getFirestoreDb();
    const [userDoc, adminDoc] = await Promise.all([
      db.collection("users").doc(decoded.uid).get(),
      db.collection("admins").doc(decoded.uid).get()
    ]);

    const userData = userDoc.data() || {};
    const adminData = adminDoc.data() || {};
    const role = normalizeRole(userData.role || adminData.role || adminData.level || decoded.role);
    const status = String(userData.status || userData.accountStatus || adminData.status || "active").toLowerCase();
    const active = !["disabled", "suspended", "inactive", "blocked"].includes(status)
      && userData.isActive !== false
      && adminData.isActive !== false;

    if (["admin", "superadmin", "super_admin"].includes(role) && active) {
      return { authorized: true };
    }

    return { authorized: false, reason: "Active Admin or Super Admin role required.", statusCode: 403 };
  } catch (err: any) {
    console.error("[Lead API] Admin authorization check exception:", err?.message || err);
    return { authorized: false, reason: "Admin access required.", statusCode: 403 };
  }
}

function toCrmItem(id: string, data: any, defaults: Record<string, any> = {}) {
  const role = normalizeRole(data.role || defaults.role || "candidate") || "candidate";
  const name = data.candidateName || data.fullName || data.name || data.displayName || defaults.name || "New Prospect";
  const email = String(data.candidateEmail || data.email || data.workEmail || defaults.email || "").trim().toLowerCase();
  const phone = String(data.candidatePhone || data.mobile || data.mobileNumber || data.phone || defaults.phone || "").trim();
  const jobTitle = data.jobTitle || data.sourceJobTitle || defaults.jobTitle || "";
  const companyName = data.companyName || data.company || defaults.companyName || "";
  const createdAt = parseDate(data.createdAt || data.appliedAt || data.registeredAt || data.firstCapturedAt || defaults.createdAt);
  const updatedAt = parseDate(data.updatedAt || data.lastActiveAt || data.createdAt || defaults.updatedAt || createdAt);

  return {
    id,
    leadId: data.leadId || id,
    userId: data.userId || data.uid || data.candidateId || defaults.userId || null,
    candidateId: data.candidateId || defaults.candidateId || null,
    candidateName: name,
    fullName: name,
    candidateEmail: email,
    email,
    candidatePhone: phone,
    mobile: phone,
    phone,
    role,
    companyName,
    jobId: data.jobId || data.sourceJobId || defaults.jobId || null,
    jobTitle,
    location: data.location || data.city || data.candidateLocation || defaults.location || "",
    experience: data.experience || data.candidateExperience || defaults.experience || "",
    qualification: data.qualification || defaults.qualification || "",
    resumeUrl: data.resumeUrl || data.resume || defaults.resumeUrl || null,
    source: data.source || defaults.source || "Direct",
    medium: data.medium || data.marketingAttribution?.medium || defaults.medium || "web",
    campaign: data.campaign || data.marketingAttribution?.campaign || defaults.campaign || (jobTitle ? jobTitle : "Organic"),
    status: data.status || data.currentStatus || data.applicationStatus || defaults.status || "new",
    currentStatus: data.currentStatus || data.status || data.applicationStatus || defaults.status || "new",
    accountStatus: data.accountStatus || defaults.accountStatus || null,
    verificationStatus: data.verificationStatus || defaults.verificationStatus || null,
    registrationType: defaults.registrationType || data.registrationType || "lead",
    registeredAt: data.registeredAt || (defaults.registrationType === "registration" ? createdAt : null),
    appliedAt: data.appliedAt || defaults.appliedAt || null,
    assignedTo: data.assignedTo || data.recruiter || defaults.assignedTo || "",
    assignedRecruiterId: data.assignedRecruiterId || data.recruiterId || defaults.assignedRecruiterId || null,
    assignedConsultancyId: data.assignedConsultancyId || data.consultancyId || defaults.assignedConsultancyId || null,
    kycStatus: data.kycStatus || defaults.kycStatus || "pending",
    nextFollowUpAt: data.nextFollowUpAt || defaults.nextFollowUpAt || null,
    adminNotes: data.adminNotes || defaults.adminNotes || "",
    createdAt,
    updatedAt
  };
}

async function readCollection(db: any, name: string, limit = 250) {
  try {
    const snap = await db.collection(name).limit(limit).get();
    return snap.docs.map((doc: any) => ({ id: doc.id, data: doc.data() || {} }));
  } catch (error: any) {
    console.warn(`[Lead API] ${name} read warning:`, error?.message || error);
    return [] as Array<{ id: string; data: any }>;
  }
}

async function handleListLeads(req: Request, res: Response) {
  res.setHeader("Content-Type", "application/json");

  const authResult = await checkAdminAuthorization(req);
  if (!authResult.authorized) {
    return res.status(authResult.statusCode || 403).json({
      success: false,
      error: authResult.reason || "Admin access required."
    });
  }

  try {
    const db = getFirestoreDb();
    const [leadRows, candidateLeadRows, applicationRows, userRows] = await Promise.all([
      readCollection(db, "leads"),
      readCollection(db, "candidate_leads"),
      readCollection(db, "applications"),
      readCollection(db, "users")
    ]);

    const records = new Map<string, any>();

    // Existing CRM leads remain visible.
    for (const row of leadRows) {
      const item = toCrmItem(row.id, row.data, { registrationType: "lead" });
      records.set(`lead:${row.id}`, item);
      inMemoryLeadsMap.set(item.leadId, item);
    }

    // Public no-registration job applications / lead capture.
    for (const row of candidateLeadRows) {
      const item = toCrmItem(row.id, row.data, {
        role: "candidate",
        source: row.data.source || "Job Quick Apply",
        registrationType: "job_application_lead",
        status: row.data.status || "new",
        adminNotes: row.data.sourceJobTitle ? `Applied for ${row.data.sourceJobTitle}` : "Candidate captured from a public job application."
      });
      records.set(`candidate_lead:${row.id}`, item);
    }

    // Every job application is shown in Admin CRM, including registered candidates.
    for (const row of applicationRows) {
      const item = toCrmItem(row.id, row.data, {
        role: "candidate",
        source: row.data.source || "Job Application",
        registrationType: "job_application",
        status: row.data.applicationStatus || row.data.status || "applied",
        appliedAt: row.data.appliedAt || row.data.createdAt || null,
        adminNotes: `Applied for ${row.data.jobTitle || "job"}${row.data.companyName ? ` at ${row.data.companyName}` : ""}.`
      });
      records.set(`application:${row.id}`, item);
    }

    // Every real portal registration is shown separately by role.
    for (const row of userRows) {
      const normalized = normalizeRole(row.data.role);
      if (!["candidate", "recruiter", "consultancy", "employer"].includes(normalized)) continue;

      const item = toCrmItem(row.id, { ...row.data, role: normalized }, {
        userId: row.id,
        role: normalized,
        source: row.data.marketingAttribution?.source || row.data.registrationSource || "AIJOBS Registration",
        medium: row.data.marketingAttribution?.medium || "registration",
        campaign: row.data.marketingAttribution?.campaign || `${normalized}_registration`,
        registrationType: "registration",
        status: row.data.accountStatus || row.data.status || "active",
        accountStatus: row.data.accountStatus || row.data.status || "active",
        verificationStatus: row.data.verificationStatus || (row.data.emailVerified ? "verified" : "pending"),
        adminNotes: `${normalized.charAt(0).toUpperCase() + normalized.slice(1)} registered on AIJOBS.`
      });
      records.set(`registration:${row.id}`, item);
    }

    const leads = Array.from(records.values()).sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const summary = {
      candidates: userRows.filter(r => normalizeRole(r.data.role) === "candidate").length,
      recruiters: userRows.filter(r => normalizeRole(r.data.role) === "recruiter").length,
      consultancies: userRows.filter(r => normalizeRole(r.data.role) === "consultancy").length,
      employers: userRows.filter(r => normalizeRole(r.data.role) === "employer").length,
      applications: applicationRows.length,
      quickApplyLeads: candidateLeadRows.length
    };

    return res.status(200).json({
      success: true,
      count: leads.length,
      summary,
      leads
    });
  } catch (error: any) {
    console.error("[Leads] unified CRM error:", error?.message || error);
    const cached = Array.from(inMemoryLeadsMap.values()).sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return res.status(200).json({ success: true, count: cached.length, leads: cached, cached: true });
  }
}

router.get("/list", handleListLeads);
router.post("/list", handleListLeads);

router.post("/create", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const body = req.body || {};
    if (!body.email && !body.mobile) {
      return res.status(400).json({ success: false, error: "Email or mobile number is required" });
    }

    const nowIso = new Date().toISOString();
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const name = body.fullName || body.name || "New Prospect";
    const phone = body.mobile || body.phone || "";
    const source = body.source || body.utm_source || "Direct";
    const campaign = body.campaign || body.utm_campaign || "Organic Search";

    const leadData = {
      id: leadId,
      leadId,
      userId: body.userId || null,
      role: normalizeRole(body.role || "candidate") || "candidate",
      candidateName: name,
      fullName: name,
      candidateEmail: body.email || "",
      email: body.email || "",
      candidatePhone: phone,
      mobile: phone,
      phone,
      city: body.city || "",
      source,
      medium: body.medium || body.utm_medium || "web",
      campaign,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      referralCode: body.referralCode || null,
      landingPage: body.landingPage || "/",
      firstVisitAt: body.firstVisitAt || nowIso,
      registeredAt: body.userId ? nowIso : null,
      status: "new",
      assignedTo: body.assignedRecruiterId ? "Recruiter" : body.assignedConsultancyId ? "Consultancy" : "Unassigned",
      assignedRecruiterId: body.assignedRecruiterId || null,
      assignedConsultancyId: body.assignedConsultancyId || null,
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      adminNotes: `Lead captured via ${source} (${campaign})`,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    inMemoryLeadsMap.set(leadId, leadData);
    try {
      await getFirestoreDb().collection("leads").doc(leadId).set(leadData);
    } catch (dbErr) {
      console.warn("[Lead API] Could not persist lead to Firestore:", dbErr);
    }

    return res.json({ success: true, leadId, message: "Lead recorded successfully in CRM." });
  } catch (error: any) {
    console.error("[Lead API] Create lead error:", error);
    return res.status(500).json({ success: false, error: "Lead service is temporarily unavailable." });
  }
});

router.post("/update", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const authResult = await checkAdminAuthorization(req);
  if (!authResult.authorized) {
    return res.status(authResult.statusCode || 403).json({ success: false, error: authResult.reason || "Admin access required." });
  }

  try {
    const { leadId, status, assignedTo, assignedConsultancyId, assignedRecruiterId, nextFollowUpAt, adminNotes } = req.body || {};
    if (!leadId) return res.status(400).json({ success: false, error: "leadId is required" });

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (status) updatePayload.status = status;
    if (assignedTo !== undefined) updatePayload.assignedTo = assignedTo;
    if (assignedConsultancyId !== undefined) updatePayload.assignedConsultancyId = assignedConsultancyId;
    if (assignedRecruiterId !== undefined) updatePayload.assignedRecruiterId = assignedRecruiterId;
    if (nextFollowUpAt !== undefined) updatePayload.nextFollowUpAt = nextFollowUpAt;
    if (adminNotes !== undefined) updatePayload.adminNotes = adminNotes;

    const existing = inMemoryLeadsMap.get(leadId) || {};
    inMemoryLeadsMap.set(leadId, { ...existing, ...updatePayload });

    const db = getFirestoreDb();
    const collections = ["leads", "candidate_leads"];
    await Promise.all(collections.map(async (collectionName) => {
      try {
        const ref = db.collection(collectionName).doc(leadId);
        const snap = await ref.get();
        if (snap.exists) await ref.set(updatePayload, { merge: true });
      } catch (error) {
        console.warn(`[Lead API] ${collectionName} update warning:`, error);
      }
    }));

    return res.json({ success: true, message: `Lead ${leadId} updated successfully.` });
  } catch (error: any) {
    console.error("[Lead API] Update lead error:", error);
    return res.status(500).json({ success: false, error: "Lead service is temporarily unavailable." });
  }
});

export default router;
