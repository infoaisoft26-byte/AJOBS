import crypto from "crypto";
import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED = new Set(["draft", "pending", "pending_approval", "pending_review", "pending_admin_verification", "changes_requested", "rejected", "expired", "closed", "deleted"]);

function clean(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}
function norm(value: unknown) {
  return clean(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
}
function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function isJobOpen(job: any) {
  const state = norm(job.status);
  if (BLOCKED.has(state)) return false;
  if (!["approved", "live", "published", "active"].includes(state)) return false;
  if (job.approved === false) return false;
  const expiryRaw = job.validThrough || job.expiryDate || job.applyDeadline;
  if (expiryRaw) {
    const d = typeof expiryRaw?.toDate === "function" ? expiryRaw.toDate() : new Date(expiryRaw);
    if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now()) return false;
  }
  return true;
}

export async function handlePublicJobApplyRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/public/job-apply") return false;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  try {
    const body: any = req.body || {};
    // Honeypot: silently accept bot submissions without creating data.
    if (clean(body.website, 200)) {
      res.json({ success: true, message: "Application received." });
      return true;
    }

    const jobId = clean(body.jobId, 160);
    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const phone = clean(body.phone, 40);
    const phoneDigits = phone.replace(/\D/g, "");
    const location = clean(body.location, 120);
    const experience = clean(body.experience, 80);
    const qualification = clean(body.qualification, 160);
    const consent = body.consent === true || body.consent === "true" || body.consent === "on";

    if (!jobId || !name || !email || !phoneDigits) {
      res.status(400).json({ success: false, error: "Name, email and mobile number are required." });
      return true;
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ success: false, error: "Please enter a valid email address." });
      return true;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      res.status(400).json({ success: false, error: "Please enter a valid mobile number." });
      return true;
    }
    if (!consent) {
      res.status(400).json({ success: false, error: "Please confirm that AIJOBS may share your application with the hiring company." });
      return true;
    }

    const db = getFirestoreDb();
    const jobRef = db.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      res.status(404).json({ success: false, error: "Job not found." });
      return true;
    }
    const job: any = jobSnap.data() || {};
    if (!isJobOpen(job)) {
      res.status(410).json({ success: false, error: "This job is no longer accepting applications." });
      return true;
    }

    let candidateId: string | null = null;
    try {
      const existing = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!existing.empty) {
        const profile: any = existing.docs[0].data() || {};
        if (norm(profile.role) === "candidate") candidateId = existing.docs[0].id;
      }
    } catch (err) {
      console.warn("[PublicQuickApply] Existing candidate lookup skipped:", err);
    }

    const leadId = `lead_${hash(`${email}|${phoneDigits}`).slice(0, 28)}`;
    const applicationId = `qapp_${hash(`${jobId}|${email}|${phoneDigits}`).slice(0, 28)}`;
    const now = new Date().toISOString();
    const ownerUid = clean(job.ownerUid || job.createdBy || job.postedBy || job.recruiterId || job.employerId || job.consultancyId, 160) || null;
    const recruiterId = clean(job.recruiterId, 160) || null;
    const employerId = clean(job.employerId, 160) || null;
    const consultancyId = clean(job.consultancyId, 160) || null;

    const leadRef = db.collection("candidate_leads").doc(leadId);
    const appRef = db.collection("applications").doc(applicationId);
    let duplicate = false;

    await db.runTransaction(async (tx) => {
      const existingApp = await tx.get(appRef);
      if (existingApp.exists) {
        duplicate = true;
        return;
      }

      tx.set(leadRef, {
        id: leadId,
        candidateId,
        name,
        email,
        phone: phoneDigits,
        location,
        experience,
        qualification,
        role: "candidate_lead",
        source: "public_job_quick_apply",
        sourceJobId: jobId,
        sourceJobTitle: job.title || job.jobTitle || "",
        accountCreated: Boolean(candidateId),
        status: "new",
        consentToShareApplication: true,
        consentAt: now,
        firstCapturedAt: now,
        updatedAt: now,
        marketingAttribution: {
          source: clean(body.utm_source || body.source || "public_job", 120),
          medium: clean(body.utm_medium || "job_apply", 120),
          campaign: clean(body.utm_campaign || "public_job_apply", 160),
          content: clean(body.utm_content, 160),
          term: clean(body.utm_term, 160),
          landingPage: clean(body.landingPage, 500),
          referrer: clean(body.referrer, 500)
        }
      }, { merge: true });

      tx.set(appRef, {
        id: applicationId,
        applicationId,
        jobId,
        jobTitle: job.title || job.jobTitle || "",
        companyName: job.companyName || job.hiringOrganizationName || "",
        candidateId,
        candidateLeadId: leadId,
        candidateName: name,
        name,
        email,
        candidateEmail: email,
        phone: phoneDigits,
        candidatePhone: phoneDigits,
        location,
        experience,
        qualification,
        status: "applied",
        applicationStatus: "Applied",
        source: "public_job_quick_apply",
        registrationRequired: false,
        candidateAccountExists: Boolean(candidateId),
        jobOwnerUid: ownerUid,
        ownerUid,
        recruiterId,
        employerId,
        consultancyId,
        appliedAt: now,
        createdAt: now,
        updatedAt: now,
        consentToShareApplication: true,
        consentAt: now
      }, { merge: false });

      tx.set(jobRef, {
        applicationCount: Number(job.applicationCount || job.applicants || 0) + 1,
        lastApplicationAt: now,
        updatedAt: job.updatedAt || now
      }, { merge: true });

      if (ownerUid) {
        tx.set(db.collection("notifications").doc(`quick_apply_${applicationId}`), {
          userId: ownerUid,
          title: "New Candidate Application",
          message: `${name} applied for ${job.title || job.jobTitle || "your job"}.`,
          type: "application",
          read: false,
          jobId,
          applicationId,
          candidateLeadId: leadId,
          createdAt: now
        }, { merge: true });
      }
    });

    res.status(duplicate ? 200 : 201).json({
      success: true,
      duplicate,
      applicationId,
      leadId,
      candidateAccountExists: Boolean(candidateId),
      message: duplicate
        ? "Your application was already received for this job."
        : "Application submitted successfully. Registration is not required to apply."
    });
    return true;
  } catch (err: any) {
    console.error("[/api/public/job-apply]", err?.message || err);
    res.status(500).json({ success: false, error: "We could not submit your application right now. Please try again." });
    return true;
  }
}
