import crypto from "crypto";
import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const SITE_URL = "https://aijobs1.in";
const ALLOWED_ROLES = new Set(["employer", "recruiter", "consultancy"]);
const EMPLOYMENT_TYPES = new Set(["Full Time", "Part Time", "Contract", "Internship", "Temporary", "Freelance"]);
const WORK_MODES = new Set(["On-site", "Remote", "Hybrid"]);
const INTERVIEW_TYPES = new Set(["Walk-in", "Virtual", "Telephonic", "Office Interview"]);

function text(value: any, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}
function bool(value: any) { return value === true || value === "true"; }
function number(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function normalizeRole(value: any) {
  return text(value, 30).toLowerCase().replace(/[\s-]+/g, "_");
}
function slugify(title: string, id: string) {
  const slug = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 70);
  return `${slug || "job"}-${id}`;
}
function sanitizeAttribution(raw: any, landingPage = "/hire") {
  const source = raw || {};
  return {
    source: text(source.source || source.utm_source, 100),
    medium: text(source.medium || source.utm_medium, 100),
    campaign: text(source.campaign || source.utm_campaign, 160),
    content: text(source.content || source.utm_content, 160),
    term: text(source.term || source.utm_term, 160),
    gclid: text(source.gclid, 256),
    fbclid: text(source.fbclid, 256),
    referrer: text(source.referrer, 500),
    landingPage: text(source.landingPage || landingPage, 500),
    firstVisitAt: text(source.firstVisitAt, 64) || new Date().toISOString()
  };
}

async function requireUser(req: Request) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw Object.assign(new Error("Authentication required."), { status: 401 });
  try {
    return await getFirebaseAuth().verifyIdToken(token, true);
  } catch {
    throw Object.assign(new Error("Invalid or expired authentication session."), { status: 401 });
  }
}

async function requireHiringUser(req: Request) {
  const decoded = await requireUser(req);
  const db = getFirestoreDb();
  const snap = await db.collection("users").doc(decoded.uid).get();
  if (!snap.exists) throw Object.assign(new Error("Hiring account profile not found."), { status: 403 });
  const profile: any = snap.data() || {};
  const role = normalizeRole(profile.role);
  if (!ALLOWED_ROLES.has(role)) throw Object.assign(new Error("This account is not authorized for hiring workflows."), { status: 403 });
  return { decoded, profile, role, db };
}

async function requireAdmin(req: Request) {
  const decoded = await requireUser(req);
  const db = getFirestoreDb();
  const userSnap = await db.collection("users").doc(decoded.uid).get();
  const adminSnap = await db.collection("admins").doc(decoded.uid).get();
  const role = normalizeRole(userSnap.data()?.role || decoded.role);
  if (!(role === "admin" || role === "superadmin" || role === "super_admin" || adminSnap.exists)) {
    throw Object.assign(new Error("Admin access required."), { status: 403 });
  }
  return { decoded, db, role };
}

async function writeEvent(db: any, uid: string, eventName: string, data: any = {}) {
  const stable = text(data.dedupeKey || `${eventName}:${uid}:${data.jobId || ""}:${data.campaign || ""}`, 300);
  const id = `evt_${crypto.createHash("sha256").update(stable).digest("hex").slice(0, 28)}`;
  const ref = db.collection("marketingEvents").doc(id);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    id, eventName, uid, ...data,
    createdAt: new Date().toISOString()
  }, { merge: false });
}

function notificationDoc(userId: string, title: string, message: string, link = "") {
  return {
    userId,
    title,
    message,
    link,
    type: "info",
    read: false,
    createdAt: new Date().toISOString()
  };
}

