import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const ALLOWED_ROLES = new Set(["recruiter", "consultancy", "employer", "admin", "superadmin", "super_admin"]);
const STATUS_MAP: Record<string, string> = {
  new: "uncontacted",
  applied: "uncontacted",
  viewed: "in_discussion",
  screening: "in_discussion",
  under_review: "in_discussion",
  shortlisted: "interested",
  interview: "interested",
  interview_scheduled: "interested",
  selected: "converted",
  hired: "converted",
  joined: "converted",
  rejected: "uncontacted",
};

function clean(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}
function norm(value: unknown) {
  return clean(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
}
function toIso(value: any) {
  if (!value) return "";
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
function uniqueById(items: any[]) {
  const map = new Map<string, any>();
  for (const item of items) {
    if (item?.id && !map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

async function getIdentity(req: Request, res: Response) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Please sign in again." });
    return null;
  }
  const decoded: any = await getFirebaseAuth().verifyIdToken(header.slice(7).trim());
  const db = getFirestoreDb();
  const userSnap = await db.collection("users").doc(decoded.uid).get();
  const user = userSnap.exists ? userSnap.data() || {} : {};
  const role = norm(decoded.role || user.role || user.userType);
  if (!ALLOWED_ROLES.has(role)) {
    res.status(403).json({ success: false, error: "FORBIDDEN", message: "This workspace cannot access hiring leads." });
    return null;
  }
  return { uid: decoded.uid, role, db, user };
}

async function getOwnedJobIds(db: any, uid: string) {
  const fields = ["recruiterId", "employerId", "consultancyId", "ownerUid", "createdBy", "postedBy"];
  const ids = new Set<string>();
  for (const field of fields) {
    try {
      const snap = await db.collection("jobs").where(field, "==", uid).limit(100).get();
      snap.forEach((d: any) => ids.add(d.id));
    } catch (err) {
      console.warn(`[RecruiterLiveLeads] job lookup skipped for ${field}`);
    }
  }
  return ids;
}

function applicationToLead(doc: any, data: any) {
  const status = norm(data.status || data.applicationStatus || "applied");
  return {
    id: doc.id,
    sourceType: "application",
    sourceRefId: doc.id,
    candidateId: data.candidateId || data.userId || null,
    candidateName: data.candidateName || data.name || "Candidate",
    email: data.candidateEmail || data.email || "",
    phone: data.candidatePhone || data.phone || "",
    location: data.candidateLocation || data.location || "",
    experience: data.candidateExperience || data.experience || "",
    qualification: data.qualification || "",
    skills: Array.isArray(data.candidateSkills || data.skills) ? (data.candidateSkills || data.skills) : [],
    resumeUrl: data.resumeUrl || data.resumeURL || "",
    jobId: data.jobId || "",
    jobTitle: data.jobTitle || "Job",
    companyName: data.companyName || "AIJOBS Partner",
    source: data.source || "AIJOBS Job Application",
    assignedBy: data.assignedByName || data.consultancyName || "AIJOBS Job Apply",
    assignedAt: toIso(data.appliedAt || data.createdAt || data.updatedAt),
    status: STATUS_MAP[status] || "uncontacted",
    applicationStatus: data.status || data.applicationStatus || "applied",
    recruiterId: data.recruiterId || null,
    employerId: data.employerId || null,
    consultancyId: data.consultancyId || null,
    ownerUid: data.ownerUid || data.jobOwnerUid || null,
  };
}

function candidateLeadToLead(doc: any, data: any) {
  const status = norm(data.status || data.currentStatus || "new");
  return {
    id: doc.id,
    sourceType: "candidate_lead",
    sourceRefId: doc.id,
    candidateId: data.candidateId || null,
    candidateName: data.candidateName || data.name || "Candidate",
    email: data.email || data.candidateEmail || "",
    phone: data.phone || data.candidatePhone || "",
    location: data.location || "",
    experience: data.experience || "",
    qualification: data.qualification || "",
    skills: Array.isArray(data.skills) ? data.skills : [],
    resumeUrl: data.resumeUrl || data.resume || "",
    jobId: data.sourceJobId || data.jobId || "",
    jobTitle: data.sourceJobTitle || data.jobTitle || "Job",
    companyName: data.companyName || data.company || "AIJOBS Partner",
    source: data.source || "Candidate Lead",
    assignedBy: data.assignedByName || data.assignedBy || "AIJOBS",
    assignedAt: toIso(data.firstCapturedAt || data.createdAt || data.assignedAt || data.updatedAt),
    status: STATUS_MAP[status] || (status === "in_discussion" || status === "interested" || status === "converted" || status === "uncontacted" ? status : "uncontacted"),
    applicationStatus: data.currentStatus || data.status || "new",
    recruiterId: data.recruiterId || data.assignedRecruiterId || null,
    employerId: data.employerId || null,
    consultancyId: data.consultancyId || null,
    ownerUid: data.ownerUid || null,
  };
}

async function queryField(db: any, collectionName: string, field: string, uid: string, mapper: (doc: any, data: any) => any) {
  try {
    const snap = await db.collection(collectionName).where(field, "==", uid).limit(100).get();
    return snap.docs.map((d: any) => mapper(d, d.data() || {}));
  } catch (err) {
    console.warn(`[RecruiterLiveLeads] ${collectionName}.${field} query skipped`);
    return [];
  }
}

export async function handleRecruiterLiveLeadsRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/recruiter/live-leads") return false;

  try {
    const identity = await getIdentity(req, res);
    if (!identity) return true;
    const { uid, db } = identity;

    if (req.method === "GET") {
      const ownedJobIds = await getOwnedJobIds(db, uid);
      const applicationFields = ["recruiterId", "employerId", "consultancyId", "ownerUid", "jobOwnerUid", "assignedRecruiterId"];
      const leadFields = ["recruiterId", "assignedRecruiterId", "employerId", "consultancyId", "ownerUid"];
      const all: any[] = [];

      for (const field of applicationFields) {
        all.push(...await queryField(db, "applications", field, uid, applicationToLead));
      }
      for (const field of leadFields) {
        all.push(...await queryField(db, "candidate_leads", field, uid, candidateLeadToLead));
        all.push(...await queryField(db, "leads", field, uid, candidateLeadToLead));
      }

      if (ownedJobIds.size) {
        const ids = Array.from(ownedJobIds);
        for (let i = 0; i < ids.length; i += 30) {
          const chunk = ids.slice(i, i + 30);
          try {
            const snap = await db.collection("applications").where("jobId", "in", chunk).limit(200).get();
            all.push(...snap.docs.map((d: any) => applicationToLead(d, d.data() || {})));
          } catch (err) {
            console.warn("[RecruiterLiveLeads] owned-job application lookup skipped");
          }
          try {
            const snap = await db.collection("candidate_leads").where("sourceJobId", "in", chunk).limit(200).get();
            all.push(...snap.docs.map((d: any) => candidateLeadToLead(d, d.data() || {})));
          } catch (err) {
            console.warn("[RecruiterLiveLeads] owned-job lead lookup skipped");
          }
        }
      }

      const leads = uniqueById(all)
        .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")))
        .slice(0, 300);

      return res.json({ success: true, leads, count: leads.length, refreshedAt: new Date().toISOString() }), true;
    }

    if (req.method === "PATCH") {
      const body: any = req.body || {};
      const leadId = clean(body.leadId, 180);
      const sourceType = clean(body.sourceType, 40);
      const nextStatus = norm(body.status);
      if (!leadId || !["uncontacted", "in_discussion", "interested", "converted"].includes(nextStatus)) {
        res.status(400).json({ success: false, error: "INVALID_UPDATE", message: "Lead ID and valid lead status are required." });
        return true;
      }

      const collectionName = sourceType === "application" ? "applications" : sourceType === "candidate_lead" ? "candidate_leads" : "leads";
      const ref = db.collection(collectionName).doc(leadId);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: "LEAD_NOT_FOUND" });
        return true;
      }
      const data: any = snap.data() || {};
      const ownedJobIds = await getOwnedJobIds(db, uid);
      const allowed = [data.recruiterId, data.assignedRecruiterId, data.employerId, data.consultancyId, data.ownerUid, data.jobOwnerUid].filter(Boolean).includes(uid)
        || (data.jobId && ownedJobIds.has(data.jobId))
        || (data.sourceJobId && ownedJobIds.has(data.sourceJobId));
      if (!allowed) {
        res.status(403).json({ success: false, error: "FORBIDDEN", message: "This lead does not belong to your workspace." });
        return true;
      }

      const now = new Date().toISOString();
      if (collectionName === "applications") {
        const applicationStatus = nextStatus === "uncontacted" ? "applied" : nextStatus === "in_discussion" ? "under_review" : nextStatus === "interested" ? "shortlisted" : "selected";
        await ref.set({ status: applicationStatus, updatedAt: now, leadStatus: nextStatus }, { merge: true });
      } else {
        await ref.set({ status: nextStatus, currentStatus: nextStatus, updatedAt: now }, { merge: true });
      }
      res.json({ success: true, leadId, status: nextStatus, updatedAt: now });
      return true;
    }

    res.setHeader("Allow", "GET, PATCH");
    res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
    return true;
  } catch (err: any) {
    console.error("[/api/recruiter/live-leads]", err?.message || err);
    const authError = String(err?.code || "").startsWith("auth/");
    res.status(authError ? 401 : 500).json({
      success: false,
      error: authError ? "UNAUTHORIZED" : "LIVE_LEADS_FAILED",
      message: authError ? "Your login session expired. Please sign in again." : "Unable to load live candidate leads right now."
    });
    return true;
  }
}
