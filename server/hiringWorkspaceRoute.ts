import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const HIRING_ROLES = new Set(["employer", "recruiter", "consultancy"]);
const PIPELINE = new Set([
  "applied", "new_lead", "viewed", "under_review", "screening", "contacted",
  "screened", "shortlisted", "interview", "interview_scheduled",
  "interview_completed", "hr_round", "final_round", "selected", "offer",
  "joined", "rejected", "hired"
]);
function clean(v: any, max = 300) { return String(v ?? "").trim().slice(0, max); }
function norm(v: any) { return clean(v, 80).toLowerCase().replace(/[\s-]+/g, "_"); }

async function ctx(req: Request) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) throw Object.assign(new Error("Authentication required."), { status: 401 });
  const decoded = await getFirebaseAuth().verifyIdToken(header.slice(7), true);
  const db = getFirestoreDb();
  const userSnap = await db.collection("users").doc(decoded.uid).get();
  if (!userSnap.exists) throw Object.assign(new Error("Hiring profile not found."), { status: 403 });
  let profile: any = userSnap.data() || {};
  const role = norm(profile.role);
  if (!HIRING_ROLES.has(role)) throw Object.assign(new Error("Hiring workspace access denied."), { status: 403 });
  if (role === "recruiter") {
    const [profileSnap, recruiterSnap] = await Promise.all([
      db.collection("recruiter_profiles").doc(decoded.uid).get(),
      db.collection("recruiters").doc(decoded.uid).get()
    ]);
    profile = { ...(recruiterSnap.data() || {}), ...(profileSnap.data() || {}), ...profile };
  }
  return { decoded, db, profile, role };
}

function ownsJob(job: any, uid: string, profile: any = {}) {
  const linkedConsultancy = clean(profile.consultancyId || profile.assignedConsultancyId || profile.parentConsultancyId, 160);
  const directOwners = [
    job.ownerUid, job.createdBy, job.postedBy, job.jobOwnerUid,
    job.recruiterId, job.employerId, job.consultancyId, job.assignedRecruiterId
  ].filter(Boolean);
  const assigned = [
    ...(Array.isArray(job.recruiterIds) ? job.recruiterIds : []),
    ...(Array.isArray(job.assignedRecruiterIds) ? job.assignedRecruiterIds : [])
  ];
  return directOwners.includes(uid) || assigned.includes(uid) ||
    Boolean(linkedConsultancy && job.consultancyId === linkedConsultancy);
}

function ownsApplication(app: any, uid: string, profile: any = {}) {
  const linkedConsultancy = clean(profile.consultancyId || profile.assignedConsultancyId || profile.parentConsultancyId, 160);
  return [
    app.jobOwnerUid, app.ownerUid, app.recruiterId, app.employerId,
    app.consultancyId, app.assignedRecruiterId
  ].includes(uid) || Boolean(linkedConsultancy && app.consultancyId === linkedConsultancy);
}