function publicJobPayload(jobId: string, source: any, owner: any, role: string) {
  const now = new Date().toISOString();
  const hiringFor = text(source.hiringFor || "Own Company", 50);
  const clientMode = role === "consultancy" && hiringFor === "Client Company";
  if (clientMode && !bool(source.authorizationConfirmed)) {
    throw Object.assign(new Error("Client hiring authorization confirmation is required."), { status: 400 });
  }
  const title = text(source.jobTitle || source.title, 160);
  const companyName = text(source.companyName || owner.companyName, 180);
  const location = text(source.jobLocation || source.location, 180);
  const description = text(source.jobDescription || source.description, 12000);
  const skills = Array.isArray(source.requiredSkills)
    ? source.requiredSkills.map((x: any) => text(x, 80)).filter(Boolean).slice(0, 40)
    : text(source.requiredSkills, 1500).split(",").map(v => v.trim()).filter(Boolean).slice(0, 40);
  if (!title || !companyName || !location || !description || !skills.length) {
    throw Object.assign(new Error("Job title, company, location, description and required skills are required."), { status: 400 });
  }
  const employmentType = text(source.employmentType, 40) || "Full Time";
  const workMode = text(source.workMode, 40) || "On-site";
  const interviewType = text(source.interviewType, 60) || "Office Interview";
  if (!EMPLOYMENT_TYPES.has(employmentType)) throw Object.assign(new Error("Invalid employment type."), { status: 400 });
  if (!WORK_MODES.has(workMode)) throw Object.assign(new Error("Invalid work mode."), { status: 400 });
  if (!INTERVIEW_TYPES.has(interviewType)) throw Object.assign(new Error("Invalid interview type."), { status: 400 });
  return {
    id: jobId,
    title,
    jobTitle: title,
    companyName,
    hiringOrganizationName: companyName,
    hiringFor,
    department: text(source.department, 120),
    category: text(source.jobCategory || source.category, 120),
    location,
    jobLocation: location,
    city: text(source.city, 100),
    state: text(source.state, 100),
    country: text(source.country || "IN", 80),
    workMode,
    employmentType,
    type: employmentType,
    openings: Math.max(1, number(source.numberOfOpenings || source.openings, 1)),
    minimumSalary: Math.max(0, number(source.minimumSalary, 0)),
    maximumSalary: Math.max(0, number(source.maximumSalary, 0)),
    salaryPeriod: text(source.salaryPeriod || "YEAR", 40),
    salaryCurrency: "INR",
    minimumExperience: Math.max(0, number(source.minimumExperience, 0)),
    maximumExperience: Math.max(0, number(source.maximumExperience, 0)),
    minimumQualification: text(source.minimumQualification, 180),
    skillsRequired: skills,
    requiredSkills: skills,
    description,
    jobDescription: description,
    jdFileUrl: text(source.jdFileUrl, 2000) || null,
    jdFileName: text(source.jdFileName, 180) || null,
    jdContentType: text(source.jdContentType, 120) || null,
    jdFileSize: Math.max(0, Math.min(number(source.jdFileSize), 10 * 1024 * 1024)) || null,
    jdStoragePath: text(source.jdStoragePath, 500) || null,
    responsibilities: text(source.responsibilities, 7000),
    benefits: text(source.benefits, 4000),
    shift: text(source.shift, 100),
    interviewType,
    hrContactName: text(source.hrContactName, 150),
    hrEmail: text(source.hrEmail, 180).toLowerCase(),
    hrMobile: text(source.hrMobile, 40),
    applyDeadline: text(source.applicationDeadline, 40),
    expiryDate: text(source.jobExpiryDate || source.applicationDeadline, 40),
    validThrough: text(source.jobExpiryDate || source.applicationDeadline, 40),
    clientCompanyName: clientMode ? text(source.clientCompanyName, 180) : "",
    clientContactPerson: clientMode ? text(source.clientContactPerson, 160) : "",
    clientWebsite: clientMode ? text(source.clientWebsite, 300) : "",
    hiringRequirementReference: clientMode ? text(source.hiringRequirementReference, 200) : "",
    authorizationDocumentUrl: clientMode ? text(source.authorizationDocumentUrl, 1000) : "",
    authorizationConfirmed: clientMode ? true : false,
    authorizationConfirmedAt: clientMode ? now : null,
    authorizationConfirmedBy: clientMode ? owner.uid : null,
    ownerUid: owner.uid,
    createdBy: owner.uid,
    postedBy: owner.uid,
    postedByName: text(owner.name, 160),
    postedByEmail: text(owner.email, 180),
    postedByPhone: text(owner.phone, 40),
    submittedByRole: role,
    employerId: role === "employer" ? owner.uid : null,
    recruiterId: role === "recruiter" ? owner.uid : null,
    consultancyId: role === "consultancy" ? owner.uid : null,
    status: "pending_review",
    approvalStatus: "pending_review",
    approved: false,
    adminApprovalRequired: true,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: "",
    changesRequestedMessage: "",
    candidateFeePolicyConfirmed: true,
    applicationCount: 0,
    applicantsCount: 0,
    viewsCount: 0,
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    googleIndexing: { status: "NOT_SUBMITTED", submittedAt: null, lastAttemptAt: null, response: null, error: null }
  };
}

