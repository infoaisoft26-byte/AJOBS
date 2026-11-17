import type { Request, Response } from "express";
import { neon } from "@neondatabase/serverless";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const roleOf = (value: unknown) => clean(value, 60).toLowerCase().replace(/[\s-]+/g, "_");
const asIso = (value: any): string | null => {
  if (!value) return null;
  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  } catch { return null; }
};
const sqlClient = () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(process.env.DATABASE_URL);
};
const safeJson = (value: any) => JSON.parse(JSON.stringify(value ?? {}, (_key, item) => {
  if (/password|otp|token|secret|private.?key|credential/i.test(_key)) return undefined;
  if (typeof item === "function") return undefined;
  return item;
}));

async function verifyRequest(req: Request) {
  const header = clean(req.headers.authorization, 4096);
  if (!header.startsWith("Bearer ")) throw Object.assign(new Error("Authentication required."), { status: 401 });
  return getFirebaseAuth().verifyIdToken(header.slice(7).trim(), true);
}
async function isAdmin(uid: string) {
  const db = getFirestoreDb();
  const snap = await db.collection("admins").doc(uid).get();
  if (!snap.exists) return false;
  const admin = snap.data() || {};
  return admin.isActive !== false && !["disabled","suspended","blocked","inactive"].includes(roleOf(admin.status));
}