export async function handleHiringWorkspaceRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (!path.startsWith("/api/hire/workspace")) return false;
  try {
    const { decoded, db, profile, role } = await ctx(req);
    if (req.method === "GET" && path === "/api/hire/workspace") {
      const [jobsSnap, appsSnap, creditsSnap] = await Promise.all([
        db.collection("jobs").get(),
        db.collection("applications").get(),
        db.collection("jobCredits").doc(decoded.uid).get()
      ]);
      const jobs = jobsSnap.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .filter((job: any) => ownsJob(job, decoded.uid, profile));
      const jobIds = new Set(jobs.map((job: any) => job.id));
      const applications = appsSnap.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .filter((app: any) => ownsApplication(app, decoded.uid, profile) || jobIds.has(app.jobId));
      const status = (value: any) => norm(value);
      const activeJobs = jobs.filter((job: any) =>
        ["approved", "active", "published", "live", "open"].includes(status(job.status)) && job.approved !== false
      ).length;
      const pendingJobs = jobs.filter((job: any) =>
        ["pending_review", "pending_approval", "pending_admin_verification", "changes_requested"].includes(status(job.status))
      ).length;
      const expiredJobs = jobs.filter((job: any) => ["expired", "closed"].includes(status(job.status))).length;
      const count = (...states: string[]) => applications.filter((app: any) => states.includes(status(app.status))).length;
      const credits: any = creditsSnap.data() || {};
      const nowMs = Date.now();
      const paidCreditsExpired = Boolean(credits.paidCreditsExpiresAt && new Date(credits.paidCreditsExpiresAt).getTime() <= nowMs);
      const databaseCreditsExpired = Boolean(credits.databaseCreditsExpiresAt && new Date(credits.databaseCreditsExpiresAt).getTime() <= nowMs);
      const available = (Number(credits.freeCredits) || 0) + (paidCreditsExpired ? 0 : (Number(credits.paidCredits) || 0)) - (Number(credits.usedCredits) || 0);
      res.json({
        success: true,
        profile: { uid: decoded.uid, name: profile.name || profile.displayName, email: profile.email, role },
        stats: {
          activeJobs, pendingJobs, expiredJobs, applications: applications.length,
          shortlisted: count("shortlisted"),
          interviews: count("interview", "interview_scheduled", "interview_completed", "hr_round", "final_round"),
          hired: count("hired", "joined"),
          availableJobCredits: Math.max(0, available),
          availableDatabaseCredits: databaseCreditsExpired ? 0 : Math.max(0, Number(credits.databaseCredits) || 0),
          databaseCreditsUsed: Math.max(0, Number(credits.databaseCreditsUsed) || 0),
          planExpiresAt: credits.planExpiresAt || null
        },
        jobs: jobs.sort((a: any, b: any) => String(b.createdAt || b.submittedAt || "").localeCompare(String(a.createdAt || a.submittedAt || ""))),
        applications: applications.sort((a: any, b: any) => String(b.appliedAt || b.createdAt || "").localeCompare(String(a.appliedAt || a.createdAt || "")))
      });
      return true;
    }

    const close = path.match(/^\/api\/hire\/workspace\/jobs\/([^/]+)\/close$/);
    if (req.method === "POST" && close) {
      const ref = db.collection("jobs").doc(clean(close[1], 120));
      const snap = await ref.get();
      if (!snap.exists) { res.status(404).json({ success: false, error: "Job not found." }); return true; }
      const job: any = snap.data() || {};
      if (!ownsJob(job, decoded.uid, profile)) {
        res.status(403).json({ success: false, error: "You can only close jobs owned by or assigned to your hiring account." });
        return true;
      }
      const now = new Date().toISOString();
      await ref.set({ status: "closed", approvalStatus: "closed", closedAt: now, updatedAt: now }, { merge: true });
      res.json({ success: true, status: "closed" });
      return true;
    }

    const appStatus = path.match(/^\/api\/hire\/workspace\/applications\/([^/]+)\/status$/);
    if (req.method === "POST" && appStatus) {
      const applicationId = clean(appStatus[1], 120);
      const ref = db.collection("applications").doc(applicationId);
      const snap = await ref.get();
      if (!snap.exists) { res.status(404).json({ success: false, error: "Application not found." }); return true; }
      const app: any = snap.data() || {};
      const jobSnap = app.jobId ? await db.collection("jobs").doc(app.jobId).get() : null;
      const job: any = jobSnap?.exists ? jobSnap.data() : {};
      if (!(ownsApplication(app, decoded.uid, profile) || ownsJob(job, decoded.uid, profile))) {
        res.status(403).json({ success: false, error: "You can only manage applications for your own or assigned jobs." });
        return true;
      }
      const next = norm(req.body?.status);
      if (!PIPELINE.has(next)) { res.status(400).json({ success: false, error: "Invalid application status." }); return true; }
      const now = new Date().toISOString();
      const previous = norm(app.status || "applied");
      const payload: any = { status: next, updatedAt: now, lastUpdatedBy: decoded.uid, lastUpdatedByRole: role };
      if (req.body?.remarks) payload.statusRemarks = clean(req.body.remarks, 1000);
      if (req.body?.interviewData && typeof req.body.interviewData === "object") Object.assign(payload, req.body.interviewData);
      const batch = db.batch();
      batch.set(ref, payload, { merge: true });
      batch.set(db.collection("company_applications").doc(applicationId), payload, { merge: true });
      batch.set(ref.collection("timeline").doc(`status_${Date.now()}`), {
        applicationId, previousStatus: previous, newStatus: next,
        changedBy: decoded.uid, changedByRole: role,
        remarks: clean(req.body?.remarks, 1000), createdAt: now
      });
      const candidateId = clean(app.candidateId || app.userId, 160);
      if (candidateId) {
        batch.set(db.collection("notifications").doc(`application_status_${applicationId}_${Date.now()}`), {
          userId: candidateId,
          title: "Application Status Updated",
          message: `Your application for ${app.jobTitle || "this job"} at ${app.companyName || "the company"} is now ${next.replace(/_/g, " ")}.`,
          type: "application_update", read: false,
          jobId: app.jobId || null, applicationId, createdAt: now
        });
      }
      await batch.commit();
      res.json({ success: true, status: next, previousStatus: previous, updatedAt: now });
      return true;
    }

    res.status(404).json({ success: false, error: "Hiring workspace endpoint not found." });
    return true;
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({ success: false, error: error?.message || "Hiring workspace request failed." });
    return true;
  }
}