export async function handleHiringFunnelApi(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (!path.startsWith("/api/hire")) return false;
  try {
    if (req.method === "POST" && path === "/api/hire/bootstrap") {
      const decoded = await requireUser(req);
      const db = getFirestoreDb();
      const role = normalizeRole(req.body?.role);
      if (!ALLOWED_ROLES.has(role)) return void res.status(400).json({ success: false, error: "Invalid hiring role." }) as any;
      const userRef = db.collection("users").doc(decoded.uid);
      const existing = await userRef.get();
      const currentRole = normalizeRole(existing.data()?.role);
      if (existing.exists && currentRole && currentRole !== role) {
        return void res.status(409).json({ success: false, error: `This Firebase account is already registered as ${currentRole}. Use the matching portal.` }) as any;
      }
      const now = new Date().toISOString();
      const name = text(req.body?.name || decoded.name || decoded.email?.split("@")[0], 160);
      const companyName = text(req.body?.companyName, 180);
      const phone = text(req.body?.phone, 40);
      const attribution = sanitizeAttribution(req.body?.marketingAttribution, "/hire");
      const profile = {
        uid: decoded.uid,
        name,
        email: text(decoded.email, 180).toLowerCase(),
        phone,
        role,
        companyName,
        accountStatus: "active",
        status: "active",
        verificationStatus: decoded.email_verified ? "verified" : "email_pending",
        emailVerified: decoded.email_verified === true,
        isActive: true,
        isApproved: true,
        profileCompleted: false,
        marketingAttribution: attribution,
        plan: "FREE",
        createdAt: existing.data()?.createdAt || now,
        updatedAt: now
      };
      await db.runTransaction(async (tx: any) => {
        const creditRef = db.collection("jobCredits").doc(decoded.uid);
        const creditSnap = await tx.get(creditRef);
        tx.set(userRef, profile, { merge: true });
        if (!creditSnap.exists) {
          tx.set(creditRef, {
            uid: decoded.uid,
            freeCredits: 1,
            paidCredits: 0,
            usedCredits: 0,
            plan: "FREE",
            firstFreeCreditGrantedAt: now,
            updatedAt: now
          });
        }
        const roleRef = db.collection(role === "consultancy" ? "consultancies" : role === "recruiter" ? "recruiters" : "employers").doc(decoded.uid);
        tx.set(roleRef, { ...profile, userId: decoded.uid }, { merge: true });
        const companyRef = db.collection("companies").doc(decoded.uid);
        tx.set(companyRef, { companyId: decoded.uid, ownerUid: decoded.uid, companyName, officialEmail: profile.email, officialPhone: phone, createdAt: now, updatedAt: now }, { merge: true });
      });
      await writeEvent(db, decoded.uid, "registration_completed", { role, campaign: attribution.campaign, source: attribution.source, medium: attribution.medium, content: attribution.content, dedupeKey: `registration_completed:${decoded.uid}` });
      return void res.json({ success: true, profile, jobCredits: { freeCredits: 1 }, message: "Welcome to AIJOBS. You have received 1 FREE Job Posting Credit." }) as any;
    }

    if (req.method === "GET" && path === "/api/hire/me") {
      const { decoded, profile, db } = await requireHiringUser(req);
      const [creditsSnap, companySnap] = await Promise.all([
        db.collection("jobCredits").doc(decoded.uid).get(),
        db.collection("companies").doc(decoded.uid).get()
      ]);
      return void res.json({ success: true, profile, jobCredits: creditsSnap.data() || {}, company: companySnap.data() || {} }) as any;
    }

    if (req.method === "POST" && path === "/api/hire/company") {
      const { decoded, db } = await requireHiringUser(req);
      const now = new Date().toISOString();
      const company = {
        companyId: decoded.uid,
        ownerUid: decoded.uid,
        companyName: text(req.body?.companyName, 180),
        companyLogo: text(req.body?.companyLogo, 1000),
        industry: text(req.body?.industry, 160),
        companySize: text(req.body?.companySize, 100),
        website: text(req.body?.website, 400),
        companyAddress: text(req.body?.companyAddress, 500),
        city: text(req.body?.city, 120),
        state: text(req.body?.state, 120),
        country: text(req.body?.country || "India", 100),
        companyDescription: text(req.body?.companyDescription, 5000),
        gstNumber: text(req.body?.gstNumber, 40),
        registrationNumber: text(req.body?.registrationNumber, 80),
        officialEmail: text(req.body?.officialEmail, 180).toLowerCase(),
        officialPhone: text(req.body?.officialPhone, 40),
        profileCompleted: true,
        updatedAt: now
      };
      if (!company.companyName || !company.industry || !company.officialEmail || !company.officialPhone) {
        return void res.status(400).json({ success: false, error: "Company name, industry, official email and phone are required." }) as any;
      }
      await Promise.all([
        db.collection("companies").doc(decoded.uid).set(company, { merge: true }),
        db.collection("users").doc(decoded.uid).set({ companyName: company.companyName, companyProfileCompleted: true, updatedAt: now }, { merge: true })
      ]);
      await writeEvent(db, decoded.uid, "company_profile_completed", { dedupeKey: `company_profile_completed:${decoded.uid}` });
      return void res.json({ success: true, company }) as any;
    }

    if (req.method === "POST" && path === "/api/hire/job") {
      const { decoded, profile, role, db } = await requireHiringUser(req);
      const companySnap = await db.collection("companies").doc(decoded.uid).get();
      if (!companySnap.exists || companySnap.data()?.profileCompleted !== true) {
        return void res.status(428).json({ success: false, code: "COMPANY_PROFILE_REQUIRED", error: "Complete your company profile before submitting your first job." }) as any;
      }
      const jobId = `job_${crypto.randomBytes(6).toString("hex")}`;
      const job = publicJobPayload(jobId, req.body || {}, { ...profile, uid: decoded.uid }, role);
      const creditRef = db.collection("jobCredits").doc(decoded.uid);
      const jobRef = db.collection("jobs").doc(jobId);
      await db.runTransaction(async (tx: any) => {
        const creditSnap = await tx.get(creditRef);
        const credits: any = creditSnap.data() || {};
        const available = number(credits.freeCredits) + number(credits.paidCredits) - number(credits.usedCredits);
        if (!creditSnap.exists || available < 1) throw Object.assign(new Error("No job posting credits available."), { status: 402 });
        tx.set(jobRef, job);
        tx.set(creditRef, { usedCredits: number(credits.usedCredits) + 1, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await Promise.all([
        writeEvent(db, decoded.uid, "job_submitted", { jobId, role, dedupeKey: `job_submitted:${jobId}` }),
        writeEvent(db, decoded.uid, "first_job_credit_used", { jobId, role, dedupeKey: `first_job_credit_used:${decoded.uid}` }),
        db.collection("notifications").add(notificationDoc(decoded.uid, "Job submitted for verification", `Your job “${job.title}” has been submitted for Admin review.`, `/jobs/${jobId}`))
      ]);
      return void res.status(201).json({ success: true, jobId, status: "pending_review", message: "Your job has been submitted for verification." }) as any;
    }

    if (req.method === "GET" && path === "/api/hire/jobs") {
      const { decoded, db } = await requireHiringUser(req);
      const snap = await db.collection("jobs").where("ownerUid", "==", decoded.uid).get();
      const jobs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return void res.json({ success: true, jobs }) as any;
    }

    if (req.method === "GET" && path === "/api/hire/admin/queue") {
      const { db } = await requireAdmin(req);
      const snap = await db.collection("jobs").get();
      const jobs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((j: any) => ["pending_review", "pending_admin_verification", "changes_requested"].includes(String(j.status))).sort((a: any,b: any)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
      return void res.json({ success: true, jobs }) as any;
    }

    if (req.method === "POST" && path.startsWith("/api/hire/admin/jobs/") && path.endsWith("/review")) {
      const { decoded, db } = await requireAdmin(req);
      const parts = path.split("/");
      const jobId = text(parts[5], 120);
      const action = text(req.body?.action, 30).toLowerCase();
      const ref = db.collection("jobs").doc(jobId);
      const snap = await ref.get();
      if (!snap.exists) return void res.status(404).json({ success: false, error: "Job not found." }) as any;
      const job: any = snap.data() || {};
      const now = new Date().toISOString();
      if (action === "approve") {
        const slug = slugify(job.title || "job", jobId);
        const publicUrl = `${SITE_URL}/jobs/${slug}`;
        await ref.set({ status: "approved", approvalStatus: "approved", approved: true, reviewedBy: decoded.uid, reviewedAt: now, approvedAt: now, datePosted: now.slice(0,10), slug, canonicalUrl: publicUrl, publicUrl, googleIndexing: { status: "PENDING", submittedAt: now, lastAttemptAt: now, response: null, error: null }, updatedAt: now }, { merge: true });
        await Promise.all([
          writeEvent(db, job.ownerUid || job.createdBy || "unknown", "job_approved", { jobId, dedupeKey: `job_approved:${jobId}` }),
          job.ownerUid ? db.collection("notifications").add(notificationDoc(job.ownerUid, "Job approved", `Your job “${job.title}” is now live on AIJOBS.`, publicUrl)) : Promise.resolve()
        ]);
        return void res.json({ success: true, status: "approved", publicUrl, indexingQueued: true }) as any;
      }
      if (action === "reject") {
        const reason = text(req.body?.reason, 2000);
        if (!reason) return void res.status(400).json({ success: false, error: "Rejection reason is required." }) as any;
        await ref.set({ status: "rejected", approvalStatus: "rejected", approved: false, rejectionReason: reason, reviewedBy: decoded.uid, reviewedAt: now, updatedAt: now }, { merge: true });
        await writeEvent(db, job.ownerUid || job.createdBy || "unknown", "job_rejected", { jobId, dedupeKey: `job_rejected:${jobId}` });
        if (job.ownerUid) await db.collection("notifications").add(notificationDoc(job.ownerUid, "Job rejected", reason, ""));
        return void res.json({ success: true, status: "rejected" }) as any;
      }
      if (action === "request_changes") {
        const message = text(req.body?.message, 2000);
        if (!message) return void res.status(400).json({ success: false, error: "Required changes message is required." }) as any;
        await ref.set({ status: "changes_requested", approvalStatus: "changes_requested", changesRequestedMessage: message, reviewedBy: decoded.uid, reviewedAt: now, updatedAt: now }, { merge: true });
        if (job.ownerUid) await db.collection("notifications").add(notificationDoc(job.ownerUid, "Changes requested", message, ""));
        return void res.json({ success: true, status: "changes_requested" }) as any;
      }
      return void res.status(400).json({ success: false, error: "Invalid review action." }) as any;
    }

    if (req.method === "GET" && path === "/api/hire/admin/analytics") {
      const { db } = await requireAdmin(req);
      const [eventsSnap, usersSnap, jobsSnap] = await Promise.all([
        db.collection("marketingEvents").get(), db.collection("users").get(), db.collection("jobs").get()
      ]);
      const events = eventsSnap.docs.map((d: any) => d.data());
      const users = usersSnap.docs.map((d: any) => d.data()).filter((u: any) => ALLOWED_ROLES.has(normalizeRole(u.role)));
      const jobs = jobsSnap.docs.map((d: any) => d.data());
      const byCampaign: Record<string, any> = {};
      for (const u of users) {
        const a = u.marketingAttribution || {};
        const key = [a.source || "direct", a.medium || "none", a.campaign || "none", a.content || "none"].join(" | ");
        byCampaign[key] ||= { source: a.source || "direct", medium: a.medium || "none", campaign: a.campaign || "none", content: a.content || "none", registrations: 0, jobsSubmitted: 0, jobsApproved: 0 };
        byCampaign[key].registrations++;
      }
      for (const j of jobs) {
        const owner = users.find((u: any) => u.uid === j.ownerUid);
        const a = owner?.marketingAttribution || {};
        const key = [a.source || "direct", a.medium || "none", a.campaign || "none", a.content || "none"].join(" | ");
        byCampaign[key] ||= { source: a.source || "direct", medium: a.medium || "none", campaign: a.campaign || "none", content: a.content || "none", registrations: 0, jobsSubmitted: 0, jobsApproved: 0 };
        byCampaign[key].jobsSubmitted++;
        if (j.status === "approved") byCampaign[key].jobsApproved++;
      }
      return void res.json({
        success: true,
        totals: {
          registrations: users.length,
          employerRegistrations: users.filter((u:any)=>normalizeRole(u.role)==="employer").length,
          recruiterRegistrations: users.filter((u:any)=>normalizeRole(u.role)==="recruiter").length,
          consultancyRegistrations: users.filter((u:any)=>normalizeRole(u.role)==="consultancy").length,
          firstJobsSubmitted: events.filter((e:any)=>e.eventName==="job_submitted").length,
          jobsApproved: jobs.filter((j:any)=>j.status==="approved").length,
          jobsRejected: jobs.filter((j:any)=>j.status==="rejected").length
        },
        byCampaign: Object.values(byCampaign)
      }) as any;
    }

    return void res.status(404).json({ success: false, error: "Hiring funnel endpoint not found." }) as any;
  } catch (error: any) {
    const status = Number(error?.status || 500);
    console.error("[HiringFunnel]", path, error?.message || error);
    res.status(status).json({ success: false, error: error?.message || "Hiring workflow failed." });
    return true;
  }
}
