import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const ALLOWED_ROLES = new Set(["recruiter", "consultancy", "agency", "employer", "corporate", "admin", "superadmin", "super_admin"]);
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const normRole = (value: unknown) => clean(value, 50).toLowerCase().replace(/[\s-]+/g, "_");

function slugify(title: string, id: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 70);
  return `${base || "job"}-${id}`;
}

async function resolveConsultancy(db: FirebaseFirestore.Firestore, uid: string, user: any) {
  const recruiterProfile = await db.collection("recruiter_profiles").doc(uid).get();
  const recruiter = await db.collection("recruiters").doc(uid).get();
  const profile = recruiterProfile.data() || {};
  const recruiterData = recruiter.data() || {};
  const consultancyId = clean(
    profile.consultancyId || profile.assignedConsultancyId || profile.parentConsultancyId ||
    recruiterData.consultancyId || recruiterData.assignedConsultancyId || recruiterData.parentConsultancyId ||
    user.consultancyId || user.assignedConsultancyId || user.parentConsultancyId,
    160
  );
  if (!consultancyId) return { consultancyId: "", consultancyName: "" };

  const consultancyDoc = await db.collection("consultancies").doc(consultancyId).get();
  const consultancyUserDoc = await db.collection("users").doc(consultancyId).get();
  const consultancy = consultancyDoc.data() || {};
  const consultancyUser = consultancyUserDoc.data() || {};
  const consultancyName = clean(
    consultancy.agencyName || consultancy.businessName || consultancy.companyName || consultancy.name ||
    consultancyUser.agencyName || consultancyUser.businessName || consultancyUser.companyName || consultancyUser.name,
    180
  );
  return { consultancyId, consultancyName };
}

export async function handleJobSubmissionRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/jobs/submit") return false;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) throw Object.assign(new Error("Authentication required."), { status: 401 });
    const decoded = await getFirebaseAuth().verifyIdToken(header.slice(7).trim(), true);
    const db = getFirestoreDb();
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    const user = userDoc.data() || {};
    const role = normRole((decoded as any).role || user.role);
    if (!ALLOWED_ROLES.has(role)) throw Object.assign(new Error("This account cannot submit jobs."), { status: 403 });

    const input: any = req.body?.job || req.body || {};
    const title = clean(input.title || input.jobTitle, 180);
    const companyName = clean(input.companyName || input.hiringOrganizationName, 180);
    const location = clean(input.location || input.jobLocation, 180);
    const description = clean(input.description || input.jobDescription, 12000);
    const skills = Array.isArray(input.skillsRequired)
      ? input.skillsRequired.map((v: unknown) => clean(v, 80)).filter(Boolean).slice(0, 30)
      : clean(input.skillsRequired, 1500).split(",").map(v => clean(v, 80)).filter(Boolean).slice(0, 30);
    if (!title || !companyName || !location || !description || !skills.length) {
      throw Object.assign(new Error("Title, company, location, description and skills are required."), { status: 400 });
    }
    if (input.candidateFeePolicyConfirmed !== true) {
      throw Object.assign(new Error("Candidate no-fee policy confirmation is required."), { status: 400 });
    }

    const ownConsultancy = ["consultancy", "agency"].includes(role);
    const linked = role === "recruiter" ? await resolveConsultancy(db, decoded.uid, user) : { consultancyId: "", consultancyName: "" };
    const consultancyId = ownConsultancy ? decoded.uid : linked.consultancyId;
    let consultancyName = ownConsultancy
      ? clean(user.agencyName || user.businessName || user.companyName || user.name, 180)
      : linked.consultancyName;
    if (ownConsultancy && !consultancyName) {
      const consultancyDoc = await db.collection("consultancies").doc(decoded.uid).get();
      const c = consultancyDoc.data() || {};
      consultancyName = clean(c.agencyName || c.businessName || c.companyName || c.name, 180);
    }

    const jobRef = db.collection("jobs").doc();
    const jobId = jobRef.id;
    const now = new Date().toISOString();
    const slug = slugify(title, jobId);
    const publicSite = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://aijobs1.in").replace(/\/+$/, "");
    const canonicalUrl = `${publicSite}/jobs/${slug}`;
    const ownerUid = decoded.uid;
    const employerId = ["employer", "corporate"].includes(role) ? decoded.uid : clean(input.employerId, 160);

    const job = {
      id: jobId,
      title,
      jobTitle: title,
      companyName,
      hiringOrganizationName: companyName,
      location,
      jobLocation: location,
      description,
      jobDescription: description,
      skillsRequired: skills,
      workMode: clean(input.workMode, 30) || "On-site",
      type: clean(input.type || input.employmentType, 40) || "Full-time",
      employmentType: clean(input.employmentType || input.type, 40) || "FULL_TIME",
      salary: clean(input.salary, 120),
      experience: clean(input.experience, 80),
      education: clean(input.education || input.qualification, 180),
      openings: Math.max(1, Number(input.openings || input.numberOfOpenings || 1)),
      industry: clean(input.industry, 120),
      category: clean(input.category, 120),
      applyDeadline: clean(input.applyDeadline, 40),
      expiryDate: clean(input.expiryDate || input.applyDeadline, 40),
      validThrough: clean(input.validThrough || input.expiryDate || input.applyDeadline, 40),
      benefits: clean(input.benefits, 2500),
      responsibilities: clean(input.responsibilities, 5000),
      requirements: clean(input.requirements, 5000),
      languages: clean(input.languages, 300),
      candidateFeePolicyConfirmed: true,
      ownerUid,
      createdBy: ownerUid,
      recruiterId: role === "recruiter" ? ownerUid : null,
      employerId: employerId || ownerUid,
      consultancyId: consultancyId || null,
      consultancyName: consultancyName || null,
      consultancy: consultancyName || null,
      sourcePortal: "AIJOBS",
      submittedByRole: role,
      status: "pending_admin_verification",
      approvalStatus: "pending",
      approved: false,
      verificationStatus: "pending",
      adminApprovalRequired: true,
      googlePublishingStatus: "NOT_SUBMITTED",
      publishedAt: null,
      slug,
      canonicalUrl,
      createdAt: now,
      updatedAt: now
    };

    const batch = db.batch();
    batch.create(jobRef, job);
    const mirror = ownConsultancy || consultancyId ? "consultancy_jobs" : "company_jobs";
    batch.set(db.collection(mirror).doc(jobId), job);
    batch.set(db.collection("audit_logs").doc(`job_submit_${jobId}`), {
      action: "JOB_SUBMITTED_FOR_REVIEW", category: "Job", jobId, jobTitle: title,
      performedBy: ownerUid, performedByEmail: decoded.email || "", performedByRole: role,
      consultancyId: consultancyId || null, consultancyName: consultancyName || null, createdAt: now
    });
    batch.set(db.collection("notifications").doc(`job_submitted_${jobId}`), {
      userId: ownerUid, title: "Job submitted for verification",
      message: consultancyName
        ? `${title} was submitted under ${consultancyName} and is awaiting AIJOBS approval.`
        : `${title} is awaiting AIJOBS approval.`,
      type: "success", read: false, createdAt: now, jobId
    });
    await batch.commit();

    res.status(201).json({
      success: true, jobId, status: "pending_admin_verification",
      consultancy: consultancyName ? { id: consultancyId, name: consultancyName } : null,
      message: "Job submitted. It will become public only after AIJOBS approval."
    });
    return true;
  } catch (error: any) {
    const status = Number(error?.status || 500);
    console.error("[JobSubmission]", error?.message || error);
    res.status(status).json({ success: false, error: error?.message || "Job submission failed." });
    return true;
  }
}