export async function handleNeonIngestionRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (!["/api/neon/candidate-sync", "/api/neon/application-sync", "/api/neon/interview-sync", "/api/neon/health"].includes(path)) return false;

  if (path === "/api/neon/health") {
    if (req.method !== "GET") { res.status(405).json({ success:false,error:"Method not allowed" }); return true; }
    try {
      const sql = sqlClient();
      await sql`SELECT 1 AS connected`;
      res.json({ success:true, connected:true, provider:"neon-postgresql", mode:"firebase-authenticated-dual-write" });
    } catch (error:any) {
      console.error("[Neon health] Connection check failed:", error?.message || error);
      res.status(503).json({ success:false, connected:false, provider:"neon-postgresql", error:"DATABASE_CONNECTION_FAILED" });
    }
    return true;
  }

  if (req.method !== "POST") { res.setHeader("Allow", "POST"); res.status(405).json({ success:false,error:"Method not allowed" }); return true; }

  try {
    const decoded: any = await verifyRequest(req);
    const db = getFirestoreDb();

    if (path === "/api/neon/candidate-sync") {
      const [userSnap, candidateSnap, candidateProfileSnap, legacyProfileSnap] = await Promise.all([
        db.collection("users").doc(decoded.uid).get(),
        db.collection("candidates").doc(decoded.uid).get(),
        db.collection("candidateProfiles").doc(decoded.uid).get(),
        db.collection("candidate_profiles").doc(decoded.uid).get()
      ]);
      const submitted = safeJson(req.body?.candidate || {});
      const user = userSnap.data() || {};
      const candidate = candidateSnap.data() || {};
      // Prefer the detailed candidate profile over the minimal auth user document;
      // otherwise blank fields from users/{uid} can erase resume/profile data.
      const profile = { ...safeJson(user), ...safeJson(candidate), ...safeJson(candidateProfileSnap.data()), ...safeJson(legacyProfileSnap.data()), ...submitted };
      const resolvedName = clean(user.fullName || user.name || candidate.fullName || candidate.name || submitted.fullName || submitted.name || decoded.name, 180);
      if (!resolvedName || !clean(decoded.email || user.email || submitted.email, 254)) {
        res.status(400).json({ success:false,error:"CANDIDATE_PROFILE_INCOMPLETE",message:"Name and verified Firebase email are required to sync a candidate profile." }); return true;
      }
      const now = new Date().toISOString();
      const candidateId = clean(user.candidateId || candidate.candidateId || submitted.candidateId, 100) || "AIJ-CAN-" + decoded.uid.slice(0,8).toUpperCase();
      const repairedUser = {
        ...safeJson(submitted), ...safeJson(user), uid:decoded.uid, candidateId,
        name:resolvedName, fullName:resolvedName, email:clean(decoded.email || user.email || submitted.email,254).toLowerCase(),
        role:"candidate", emailVerified:decoded.email_verified === true, verificationStatus:user.verificationStatus || candidate.verificationStatus || submitted.verificationStatus || "verified",
        status:user.status || "active", accountStatus:user.accountStatus || "active", isActive:user.isActive !== false,
        createdAt:user.createdAt || candidate.createdAt || now, updatedAt:now
      };
      const repairedCandidate = { ...safeJson(submitted), ...safeJson(candidate), ...repairedUser, userId:decoded.uid, skills:candidate.skills || submitted.skills || [], education:candidate.education || submitted.education || [], experience:candidate.experience || submitted.experience || [] };
      const role = roleOf(user.role || candidate.role || submitted.role || "candidate");
      if (!["candidate","jobseeker","job_seeker"].includes(role)) {
        res.status(403).json({ success:false,error:"CANDIDATE_ROLE_REQUIRED" }); return true;
      }
      const repairBatch = db.batch();
      repairBatch.set(db.collection("users").doc(decoded.uid), repairedUser, { merge:true });
      repairBatch.set(db.collection("candidates").doc(decoded.uid), repairedCandidate, { merge:true });
      repairBatch.set(db.collection("candidateProfiles").doc(decoded.uid), repairedCandidate, { merge:true });
      await repairBatch.commit();
      const email = clean(decoded.email || user.email || candidate.email || submitted.email, 254).toLowerCase();
      const displayName = clean(profile.fullName || profile.name || decoded.name, 180);
      const createdAt = asIso(user.createdAt || candidate.createdAt || submitted.createdAt) || new Date().toISOString();
      const updatedAt = asIso(user.updatedAt || candidate.updatedAt) || new Date().toISOString();
      // Support the exact consent field names emitted by both registration UIs.
      const whatsappConsent = profile.whatsappMarketingConsent === true || profile.whatsappOptIn === true || profile.whatsappConsent === true;
      const emailConsent = profile.emailMarketingConsent === true || profile.emailOptIn === true || profile.emailConsent === true;
      const attribution = safeJson({
        acquisitionSource: user.acquisitionSource || candidate.acquisitionSource || user.source || "organic",
        registrationSource: user.registrationSource || candidate.registrationSource || "Direct Website",
        registrationMethod: user.registrationMethod || candidate.registrationMethod || "unknown",
        gclid: user.gclid || candidate.gclid || null,
        utm_source: user.utm_source || candidate.utm_source || null,
        utm_medium: user.utm_medium || candidate.utm_medium || null,
        utm_campaign: user.utm_campaign || candidate.utm_campaign || null,
        utm_content: user.utm_content || candidate.utm_content || null,
        utm_term: user.utm_term || candidate.utm_term || null,
        consultancyId: user.consultancyId || candidate.consultancyId || null
      });
      const profilePayload = safeJson({
        fullName: displayName, phone: profile.phone || profile.phoneNumber || profile.mobileNumber || "",
        dob: profile.dob || profile.dateOfBirth || null, gender: profile.gender || null,
        city: profile.city || profile.currentCity || profile.location || "",
        state: profile.state || profile.currentState || "",
        headline: profile.headline || profile.currentJobTitle || "",
        preferredRoles: profile.preferredRoles || profile.preferredJobRoles || [],
        preferredLocations: profile.preferredLocations || profile.preferredCities || [],
        skills: profile.skills || [], education: profile.education || [],
        experience: profile.experience || [], certifications: profile.certifications || [],
        resumeUrl: profile.resumeURL || profile.resumeUrl || null,
        workStatus: profile.workStatus || null, noticePeriod: profile.noticePeriod || null,
        preferredWorkMode: profile.preferredWorkMode || null, preferredJobType: profile.preferredJobType || null,
        candidateId, profileCompletion: Number(profile.profileCompletion || profile.profile_completion || 0),
        profileStatus: profile.profileStatus || profile.profile_status || "incomplete",
        currentJobTitle: profile.currentJobTitle || profile.targetRole || null,
        currentCompany: profile.currentCompany || null,
        experienceType: profile.experienceType || profile.workStatus || null,
        totalExperienceYears: profile.totalExperienceYears ?? profile.experience ?? null,
        currentSalary: profile.currentSalary ?? null, industry: profile.industry || null,
        department: profile.department || null, highestEducation: profile.highestEducation || null,
        pursuingEducation: profile.pursuingEducation || null, educationDetails: profile.educationDetails || {},
        languages: profile.languages || [], englishProficiency: profile.englishProficiency || null,
        preferredCities: profile.preferredCities || [], preferredLocation: profile.preferredLocation || null,
        resumeFileName: profile.resumeFileName || null, intendedJobId: profile.intendedJobId || null,
        referrer: profile.referrer || null, registrationSource: profile.registrationSource || null,
        registrationMethod: profile.registrationMethod || null
      });
      const uid = decoded.uid;
      try {
        const sql = sqlClient();
        await sql`INSERT INTO app_users (id,email,display_name,role,status,source_ref,profile,created_at,updated_at,synced_at)
          VALUES (${uid},${email},${displayName},'candidate',${clean(user.status || "active",60)},${uid},${JSON.stringify(profilePayload)}::jsonb,${createdAt}::timestamptz,now(),now())
          ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,role='candidate',status=EXCLUDED.status,profile=EXCLUDED.profile,updated_at=now(),synced_at=now()`;
        await sql`INSERT INTO candidate_profiles (user_id,candidate_id,phone,city,state,headline,preferred_roles,preferred_locations,skills,education,experience,resume_url,profile_completion,profile_status,whatsapp_opt_in,email_opt_in,attribution,profile,created_at,updated_at,synced_at)
          VALUES (${uid},${candidateId},${clean(profile.phone || profile.phoneNumber || profile.mobileNumber,40)},${clean(profile.city || profile.currentCity || profile.location,120)},${clean(profile.state || profile.currentState,120)},${clean(profile.headline || profile.currentJobTitle,240)},${JSON.stringify(profilePayload.preferredRoles)}::jsonb,${JSON.stringify(profilePayload.preferredLocations)}::jsonb,${JSON.stringify(profilePayload.skills)}::jsonb,${JSON.stringify(profilePayload.education)}::jsonb,${JSON.stringify(profilePayload.experience)}::jsonb,${clean(profilePayload.resumeUrl,2000) || null},${Number(user.profileCompletion || candidate.profileCompletion || 0)},${clean(user.profileStatus || candidate.profileStatus || "incomplete",60)},${whatsappConsent},${emailConsent},${JSON.stringify(attribution)}::jsonb,${JSON.stringify(profilePayload)}::jsonb,${createdAt}::timestamptz,now(),now())
          ON CONFLICT (user_id) DO UPDATE SET candidate_id=EXCLUDED.candidate_id,phone=EXCLUDED.phone,city=EXCLUDED.city,state=EXCLUDED.state,headline=EXCLUDED.headline,preferred_roles=EXCLUDED.preferred_roles,preferred_locations=EXCLUDED.preferred_locations,skills=EXCLUDED.skills,education=EXCLUDED.education,experience=EXCLUDED.experience,resume_url=EXCLUDED.resume_url,profile_completion=EXCLUDED.profile_completion,profile_status=EXCLUDED.profile_status,whatsapp_opt_in=EXCLUDED.whatsapp_opt_in,email_opt_in=EXCLUDED.email_opt_in,attribution=EXCLUDED.attribution,profile=EXCLUDED.profile,updated_at=now(),synced_at=now()`;
        await sql`INSERT INTO activity_events (id,user_id,role,event_name,source,occurred_at,attribution,metadata)
          VALUES (${"candidate_registration_completed:" + uid},${uid},'candidate','candidate_registration_completed','registration',now(),${JSON.stringify(attribution)}::jsonb,${JSON.stringify({ registrationMethod: user.registrationMethod || "unknown", candidateId: user.candidateId || null })}::jsonb)
          ON CONFLICT (id) DO UPDATE SET occurred_at=now(),attribution=EXCLUDED.attribution,metadata=EXCLUDED.metadata`;
        await sql`INSERT INTO user_consents (id,user_id,channel,purpose,granted,source,recorded_at,metadata)
          VALUES (${uid + ":whatsapp:marketing"},${uid},'whatsapp','marketing_updates',${whatsappConsent},'candidate_registration',now(),'{}'::jsonb)
          ON CONFLICT (user_id,channel,purpose) DO UPDATE SET granted=EXCLUDED.granted,recorded_at=now()`;
        await sql`INSERT INTO user_consents (id,user_id,channel,purpose,granted,source,recorded_at,metadata)
          VALUES (${uid + ":email:marketing"},${uid},'email','marketing_updates',${emailConsent},'candidate_registration',now(),'{}'::jsonb)
          ON CONFLICT (user_id,channel,purpose) DO UPDATE SET granted=EXCLUDED.granted,recorded_at=now()`;
  
      } catch (syncError:any) {
        console.warn("[Candidate Neon sync] Firestore profile was repaired; Neon mirror will retry:",syncError?.message || syncError);
        res.json({ success:true, synced:false, firestoreRepaired:true, userId:uid, candidateId });
        return true;
      }
      res.json({ success:true, synced:true, userId:uid, candidateId:user.candidateId || candidate.candidateId || null });
      return true;
    }

    if (path === "/api/neon/interview-sync") {
      const interviewId = clean(req.body?.interviewId, 180);
      if (!interviewId) { res.status(400).json({ success:false,error:"INTERVIEW_ID_REQUIRED" }); return true; }
      const interviewSnap = await db.collection("interviews").doc(interviewId).get();
      if (!interviewSnap.exists) { res.status(404).json({ success:false,error:"INTERVIEW_NOT_FOUND" }); return true; }
      const interview = interviewSnap.data() || {};
      const applicationId = clean(interview.applicationId,180);
      const applicationSnap = applicationId ? await db.collection("applications").doc(applicationId).get() : null;
      const application = applicationSnap?.exists ? applicationSnap.data() || {} : {};
      const allowedIds = [application.candidateId,application.userId,application.recruiterId,application.assignedRecruiterId,application.employerId,application.companyId,interview.candidateId,interview.recruiterId,interview.employerId].map(v=>clean(v,180));
      if (!allowedIds.includes(decoded.uid) && !(await isAdmin(decoded.uid))) {
        res.status(403).json({ success:false,error:"INTERVIEW_ACCESS_DENIED" }); return true;
      }
      const sql = sqlClient();
      await sql`INSERT INTO interviews (id,application_id,job_id,candidate_id,recruiter_id,employer_id,status,scheduled_at,source_ref,payload,synced_at)
        VALUES (${interviewId},${applicationId || null},${clean(interview.jobId || application.jobId,180)},${clean(interview.candidateId || application.candidateId,180)},${clean(interview.recruiterId || interview.assignedRecruiterId || application.assignedRecruiterId,180)},${clean(interview.employerId || application.employerId,180)},${clean(interview.status || "scheduled",80)},${asIso(interview.scheduledAt || interview.interviewDate)}::timestamptz,${interviewId},${JSON.stringify(safeJson(interview))}::jsonb,now())
        ON CONFLICT (id) DO UPDATE SET application_id=EXCLUDED.application_id,job_id=EXCLUDED.job_id,candidate_id=EXCLUDED.candidate_id,recruiter_id=EXCLUDED.recruiter_id,employer_id=EXCLUDED.employer_id,status=EXCLUDED.status,scheduled_at=EXCLUDED.scheduled_at,payload=EXCLUDED.payload,updated_at=now(),synced_at=now()`;
      res.json({success:true,synced:true,interviewId});
      return true;
    }

    const applicationId = clean(req.body?.applicationId, 180);
    if (!applicationId) { res.status(400).json({ success:false,error:"APPLICATION_ID_REQUIRED" }); return true; }
    const applicationSnap = await db.collection("applications").doc(applicationId).get();
    if (!applicationSnap.exists) { res.status(404).json({ success:false,error:"APPLICATION_NOT_FOUND" }); return true; }
    const application = applicationSnap.data() || {};
    const owner = clean(application.candidateId || application.userId, 180);
    const allowedIds = [owner,application.recruiterId,application.assignedRecruiterId,application.employerId,application.companyId,application.consultancyId].map(v=>clean(v,180));
    if (!allowedIds.includes(decoded.uid) && !(await isAdmin(decoded.uid))) {
      res.status(403).json({ success:false,error:"APPLICATION_ACCESS_DENIED" }); return true;
    }
    const payload = safeJson({ ...application, id:applicationId });
    const sql = sqlClient();
    await sql`INSERT INTO applications (id,job_id,candidate_id,recruiter_id,employer_id,consultancy_id,status,applied_at,source_ref,payload,synced_at)
      VALUES (${applicationId},${clean(application.jobId,180)},${owner},${clean(application.recruiterId || application.assignedRecruiterId,180)},${clean(application.employerId || application.companyId,180)},${clean(application.consultancyId,180)},${clean(application.status || "applied",80)},${asIso(application.appliedAt || application.createdAt)}::timestamptz,${applicationId},${JSON.stringify(payload)}::jsonb,now())
      ON CONFLICT (id) DO UPDATE SET job_id=EXCLUDED.job_id,candidate_id=EXCLUDED.candidate_id,recruiter_id=EXCLUDED.recruiter_id,employer_id=EXCLUDED.employer_id,consultancy_id=EXCLUDED.consultancy_id,status=EXCLUDED.status,applied_at=EXCLUDED.applied_at,payload=EXCLUDED.payload,updated_at=now(),synced_at=now()`;
    res.json({ success:true,synced:true,applicationId });
    return true;
  } catch (error:any) {
    console.error("[Neon Ingestion]",error?.message || error);
    res.status(Number(error?.status) || 500).json({ success:false,error:"NEON_SYNC_FAILED",message:"Your AIJOBS account remains available; the record will be retried on the next sync." });
    return true;
  }
}
