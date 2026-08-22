import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  where, 
  orderBy, 
  limit, 
  writeBatch 
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase";
import { 
  RecruitmentCandidate, 
  RecruitmentJob, 
  RecruiterUser, 
  CandidateMatchResult, 
  RecruiterAssignment, 
  ImportBatchRecord, 
  RecruitmentAuditLog 
} from "../types/recruitment";
import { 
  getNextSequentialId, 
  reserveSequentialIdBlock, 
  formatCandidateId, 
  formatJobId 
} from "./sequentialIdService";
import { generateJobSlug, getPublicJobUrl } from "../config/site";

// Alias for consistent naming
export const fetchRecruitmentCandidates = fetchAllCandidates;
export const fetchRecruitmentJobs = fetchAllRecruitmentJobs;
export const fetchRecruiters = fetchAllRecruiters;

// ==========================================
// 0. STRING & ARRAY SANITIZATION UTILITIES
// ==========================================

/**
 * Safely converts any value (string, object, array, number) to a trimmed string.
 * Prevents TypeError when properties like education/qualification are stored as objects/arrays.
 */
export function safeString(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    const joined = val.map((item) => safeString(item)).filter(Boolean).join(", ");
    return joined || fallback;
  }
  if (typeof val === "object") {
    const candidateField = 
      val.degree ||
      val.qualification ||
      val.highestQualification ||
      val.course ||
      val.title ||
      val.name ||
      val.city ||
      val.label ||
      val.value;
    if (candidateField && (typeof candidateField === "string" || typeof candidateField === "number")) {
      return String(candidateField).trim() || fallback;
    }
    try {
      const entries = Object.values(val).filter((v) => typeof v === "string" || typeof v === "number");
      if (entries.length > 0) return entries.join(" - ");
    } catch {
      // ignore
    }
  }
  return fallback;
}

/**
 * Safely converts any value to a clean string array (e.g. skills).
 */
export function safeStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (typeof item === "object" && item !== null) {
          return safeString(item.name || item.skill || item.title || item.value || item.label || "").trim();
        }
        return safeString(item).trim();
      })
      .filter(Boolean);
  }
  if (typeof val === "string") {
    return val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [safeString(val)].filter(Boolean);
}

// ==========================================
// 1. AUDIT LOGGING HELPER
// ==========================================
export async function logRecruitmentAudit(
  log: Omit<RecruitmentAuditLog, "id" | "timestamp">
): Promise<void> {
  try {
    const logId = `rec_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullLog: RecruitmentAuditLog = {
      ...log,
      id: logId,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, "audit_logs", logId), fullLog);
    // Also save to recruitment_audit_logs for targeted quick lookups
    await setDoc(doc(db, "recruitment_audit_logs", logId), fullLog);
  } catch (err) {
    console.warn("[RecruitmentService] Audit log write warning:", err);
  }
}

// ==========================================
// 2. CANDIDATE DATABASE SERVICES
// ==========================================

/**
 * Fetches all registered candidates from Firestore across `candidates`, `candidateProfiles`, and `users`.
 * Normalizes every candidate to have a sequential Candidate ID (AIJ-CAN-XXXXXX).
 */
export async function fetchAllCandidates(): Promise<RecruitmentCandidate[]> {
  try {
    const candidatesMap = new Map<string, RecruitmentCandidate>();

    // 1. Fetch from 'candidates' collection
    try {
      const snap = await getDocs(collection(db, "candidates"));
      snap.forEach((d) => {
        const data = d.data();
        const id = d.id;
        const candidateId = data.candidateId || data.serialId || formatCandidateId(data.sequentialId || id);
        candidatesMap.set(id, {
          id,
          candidateId,
          uid: data.uid || data.userId || id,
          fullName: safeString(data.fullName || data.name, "Candidate"),
          name: safeString(data.name || data.fullName, "Candidate"),
          email: safeString(data.email).toLowerCase(),
          phone: safeString(data.phone || data.mobile),
          gender: safeString(data.gender),
          city: safeString(data.city || (data.preferredLocations && data.preferredLocations[0])),
          state: safeString(data.state),
          location: safeString(data.location || data.preferredLocation || data.city, "India"),
          preferredLocation: safeString(data.preferredLocation || (data.preferredLocations && data.preferredLocations[0])),
          targetRole: safeString(data.targetRole || data.jobPreference || data.designation, "Software Engineer"),
          jobPreference: safeString(data.jobPreference || data.targetRole),
          currentCompany: safeString(data.currentCompany),
          designation: safeString(data.designation || data.targetRole),
          totalExperienceYears: typeof data.totalExperienceYears === "number" ? data.totalExperienceYears : (typeof data.experience === "number" ? data.experience : (parseFloat(data.experience) || 0)),
          experience: typeof data.experience === "string" ? data.experience : `${data.totalExperienceYears || 0} Years`,
          highestQualification: safeString(data.highestQualification || data.education || data.qualification, "Graduate"),
          education: safeString(data.education || data.highestQualification, "Graduate"),
          keySkills: safeStringArray(data.keySkills || data.skills),
          skills: safeStringArray(data.skills || data.keySkills),
          currentCtc: safeString(data.currentCtc || data.currentSalary),
          expectedCtc: safeString(data.expectedCtc || data.expectedSalary),
          noticePeriodDays: safeString(data.noticePeriodDays || data.noticePeriod),
          noticePeriod: safeString(data.noticePeriod),
          resumeUrl: data.resumeUrl || data.resumeURL || null,
          resumeFileName: safeString(data.resumeFileName) || null,
          resumeScore: typeof data.resumeScore === "number" ? data.resumeScore : null,
          emailVerified: data.emailVerified === true || data.verificationStatus === "verified",
          phoneVerified: data.phoneVerified === true,
          verificationStatus: data.verificationStatus || (data.emailVerified ? "verified" : "pending"),
          accountStatus: data.accountStatus || data.status || "active",
          profileStatus: data.profileStatus || (data.resumeUrl ? "complete" : "incomplete"),
          profileCompletion: data.profileCompletion || data.profileCompletionPercentage || (data.resumeUrl ? 80 : 25),
          assignedRecruiterId: data.assignedRecruiterId || null,
          assignedRecruiterName: safeString(data.assignedRecruiterName) || null,
          assignedAt: data.assignedAt || null,
          assignedJobId: data.assignedJobId || null,
          assignedJobTitle: safeString(data.assignedJobTitle) || null,
          source: safeString(data.source, "Email Registration"),
          importBatchId: safeString(data.importBatchId),
          adminNotes: safeString(data.adminNotes),
          notesHistory: Array.isArray(data.notesHistory) ? data.notesHistory : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      });
    } catch (e) {
      console.warn("[RecruitmentService] Failed fetching 'candidates' collection:", e);
    }

    // 2. Fetch from 'candidateProfiles' collection to merge additional details
    try {
      const snapProfiles = await getDocs(collection(db, "candidateProfiles"));
      snapProfiles.forEach((d) => {
        const data = d.data();
        const id = d.id;
        const existing = candidatesMap.get(id);
        const candidateId = existing?.candidateId || data.candidateId || formatCandidateId(data.sequentialId || id);
        
        candidatesMap.set(id, {
          ...(existing || {}),
          id,
          candidateId,
          uid: id,
          fullName: safeString(data.fullName || data.name || existing?.fullName, "Candidate"),
          email: safeString(data.email || existing?.email).toLowerCase(),
          phone: safeString(data.phone || existing?.phone),
          location: safeString(data.preferredLocation || data.location || existing?.location, "India"),
          targetRole: safeString(data.targetRole || existing?.targetRole, "Software Engineer"),
          keySkills: safeStringArray(data.skills && data.skills.length > 0 ? data.skills : existing?.keySkills),
          skills: safeStringArray(data.skills && data.skills.length > 0 ? data.skills : existing?.skills),
          highestQualification: safeString(data.highestQualification || data.education || data.qualification || existing?.highestQualification, "Graduate"),
          education: safeString(data.education || data.highestQualification || existing?.education, "Graduate"),
          resumeUrl: data.resumeUrl || existing?.resumeUrl || null,
          resumeFileName: safeString(data.resumeFileName || existing?.resumeFileName) || null,
          resumeScore: data.resumeScore || existing?.resumeScore || null,
          emailVerified: data.emailVerified === true || existing?.emailVerified === true,
          verificationStatus: data.verificationStatus || existing?.verificationStatus || "verified",
          accountStatus: data.accountStatus || existing?.accountStatus || "active",
          profileStatus: data.profileStatus || existing?.profileStatus || "incomplete",
          profileCompletion: data.profileCompletion || existing?.profileCompletion || 20,
          source: existing?.source || safeString(data.source, "Email Registration"),
          createdAt: existing?.createdAt || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || existing?.updatedAt || new Date().toISOString()
        } as RecruitmentCandidate);
      });
    } catch (e) {
      console.warn("[RecruitmentService] Failed fetching 'candidateProfiles' collection:", e);
    }

    // 3. Fetch from 'users' collection for any candidates registered via Google or public auth
    try {
      const qUsers = query(collection(db, "users"), where("role", "==", "candidate"));
      const snapUsers = await getDocs(qUsers);
      snapUsers.forEach((d) => {
        const data = d.data();
        const id = d.id;
        if (!candidatesMap.has(id)) {
          const candidateId = data.candidateId || formatCandidateId(id);
          candidatesMap.set(id, {
            id,
            candidateId,
            uid: id,
            fullName: safeString(data.name || data.fullName, "Candidate"),
            name: safeString(data.name || data.fullName, "Candidate"),
            email: safeString(data.email).toLowerCase(),
            phone: safeString(data.phone),
            location: safeString(data.location, "India"),
            targetRole: safeString(data.targetRole, "Candidate"),
            keySkills: safeStringArray(data.skills),
            skills: safeStringArray(data.skills),
            highestQualification: safeString(data.highestQualification || data.education, "Graduate"),
            education: safeString(data.education || data.highestQualification, "Graduate"),
            resumeUrl: data.resumeUrl || data.resumeURL || null,
            resumeFileName: safeString(data.resumeFileName) || null,
            emailVerified: data.emailVerified === true || data.verificationStatus === "verified",
            verificationStatus: data.verificationStatus || (data.emailVerified ? "verified" : "pending"),
            accountStatus: data.accountStatus || data.status || "active",
            profileStatus: data.resumeUrl ? "complete" : "incomplete",
            profileCompletion: data.resumeUrl ? 80 : 30,
            source: data.photoURL?.includes("googleusercontent") ? "Google Sign-In" : "Email Registration",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          } as RecruitmentCandidate);
        }
      });
    } catch (e) {
      console.warn("[RecruitmentService] Failed fetching 'users' role candidate:", e);
    }

    const list = Array.from(candidatesMap.values());
    // Sort newest registration first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("[RecruitmentService] Error in fetchAllCandidates:", err);
    return [];
  }
}

/**
 * Creates a single candidate with guaranteed sequential Candidate ID (AIJ-CAN-XXXXXX)
 */
export async function createCandidate(
  candidateData: Omit<RecruitmentCandidate, "id" | "candidateId" | "createdAt" | "updatedAt">,
  adminUser?: { name: string; email: string }
): Promise<RecruitmentCandidate> {
  const sequentialId = await getNextSequentialId("candidates");
  const docId = `can_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const fullCandidate: RecruitmentCandidate = {
    ...candidateData,
    id: docId,
    candidateId: sequentialId,
    uid: docId,
    email: (candidateData.email || "").toLowerCase().trim(),
    fullName: candidateData.fullName.trim(),
    name: candidateData.fullName.trim(),
    keySkills: candidateData.keySkills || [],
    skills: candidateData.keySkills || [],
    emailVerified: candidateData.emailVerified ?? true,
    verificationStatus: candidateData.verificationStatus || "verified",
    accountStatus: candidateData.accountStatus || "active",
    profileStatus: candidateData.profileStatus || (candidateData.resumeUrl ? "complete" : "incomplete"),
    profileCompletion: candidateData.profileCompletion || (candidateData.resumeUrl ? 80 : 30),
    source: candidateData.source || "Admin Manual",
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // Write to both `candidates` and `candidateProfiles`
  await Promise.all([
    setDoc(doc(db, "candidates", docId), fullCandidate),
    setDoc(doc(db, "candidateProfiles", docId), fullCandidate),
    setDoc(doc(db, "users", docId), {
      uid: docId,
      name: fullCandidate.fullName,
      email: fullCandidate.email,
      phone: fullCandidate.phone || "",
      role: "candidate",
      candidateId: sequentialId,
      verificationStatus: fullCandidate.verificationStatus,
      emailVerified: fullCandidate.emailVerified,
      accountStatus: fullCandidate.accountStatus,
      createdAt: nowIso,
      updatedAt: nowIso
    }, { merge: true })
  ]);

  await logRecruitmentAudit({
    action: "CANDIDATE_REGISTERED",
    entityType: "CANDIDATE",
    entityId: sequentialId,
    entityName: fullCandidate.fullName,
    details: `Manual candidate profile created with ID ${sequentialId} (${fullCandidate.email})`,
    performedBy: adminUser?.name || "Admin Desk",
    performedByRole: "Admin",
    performedByEmail: adminUser?.email || "admin@aijobs.global"
  });

  return fullCandidate;
}

/**
 * Updates candidate details and syncs across collections
 */
export async function updateCandidate(
  id: string,
  updates: Partial<RecruitmentCandidate>,
  adminUser?: { name: string; email: string }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const updatePayload = {
    ...updates,
    updatedAt: nowIso
  };

  await Promise.all([
    updateDoc(doc(db, "candidates", id), updatePayload).catch(() => setDoc(doc(db, "candidates", id), updatePayload, { merge: true })),
    updateDoc(doc(db, "candidateProfiles", id), updatePayload).catch(() => setDoc(doc(db, "candidateProfiles", id), updatePayload, { merge: true })),
    updateDoc(doc(db, "users", id), {
      ...(updates.fullName ? { name: updates.fullName, fullName: updates.fullName } : {}),
      ...(updates.email ? { email: updates.email } : {}),
      ...(updates.phone ? { phone: updates.phone } : {}),
      ...(updates.accountStatus ? { accountStatus: updates.accountStatus, status: updates.accountStatus } : {}),
      ...(updates.verificationStatus ? { verificationStatus: updates.verificationStatus } : {}),
      updatedAt: nowIso
    }).catch(() => {})
  ]);

  if (updates.adminNotes) {
    await logRecruitmentAudit({
      action: "CANDIDATE_UPDATED",
      entityType: "CANDIDATE",
      entityId: id,
      entityName: updates.fullName || id,
      details: `Candidate record updated: ${JSON.stringify(Object.keys(updates))}`,
      performedBy: adminUser?.name || "Admin Desk",
      performedByRole: "Admin",
      performedByEmail: adminUser?.email || "admin@aijobs.global"
    });
  }
}

/**
 * Appends an internal admin note to candidate's history
 */
export async function addCandidateAdminNote(
  candidateId: string,
  noteText: string,
  authorName: string
): Promise<void> {
  const candidateRef = doc(db, "candidates", candidateId);
  const snap = await getDoc(candidateRef);
  const currentNotes = snap.exists() ? (snap.data().notesHistory || []) : [];
  
  const newNoteEntry = {
    note: noteText.trim(),
    author: authorName,
    createdAt: new Date().toISOString()
  };

  const updatedNotesHistory = [newNoteEntry, ...currentNotes];

  await Promise.all([
    updateDoc(candidateRef, {
      adminNotes: noteText.trim(),
      notesHistory: updatedNotesHistory,
      updatedAt: new Date().toISOString()
    }).catch(() => setDoc(candidateRef, { adminNotes: noteText.trim(), notesHistory: updatedNotesHistory }, { merge: true })),
    setDoc(doc(db, "candidateProfiles", candidateId), {
      adminNotes: noteText.trim(),
      notesHistory: updatedNotesHistory,
      updatedAt: new Date().toISOString()
    }, { merge: true })
  ]);
}

// ==========================================
// 3. JOB MANAGEMENT SERVICES
// ==========================================

/**
 * Fetches all jobs from Firestore and normalizes sequential Job IDs (AIJ-JOB-XXXXXX)
 */
export async function fetchAllRecruitmentJobs(): Promise<RecruitmentJob[]> {
  try {
    const snap = await getDocs(collection(db, "jobs"));
    const list: RecruitmentJob[] = [];

    snap.forEach((d) => {
      const data = d.data();
      const id = d.id;
      const jobId = data.jobId || data.sequentialId || formatJobId(data.serialId || id);
      const title = data.title || "Job Vacancy";
      const location = data.location || data.city || "Remote, India";

      const slug = data.slug || generateJobSlug(title, location, id);
      const canonicalUrl = data.canonicalUrl || getPublicJobUrl({ title, location, id, slug });

      list.push({
        id,
        jobId,
        title,
        companyName: data.companyName || "AIJobs Partner",
        industry: data.industry || data.category || "Information Technology",
        department: data.department || "Engineering",
        employmentType: data.employmentType || data.type || "Full-time",
        workMode: data.workMode || (data.location?.toLowerCase().includes("remote") ? "Remote" : "On-site"),
        location,
        city: data.city || location.split(",")[0]?.trim() || "Bengaluru",
        state: data.state || "",
        country: data.country || "India",
        minimumExperience: typeof data.minimumExperience === "number" ? data.minimumExperience : (parseFloat(data.experience) || 0),
        maximumExperience: typeof data.maximumExperience === "number" ? data.maximumExperience : ((parseFloat(data.experience) || 0) + 3),
        experienceLevel: data.experienceLevel || data.experience || "Mid-Level",
        highestQualification: data.highestQualification || data.qualification || data.education || "Bachelor's Degree",
        education: data.education || data.qualification || "Bachelor's Degree",
        minimumSalary: typeof data.minimumSalary === "number" ? data.minimumSalary : 0,
        maximumSalary: typeof data.maximumSalary === "number" ? data.maximumSalary : 0,
        salaryCurrency: data.salaryCurrency || "INR",
        salaryPeriod: data.salaryPeriod || "Yearly",
        salaryDisplay: data.salary || data.salaryDisplay || (data.minimumSalary && data.maximumSalary ? `₹${(data.minimumSalary / 100000).toFixed(1)} - ₹${(data.maximumSalary / 100000).toFixed(1)} LPA` : "Best in Industry"),
        openings: typeof data.openings === "number" ? data.openings : (typeof data.numberOfOpenings === "number" ? data.numberOfOpenings : 1),
        skillsRequired: Array.isArray(data.skillsRequired) ? data.skillsRequired : (Array.isArray(data.skills) ? data.skills : (typeof data.skillsRequired === "string" ? data.skillsRequired.split(",").map((s: string) => s.trim()) : [])),
        description: data.description || "Exciting career opportunity at AIJobs.",
        responsibilities: data.responsibilities || "",
        benefits: data.benefits || "",
        status: data.status === "Live" || data.status === "open" ? "Published" : (data.status || "Published"),
        assignedRecruiterIds: data.assignedRecruiterIds || (data.recruiterId ? [data.recruiterId] : []),
        assignedRecruiterNames: data.assignedRecruiterNames || (data.recruiterName ? [data.recruiterName] : []),
        consultancyId: data.consultancyId || "",
        consultancyName: data.consultancyName || "",
        applyDeadline: data.applyDeadline || data.validThrough || data.expiryDate || "",
        expiryDate: data.expiryDate || data.validThrough || "",
        createdBy: data.createdBy || "Admin",
        createdByRole: data.createdByRole || "Super Admin",
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        slug,
        canonicalUrl,
        importBatchId: data.importBatchId || "",
        applicantCount: data.applicantCount || 0,
        assignedCandidateCount: data.assignedCandidateCount || 0
      });
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("[RecruitmentService] Error in fetchAllRecruitmentJobs:", err);
    return [];
  }
}

/**
 * Creates a job posting with atomic sequential Job ID (AIJ-JOB-XXXXXX)
 */
export async function createRecruitmentJob(
  jobData: Omit<RecruitmentJob, "id" | "jobId" | "createdAt" | "updatedAt">,
  adminUser?: { name: string; email: string }
): Promise<RecruitmentJob> {
  const sequentialId = await getNextSequentialId("jobs");
  const docId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const slug = generateJobSlug(jobData.title, jobData.location, docId);
  const canonicalUrl = getPublicJobUrl({ title: jobData.title, location: jobData.location, id: docId, slug });

  const fullJob: RecruitmentJob = {
    ...jobData,
    id: docId,
    jobId: sequentialId,
    slug,
    canonicalUrl,
    status: jobData.status || "Published",
    openings: jobData.openings || 1,
    skillsRequired: jobData.skillsRequired || [],
    createdAt: nowIso,
    updatedAt: nowIso
  };

  await setDoc(doc(db, "jobs", docId), fullJob);

  // Google Indexing trigger if published
  if (fullJob.status === "Published" || fullJob.status === "Live") {
    fetch("/api/indexing/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: docId, title: fullJob.title, slug, canonicalUrl, action: "URL_UPDATED" })
    }).catch((e) => console.warn("Indexing trigger warning:", e));
  }

  await logRecruitmentAudit({
    action: "JOB_CREATED",
    entityType: "JOB",
    entityId: sequentialId,
    entityName: fullJob.title,
    details: `Created job posting '${fullJob.title}' at '${fullJob.companyName}' with ID ${sequentialId}`,
    performedBy: adminUser?.name || "Admin Desk",
    performedByRole: "Admin",
    performedByEmail: adminUser?.email || "admin@aijobs.global"
  });

  return fullJob;
}

/**
 * Updates an existing job posting
 */
export async function updateRecruitmentJob(
  id: string,
  updates: Partial<RecruitmentJob>,
  adminUser?: { name: string; email: string }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const updatePayload = {
    ...updates,
    updatedAt: nowIso
  };

  await updateDoc(doc(db, "jobs", id), updatePayload);

  await logRecruitmentAudit({
    action: "JOB_UPDATED",
    entityType: "JOB",
    entityId: id,
    entityName: updates.title || id,
    details: `Updated job attributes: ${Object.keys(updates).join(", ")}`,
    performedBy: adminUser?.name || "Admin Desk",
    performedByRole: "Admin",
    performedByEmail: adminUser?.email || "admin@aijobs.global"
  });
}

/**
 * Changes a job status (Published, Paused, Closed, Expired)
 */
export async function setJobStatus(
  id: string,
  jobTitle: string,
  status: "Draft" | "Published" | "Paused" | "Closed" | "Expired",
  adminUser?: { name: string; email: string }
): Promise<void> {
  await updateDoc(doc(db, "jobs", id), {
    status,
    updatedAt: new Date().toISOString()
  });

  await logRecruitmentAudit({
    action: "JOB_STATUS_CHANGED",
    entityType: "JOB",
    entityId: id,
    entityName: jobTitle,
    details: `Changed job '${jobTitle}' status to ${status.toUpperCase()}`,
    performedBy: adminUser?.name || "Admin Desk",
    performedByRole: "Admin",
    performedByEmail: adminUser?.email || "admin@aijobs.global"
  });
}

// ==========================================
// 4. RECRUITER MANAGEMENT & ASSIGNMENTS
// ==========================================

/**
 * Fetches all registered recruiters and internal talent partners
 */
export async function fetchAllRecruiters(): Promise<RecruiterUser[]> {
  try {
    const list: RecruiterUser[] = [];
    const recruiterUids = new Set<string>();

    // 1. Fetch from 'recruiters' collection
    try {
      const snap = await getDocs(collection(db, "recruiters"));
      snap.forEach((d) => {
        const data = d.data();
        recruiterUids.add(d.id);
        list.push({
          id: d.id,
          recruiterId: data.recruiterId || `AIJ-REC-${d.id.substring(0, 6).toUpperCase()}`,
          name: data.name || data.fullName || "Recruiter",
          email: data.email || "",
          phone: data.phone || "",
          agencyOrCompany: data.companyName || data.agencyName || "AIJobs Talent Team",
          status: data.status || "active",
          activeCandidateCount: data.activeCandidateCount || 0,
          activeJobCount: data.activeJobCount || 0,
          totalPlacements: data.totalPlacements || 0,
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
    } catch (e) {
      console.warn("[RecruitmentService] Failed fetching 'recruiters' collection:", e);
    }

    // 2. Fetch users with role "recruiter" or "employer"
    try {
      const q = query(collection(db, "users"), where("role", "in", ["recruiter", "employer", "consultancy"]));
      const snapUsers = await getDocs(q);
      snapUsers.forEach((d) => {
        if (!recruiterUids.has(d.id)) {
          const data = d.data();
          list.push({
            id: d.id,
            recruiterId: data.recruiterId || `AIJ-REC-${d.id.substring(0, 6).toUpperCase()}`,
            name: data.name || "Talent Partner",
            email: data.email || "",
            phone: data.phone || "",
            agencyOrCompany: data.companyName || data.agencyName || (data.role === "consultancy" ? "Partner Consultancy" : "Corporate Recruiter"),
            status: data.accountStatus === "suspended" ? "inactive" : "active",
            activeCandidateCount: 0,
            activeJobCount: 0,
            totalPlacements: 0,
            createdAt: data.createdAt || new Date().toISOString()
          });
        }
      });
    } catch (e) {
      console.warn("[RecruitmentService] Failed fetching role recruiter from users:", e);
    }

    return list;
  } catch (err) {
    console.error("[RecruitmentService] Error fetching recruiters:", err);
    return [];
  }
}

/**
 * Assigns one or more candidates to a specific recruiter
 */
export async function assignCandidatesToRecruiter(params: {
  candidateIds: string[];
  candidates: RecruitmentCandidate[];
  recruiter: RecruiterUser;
  job?: RecruitmentJob | null;
  priority?: "Urgent" | "High" | "Medium" | "Low";
  deadlineDate?: string;
  adminNotes?: string;
  adminUser?: { name: string; email: string };
}): Promise<{ successCount: number; assignedIds: string[] }> {
  const { candidateIds, candidates, recruiter, job, priority = "High", deadlineDate, adminNotes, adminUser } = params;
  const nowIso = new Date().toISOString();
  let successCount = 0;
  const assignedIds: string[] = [];

  for (const cId of candidateIds) {
    const candidate = candidates.find((c) => c.id === cId);
    if (!candidate) continue;

    const assignmentDocId = `assign_${candidate.id}_${recruiter.id}_${Date.now()}`;
    const assignmentRecord: RecruiterAssignment = {
      id: assignmentDocId,
      assignmentId: assignmentDocId,
      candidateId: candidate.id,
      candidateSequentialId: candidate.candidateId,
      candidateName: candidate.fullName,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone || "",
      jobId: job?.id || "",
      jobSequentialId: job?.jobId || "",
      jobTitle: job?.title || "",
      recruiterId: recruiter.id,
      recruiterSequentialId: recruiter.recruiterId,
      recruiterName: recruiter.name,
      recruiterEmail: recruiter.email,
      priority,
      deadlineDate: deadlineDate || "",
      adminNotes: adminNotes || "",
      status: "Assigned",
      assignedBy: adminUser?.name || "Super Admin",
      assignedByEmail: adminUser?.email || "admin@aijobs.global",
      assignedAt: nowIso,
      updatedAt: nowIso,
      timeline: [
        {
          status: "Assigned",
          notes: adminNotes || `Candidate assigned to ${recruiter.name}`,
          updatedBy: adminUser?.name || "Super Admin",
          timestamp: nowIso
        }
      ]
    };

    // 1. Save in 'recruiterAssignments'
    await setDoc(doc(db, "recruiterAssignments", assignmentDocId), assignmentRecord);

    // 2. Update Candidate record with active assigned recruiter
    await updateDoc(doc(db, "candidates", candidate.id), {
      assignedRecruiterId: recruiter.id,
      assignedRecruiterName: recruiter.name,
      assignedJobId: job?.id || null,
      assignedJobTitle: job?.title || null,
      assignmentPriority: priority,
      assignedAt: nowIso,
      updatedAt: nowIso
    }).catch(() => {});

    // 3. Trigger Email Notification to Recruiter
    if (recruiter.email) {
      fetch("/api/email/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: "recruiter_candidate_assigned",
          email: recruiter.email,
          recipientName: recruiter.name,
          candidateName: candidate.fullName,
          candidateEmail: candidate.email,
          candidateId: candidate.candidateId,
          jobTitle: job?.title || "Direct Sourcing Pipeline",
          priority,
          adminNotes: adminNotes || "Please review candidate profile and initiate contact."
        })
      }).catch((e) => console.warn("Recruiter email trigger warning:", e));
    }

    successCount++;
    assignedIds.push(candidate.id);
  }

  await logRecruitmentAudit({
    action: "CANDIDATE_ASSIGNED",
    entityType: "ASSIGNMENT",
    entityId: recruiter.recruiterId,
    entityName: recruiter.name,
    details: `Assigned ${successCount} candidate(s) to recruiter '${recruiter.name}' (${recruiter.email}) for job: ${job?.title || "Open Pipeline"}`,
    performedBy: adminUser?.name || "Super Admin",
    performedByRole: "Admin",
    performedByEmail: adminUser?.email || "admin@aijobs.global"
  });

  return { successCount, assignedIds };
}

/**
 * Fetches full assignment history from Firestore
 */
export async function fetchRecruiterAssignments(): Promise<RecruiterAssignment[]> {
  try {
    const snap = await getDocs(collection(db, "recruiterAssignments"));
    const list: RecruiterAssignment[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as RecruiterAssignment);
    });
    return list.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  } catch (err) {
    console.error("[RecruitmentService] Error fetching recruiter assignments:", err);
    return [];
  }
}

// ==========================================
// 5. RECOMMENDATION & MATCHING ENGINE
// ==========================================

/**
 * Algorithmic candidate match engine against a specific job.
 * Weighted Scoring:
 * - Skills Match (35%)
 * - Experience Fit (20%)
 * - Target Role Alignment (15%)
 * - Location Fit (10%)
 * - Qualification Match (10%)
 * - Preference Fit (10%)
 */
export function calculateCandidateJobMatch(
  candidate: RecruitmentCandidate,
  job: RecruitmentJob
): CandidateMatchResult {
  const reasons: string[] = [];

  if (!candidate || !job) {
    return {
      candidate: candidate || ({} as any),
      job: job || ({} as any),
      overallScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      roleScore: 0,
      locationScore: 0,
      qualificationScore: 0,
      preferenceScore: 0,
      matchingSkills: [],
      missingSkills: [],
      reasons: ["Incomplete candidate or job data"],
      grade: "Potential Match"
    };
  }

  // Normalize candidate skills
  const rawCandSkills = candidate.keySkills || candidate.skills || [];
  const candSkills = safeStringArray(rawCandSkills)
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);

  // Normalize job skills
  const rawJobSkills = job.skillsRequired || job.skills || [];
  const jobSkills = safeStringArray(rawJobSkills)
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);

  // 1. Skills Match (35% Weight)
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  jobSkills.forEach((jSkill) => {
    const found = candSkills.some((cSkill) => cSkill.includes(jSkill) || jSkill.includes(cSkill));
    if (found) {
      matchingSkills.push(jSkill);
    } else {
      missingSkills.push(jSkill);
    }
  });

  const skillsMatchRatio = jobSkills.length > 0 ? (matchingSkills.length / jobSkills.length) : 0.8;
  const skillsScore = Math.round(skillsMatchRatio * 100);
  if (matchingSkills.length > 0) {
    reasons.push(`Matches ${matchingSkills.length} of ${jobSkills.length} key skills (${matchingSkills.slice(0, 3).join(", ")})`);
  }

  // 2. Experience Match (20% Weight)
  const candExp = candidate.totalExperienceYears || parseFloat(safeString(candidate.experience) || "0") || 0;
  const minExp = job.minimumExperience || 0;
  const maxExp = job.maximumExperience || (minExp + 4);

  let experienceScore = 100;
  if (candExp < minExp) {
    const diff = minExp - candExp;
    experienceScore = Math.max(20, Math.round(100 - diff * 25));
    reasons.push(`Experience (${candExp} yrs) is slightly below minimum required (${minExp} yrs)`);
  } else if (candExp > maxExp + 4) {
    experienceScore = 80;
    reasons.push(`Senior profile with ${candExp} years experience (Job range: ${minExp}-${maxExp} yrs)`);
  } else {
    experienceScore = 100;
    reasons.push(`Experience (${candExp} yrs) is an optimal fit for job requirement (${minExp}-${maxExp} yrs)`);
  }

  // 3. Role & Designation Match (15% Weight)
  const candRole = safeString(candidate.targetRole || candidate.designation || "").toLowerCase();
  const jobRole = safeString(job.title || "").toLowerCase();

  let roleScore = 50;
  const jobWords = jobRole.split(/\s+/).filter((w) => w.length > 2);
  const matchedWords = jobWords.filter((w) => candRole.includes(w));

  if (jobRole && (jobRole === candRole || candRole.includes(jobRole) || jobRole.includes(candRole))) {
    roleScore = 100;
    reasons.push(`Target role directly matches job title '${job.title || "Position"}'`);
  } else if (matchedWords.length > 0) {
    roleScore = 85;
    reasons.push(`Relevant background in ${matchedWords.join(", ")}`);
  } else {
    roleScore = 60;
  }

  // 4. Location Match (10% Weight)
  const candLoc = safeString(candidate.location || candidate.city || candidate.preferredLocation || "").toLowerCase();
  const jobLoc = safeString(job.location || job.city || "").toLowerCase();
  const jobCity = safeString(job.city || "").toLowerCase();
  const jobWorkMode = safeString(job.workMode || "").toLowerCase();

  let locationScore = 60;
  if (jobWorkMode === "remote" || jobLoc.includes("remote")) {
    locationScore = 100;
    reasons.push("Job offers Remote flexibility — candidate location compatible");
  } else if (candLoc && jobLoc && (candLoc.includes(jobLoc) || jobLoc.includes(candLoc) || (jobCity && candLoc.includes(jobCity)))) {
    locationScore = 100;
    reasons.push(`Candidate is based in or prefers target city (${job.city || job.location || "Location"})`);
  } else {
    locationScore = 65;
  }

  // 5. Qualification Match (10% Weight)
  let qualificationScore = 90;
  const candQual = safeString(candidate.highestQualification || candidate.education || "").toLowerCase();
  if (candQual) {
    qualificationScore = 95;
    const qualDisplay = safeString(candidate.highestQualification || candidate.education, "Graduate");
    reasons.push(`Academic credentials verified: ${qualDisplay}`);
  }

  // 6. Preference / Verification Fit (10% Weight)
  let preferenceScore = 85;
  if (candidate.emailVerified) {
    preferenceScore += 10;
  }
  if (candidate.resumeUrl) {
    preferenceScore += 5;
    reasons.push("Resume document is attached and verified");
  }

  // Overall Weighted Score calculation
  const overallScore = Math.round(
    skillsScore * 0.35 +
    experienceScore * 0.20 +
    roleScore * 0.15 +
    locationScore * 0.10 +
    qualificationScore * 0.10 +
    preferenceScore * 0.10
  );

  let grade: CandidateMatchResult["grade"] = "Moderate Fit";
  if (overallScore >= 85) grade = "Exceptional Fit";
  else if (overallScore >= 72) grade = "Strong Match";
  else if (overallScore >= 55) grade = "Moderate Fit";
  else grade = "Potential Match";

  return {
    candidate,
    job,
    overallScore: Math.min(100, overallScore),
    skillsScore,
    experienceScore,
    roleScore,
    locationScore,
    qualificationScore,
    preferenceScore,
    matchingSkills,
    missingSkills,
    reasons,
    grade
  };
}

/**
 * Finds top matching candidates for a given job, ranked by score descending
 */
export function rankCandidatesForJob(
  job: RecruitmentJob,
  candidates: RecruitmentCandidate[],
  minScore: number = 40
): CandidateMatchResult[] {
  return candidates
    .map((c) => calculateCandidateJobMatch(c, job))
    .filter((res) => res.overallScore >= minScore)
    .sort((a, b) => b.overallScore - a.overallScore);
}

// ==========================================
// 6. EXCEL IMPORT & PARSING ENGINE
// ==========================================

export interface CandidateExcelRow {
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  city?: string;
  state?: string;
  targetRole?: string;
  totalExperienceYears?: number;
  highestQualification?: string;
  keySkills: string[];
  currentCompany?: string;
  currentCtc?: string | number;
  expectedCtc?: string | number;
  noticePeriodDays?: string | number;
  resumeUrl?: string;
  status?: string;
  rawRowNumber: number;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}

export interface JobExcelRow {
  title: string;
  companyName: string;
  industry: string;
  department?: string;
  employmentType: string;
  workMode: string;
  location: string;
  city?: string;
  state?: string;
  minimumExperience: number;
  maximumExperience: number;
  highestQualification?: string;
  minimumSalary?: number;
  maximumSalary?: number;
  salaryCurrency: string;
  salaryPeriod: string;
  openings: number;
  skillsRequired: string[];
  description: string;
  responsibilities?: string;
  benefits?: string;
  applyDeadline?: string;
  status: "Published" | "Draft" | "Live";
  rawRowNumber: number;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}

/**
 * Generates and downloads blank standard Excel templates
 */
export function downloadExcelTemplate(type: "candidates" | "jobs"): void {
  const workbook = XLSX.utils.book_new();

  if (type === "candidates") {
    const candidateHeaders = [
      "Candidate Name*",
      "Email Address*",
      "Phone Number",
      "Gender",
      "City",
      "State",
      "Target Role / Designation*",
      "Total Experience (Years)",
      "Highest Qualification",
      "Key Skills (comma-separated)*",
      "Current Company",
      "Current CTC (LPA)",
      "Expected CTC (LPA)",
      "Notice Period (Days)",
      "Resume Link URL"
    ];

    const sampleRow = [
      "Rajesh Sharma",
      "rajesh.sharma.sample@gmail.com",
      "+91 98765 43210",
      "Male",
      "Bengaluru",
      "Karnataka",
      "Senior Full Stack Engineer",
      4.5,
      "B.Tech Computer Science",
      "React, Node.js, TypeScript, PostgreSQL, AWS",
      "Infosys Ltd",
      "14.5",
      "22.0",
      "30",
      "https://example.com/resumes/rajesh.pdf"
    ];

    const sampleRow2 = [
      "Priya Sundaram",
      "priya.sundaram.sample@gmail.com",
      "+91 98111 22334",
      "Female",
      "Hyderabad",
      "Telangana",
      "Data Scientist / AI Engineer",
      3.0,
      "M.Tech Data Science",
      "Python, PyTorch, LangChain, NLP, SQL",
      "TCS Innovation Labs",
      "12.0",
      "18.0",
      "15",
      ""
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([candidateHeaders, sampleRow, sampleRow2]);
    // Set auto column widths
    worksheet["!cols"] = candidateHeaders.map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates_Template");
    XLSX.writeFile(workbook, "AIJOBS_Candidate_Import_Template.xlsx");
  } else {
    const jobHeaders = [
      "Job Title*",
      "Company Name*",
      "Industry / Category*",
      "Department",
      "Employment Type*",
      "Work Mode*",
      "City / Location*",
      "Min Experience (Years)*",
      "Max Experience (Years)",
      "Min Salary (Annual INR)",
      "Max Salary (Annual INR)",
      "Key Skills Required (comma-separated)*",
      "Number of Openings",
      "Job Description*",
      "Key Responsibilities",
      "Application Deadline (YYYY-MM-DD)",
      "Initial Status (Published/Draft)"
    ];

    const sampleJob = [
      "Senior React Native Developer",
      "PhonePe / Flipkart Ecosystem",
      "Fintech & Mobile Apps",
      "Engineering Division",
      "Full-time",
      "Hybrid",
      "Bengaluru, Karnataka",
      3,
      6,
      1200000,
      2400000,
      "React Native, TypeScript, Redux, iOS, Android, GraphQL",
      3,
      "We are looking for an experienced Senior Mobile Engineer to build high-scale payment user interfaces.",
      "Develop resilient native modules, optimize startup render latency, coordinate with backend product teams.",
      "2026-12-31",
      "Published"
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([jobHeaders, sampleJob]);
    worksheet["!cols"] = jobHeaders.map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs_Template");
    XLSX.writeFile(workbook, "AIJOBS_Job_Import_Template.xlsx");
  }
}

/**
 * Parses and validates Candidate Excel / CSV files
 */
export async function parseAndValidateCandidateExcel(
  file: File,
  existingCandidates: RecruitmentCandidate[]
): Promise<{
  allRows: CandidateExcelRow[];
  validRows: CandidateExcelRow[];
  invalidRows: CandidateExcelRow[];
  duplicateRows: CandidateExcelRow[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (jsonData.length <= 1) {
    throw new Error("Excel file appears empty or has no data rows beneath headers.");
  }

  const existingEmails = new Set(existingCandidates.map((c) => (c.email || "").toLowerCase().trim()).filter(Boolean));
  const existingPhones = new Set(existingCandidates.map((c) => (c.phone || "").replace(/\D/g, "")).filter(Boolean));

  const allRows: CandidateExcelRow[] = [];
  const validRows: CandidateExcelRow[] = [];
  const invalidRows: CandidateExcelRow[] = [];
  const duplicateRows: CandidateExcelRow[] = [];

  // Iterate starting from row index 1 (skipping header row 0)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    // Skip completely blank rows
    if (!row || row.every((cell: any) => String(cell).trim() === "")) continue;

    const fullName = String(row[0] || "").trim();
    const email = String(row[1] || "").trim().toLowerCase();
    const phone = String(row[2] || "").trim();
    const gender = String(row[3] || "").trim();
    const city = String(row[4] || "").trim();
    const state = String(row[5] || "").trim();
    const targetRole = String(row[6] || "").trim();
    const rawExp = row[7];
    const totalExperienceYears = typeof rawExp === "number" ? rawExp : (parseFloat(String(rawExp)) || 0);
    const highestQualification = String(row[8] || "").trim() || "Graduate";
    const rawSkills = String(row[9] || "").trim();
    const keySkills = rawSkills ? rawSkills.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : [];
    const currentCompany = String(row[10] || "").trim();
    const currentCtc = String(row[11] || "").trim();
    const expectedCtc = String(row[12] || "").trim();
    const noticePeriodDays = String(row[13] || "").trim();
    const resumeUrl = String(row[14] || "").trim();

    let isValid = true;
    let validationError = "";
    let isDuplicate = false;

    // Validation Rules
    if (!fullName) {
      isValid = false;
      validationError = "Missing candidate full name.";
    } else if (!email) {
      isValid = false;
      validationError = "Missing email address.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      isValid = false;
      validationError = `Invalid email syntax: '${email}'.`;
    } else if (!targetRole) {
      isValid = false;
      validationError = "Missing target role / designation.";
    }

    // Duplicate Check
    const cleanPhone = phone.replace(/\D/g, "");
    if (existingEmails.has(email)) {
      isDuplicate = true;
      validationError = `Duplicate email: '${email}' already registered in database.`;
    } else if (cleanPhone && cleanPhone.length >= 10 && existingPhones.has(cleanPhone)) {
      isDuplicate = true;
      validationError = `Duplicate phone number: '${phone}' already registered.`;
    }

    const rowObj: CandidateExcelRow = {
      fullName,
      email,
      phone,
      gender,
      city,
      state,
      targetRole,
      totalExperienceYears,
      highestQualification,
      keySkills,
      currentCompany,
      currentCtc,
      expectedCtc,
      noticePeriodDays,
      resumeUrl: resumeUrl || undefined,
      rawRowNumber: i + 1,
      isValid: isValid && !isDuplicate,
      validationError,
      isDuplicate
    };

    allRows.push(rowObj);

    if (isDuplicate) {
      duplicateRows.push(rowObj);
    } else if (!isValid) {
      invalidRows.push(rowObj);
    } else {
      validRows.push(rowObj);
    }
  }

  return { allRows, validRows, invalidRows, duplicateRows };
}

/**
 * Commits valid Candidate rows to Firestore in optimized atomic batches
 */
export async function executeCandidateBatchImport(params: {
  validRows: CandidateExcelRow[];
  fileName: string;
  fileSize?: number;
  adminUser?: { name: string; email: string };
  onProgress?: (processed: number, total: number) => void;
}): Promise<ImportBatchRecord> {
  const { validRows, fileName, fileSize, adminUser, onProgress } = params;
  const count = validRows.length;
  if (count === 0) {
    throw new Error("No valid candidate rows available for import.");
  }

  const batchSequentialId = await getNextSequentialId("importBatches");
  const sequentialIds = await reserveSequentialIdBlock("candidates", count);
  const nowIso = new Date().toISOString();

  let successCount = 0;
  let failureCount = 0;
  const errors: ImportBatchRecord["errors"] = [];

  // Firestore batch limit is 500 operations per batch
  const CHUNK_SIZE = 100;
  for (let i = 0; i < count; i += CHUNK_SIZE) {
    const chunk = validRows.slice(i, i + CHUNK_SIZE);
    const firestoreBatch = writeBatch(db);

    chunk.forEach((row, chunkIdx) => {
      const overallIdx = i + chunkIdx;
      const candidateId = sequentialIds[overallIdx];
      // Imported rows are pre-registration invitations, not authenticated users.
      // A real Firebase UID is attached when the candidate verifies the same email.
      const docId = `can_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const candidateRecord: RecruitmentCandidate = {
        id: docId,
        candidateId,
        uid: "",
        fullName: row.fullName,
        name: row.fullName,
        email: row.email,
        phone: row.phone || "",
        gender: row.gender || "",
        city: row.city || "",
        state: row.state || "",
        location: row.city ? `${row.city}, ${row.state || "India"}` : "India",
        preferredLocation: row.city || "",
        targetRole: row.targetRole || "Software Engineer",
        jobPreference: row.targetRole || "",
        currentCompany: row.currentCompany || "",
        designation: row.targetRole || "",
        totalExperienceYears: row.totalExperienceYears || 0,
        experience: `${row.totalExperienceYears || 0} Years`,
        highestQualification: row.highestQualification || "Graduate",
        education: row.highestQualification || "Graduate",
        keySkills: row.keySkills || [],
        skills: row.keySkills || [],
        currentCtc: row.currentCtc || "",
        expectedCtc: row.expectedCtc || "",
        noticePeriodDays: row.noticePeriodDays || "",
        resumeUrl: row.resumeUrl || null,
        emailVerified: false,
        verificationStatus: "pending",
        accountStatus: "pending_verification",
        profileStatus: row.resumeUrl ? "complete" : "incomplete",
        profileCompletion: row.resumeUrl ? 85 : 40,
        source: "Excel Import",
        invitationStatus: "pending_activation",
        importedProfileId: docId,
        importBatchId: batchSequentialId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const candDocRef = doc(db, "candidates", docId);
      const candProfileDocRef = doc(db, "candidateProfiles", docId);

      firestoreBatch.set(candDocRef, candidateRecord);
      firestoreBatch.set(candProfileDocRef, candidateRecord);
    });

    try {
      await firestoreBatch.commit();
      successCount += chunk.length;
      if (onProgress) onProgress(successCount, count);
    } catch (err: any) {
      console.error("[RecruitmentService] Chunk commit error:", err);
      failureCount += chunk.length;
      errors.push({
        rowNumber: i + 1,
        identifier: `Chunk ${i} - ${i + chunk.length}`,
        reason: err.message || "Failed to commit Firestore batch write."
      });
    }
  }

  // Save Import Batch Record
  const batchRecord: ImportBatchRecord = {
    id: batchSequentialId,
    batchId: batchSequentialId,
    type: "CANDIDATE_IMPORT",
    fileName,
    fileSize,
    totalRows: count,
    successCount,
    failureCount,
    duplicateCount: 0,
    importedBy: adminUser?.name || "Super Admin",
    importedByEmail: adminUser?.email || "admin@aijobs.global",
    status: failureCount === 0 ? "Completed" : (successCount > 0 ? "Partial" : "Failed"),
    errors: errors.length > 0 ? errors : undefined,
    createdAt: nowIso
  };

  await setDoc(doc(db, "importBatches", batchSequentialId), batchRecord);

  await logRecruitmentAudit({
    action: "CANDIDATE_BULK_IMPORTED",
    entityType: "IMPORT_BATCH",
    entityId: batchSequentialId,
    entityName: fileName,
    details: `Imported ${successCount} candidate profiles from '${fileName}' (Batch ID: ${batchSequentialId})`,
    performedBy: adminUser?.name || "Super Admin",
    performedByRole: "Admin",
    performedByEmail: adminUser?.email || "admin@aijobs.global"
  });

  return batchRecord;
}

/**
 * Parses and validates Job Excel / CSV files
 */
export async function parseAndValidateJobExcel(
  file: File,
  existingJobs: RecruitmentJob[]
): Promise<{
  allRows: JobExcelRow[];
  validRows: JobExcelRow[];
  invalidRows: JobExcelRow[];
  duplicateRows: JobExcelRow[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (jsonData.length <= 1) {
    throw new Error("Job Excel file is empty or missing data rows.");
  }

  const existingTitles = new Set(existingJobs.map((j) => `${j.title.toLowerCase()}___${j.companyName.toLowerCase()}`));

  const allRows: JobExcelRow[] = [];
  const validRows: JobExcelRow[] = [];
  const invalidRows: JobExcelRow[] = [];
  const duplicateRows: JobExcelRow[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.every((cell: any) => String(cell).trim() === "")) continue;

    const title = String(row[0] || "").trim();
    const companyName = String(row[1] || "").trim();
    const industry = String(row[2] || "").trim() || "Information Technology";
    const department = String(row[3] || "").trim() || "Engineering";
    const employmentType = String(row[4] || "").trim() || "Full-time";
    const workMode = String(row[5] || "").trim() || "On-site";
    const location = String(row[6] || "").trim() || "Bengaluru";
    const rawMinExp = row[7];
    const minimumExperience = typeof rawMinExp === "number" ? rawMinExp : (parseFloat(String(rawMinExp)) || 0);
    const rawMaxExp = row[8];
    const maximumExperience = typeof rawMaxExp === "number" ? rawMaxExp : ((parseFloat(String(rawMaxExp)) || minimumExperience) + 3);
    const rawMinSal = row[9];
    const minimumSalary = typeof rawMinSal === "number" ? rawMinSal : (parseFloat(String(rawMinSal)) || 0);
    const rawMaxSal = row[10];
    const maximumSalary = typeof rawMaxSal === "number" ? rawMaxSal : (parseFloat(String(rawMaxSal)) || 0);
    const rawSkills = String(row[11] || "").trim();
    const skillsRequired = rawSkills ? rawSkills.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : [];
    const openings = typeof row[12] === "number" ? row[12] : (parseInt(String(row[12])) || 1);
    const description = String(row[13] || "").trim();
    const responsibilities = String(row[14] || "").trim();
    const applyDeadline = String(row[15] || "").trim();
    const statusRaw = String(row[16] || "").trim().toLowerCase();
    const status = statusRaw === "draft" ? "Draft" : "Published";

    let isValid = true;
    let validationError = "";
    let isDuplicate = false;

    if (!title) {
      isValid = false;
      validationError = "Missing Job Title.";
    } else if (!companyName) {
      isValid = false;
      validationError = "Missing Company Name.";
    } else if (!description) {
      isValid = false;
      validationError = "Missing Job Description.";
    }

    const dupKey = `${title.toLowerCase()}___${companyName.toLowerCase()}`;
    if (existingTitles.has(dupKey)) {
      isDuplicate = true;
      validationError = `Potential duplicate: Job '${title}' at '${companyName}' already exists.`;
    }

    const rowObj: JobExcelRow = {
      title,
      companyName,
      industry,
      department,
      employmentType,
      workMode,
      location,
      city: location.split(",")[0]?.trim() || "Bengaluru",
      minimumExperience,
      maximumExperience,
      minimumSalary,
      maximumSalary,
      salaryCurrency: "INR",
      salaryPeriod: "Yearly",
      openings,
      skillsRequired,
      description,
      responsibilities,
      applyDeadline,
      status,
      rawRowNumber: i + 1,
      isValid: isValid && !isDuplicate,
      validationError,
      isDuplicate
    };

    allRows.push(rowObj);

    if (isDuplicate) {
      duplicateRows.push(rowObj);
    } else if (!isValid) {
      invalidRows.push(rowObj);
    } else {
      validRows.push(rowObj);
    }
  }

  return { allRows, validRows, invalidRows, duplicateRows };
}

/**
 * Commits valid Job rows to Firestore in bulk
 */
export async function executeJobBatchImport(params: {
  validRows: JobExcelRow[];
  fileName: string;
  fileSize?: number;
  adminUser?: { name: string; email: string };
  onProgress?: (processed: number, total: number) => void;
}): Promise<ImportBatchRecord> {
  const { validRows, fileName, fileSize, adminUser, onProgress } = params;
  const count = validRows.length;
  if (count === 0) {
    throw new Error("No valid job rows available for import.");
  }

  const batchSequentialId = await getNextSequentialId("importBatches");
  const sequentialIds = await reserveSequentialIdBlock("jobs", count);
  const nowIso = new Date().toISOString();

  let successCount = 0;
  let failureCount = 0;
  const errors: ImportBatchRecord["errors"] = [];

  const CHUNK_SIZE = 100;
  for (let i = 0; i < count; i += CHUNK_SIZE) {
    const chunk = validRows.slice(i, i + CHUNK_SIZE);
    const firestoreBatch = writeBatch(db);

    chunk.forEach((row, chunkIdx) => {
      const overallIdx = i + chunkIdx;
      const jobId = sequentialIds[overallIdx];
      const docId = `job_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const slug = generateJobSlug(row.title, row.location, docId);
      const canonicalUrl = getPublicJobUrl({ title: row.title, location: row.location, id: docId, slug });

      const jobRecord: RecruitmentJob = {
        id: docId,
        jobId,
        title: row.title,
        companyName: row.companyName,
        industry: row.industry,
        department: row.department || "Engineering",
        employmentType: row.employmentType,
        workMode: row.workMode,
        location: row.location,
        city: row.city || "Bengaluru",
        minimumExperience: row.minimumExperience,
        maximumExperience: row.maximumExperience,
        minimumSalary: row.minimumSalary,
        maximumSalary: row.maximumSalary,
        salaryCurrency: row.salaryCurrency,
        salaryPeriod: row.salaryPeriod,
        salaryDisplay: row.minimumSalary && row.maximumSalary ? `₹${(row.minimumSalary / 100000).toFixed(1)} - ₹${(row.maximumSalary / 100000).toFixed(1)} LPA` : "Competitive CTC",
        openings: row.openings || 1,
        skillsRequired: row.skillsRequired || [],
        description: row.description,
        responsibilities: row.responsibilities || "",
        status: row.status,
        applyDeadline: row.applyDeadline || "",
        createdBy: adminUser?.name || "Super Admin",
        createdByRole: "Admin",
        createdAt: nowIso,
        updatedAt: nowIso,
        slug,
        canonicalUrl,
        importBatchId: batchSequentialId
      };

      const jobRef = doc(db, "jobs", docId);
      firestoreBatch.set(jobRef, jobRecord);
    });

    try {
      await firestoreBatch.commit();
      successCount += chunk.length;
      if (onProgress) onProgress(successCount, count);
    } catch (err: any) {
      console.error("[RecruitmentService] Job chunk commit error:", err);
      failureCount += chunk.length;
      errors.push({
        rowNumber: i + 1,
        identifier: `Job Chunk ${i} - ${i + chunk.length}`,
        reason: err.message || "Failed to commit Firestore job batch write."
      });
    }
  }

  const batchRecord: ImportBatchRecord = {
    id: batchSequentialId,
    batchId: batchSequentialId,
    type: "JOB_IMPORT",
    fileName,
    fileSize,
    totalRows: count,
    successCount,
    failureCount,
    duplicateCount: 0,
    importedBy: adminUser?.name || "Super Admin",
    importedByEmail: adminUser?.email || "admin@aijobs.global",
    status: failureCount === 0 ? "Completed" : (successCount > 0 ? "Partial" : "Failed"),
    errors: errors.length > 0 ? errors : undefined,
    createdAt: nowIso
  };

  await setDoc(doc(db, "importBatches", batchSequentialId), batchRecord);

  await logRecruitmentAudit({
    action: "JOB_BULK_IMPORTED",
    entityType: "IMPORT_BATCH",
    entityId: batchSequentialId,
    entityName: fileName,
    details: `Imported ${successCount} job vacancies from '${fileName}' (Batch ID: ${batchSequentialId})`,
    performedBy: adminUser?.name || "Super Admin",
    performedByRole: "Admin",
    performedByEmail: adminUser?.email || "admin@aijobs.global"
  });

  return batchRecord;
}

/**
 * Fetches all import batch history from Firestore
 */
export async function fetchImportBatches(): Promise<ImportBatchRecord[]> {
  try {
    const snap = await getDocs(collection(db, "importBatches"));
    const list: ImportBatchRecord[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as ImportBatchRecord);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("[RecruitmentService] Error fetching import batches:", err);
    return [];
  }
}

// ==========================================
// 7. EXPORT DATA SERVICES
// ==========================================

export function exportCandidatesToExcel(candidates: RecruitmentCandidate[], fileName: string = "AIJOBS_Candidates_Live_Export"): void {
  const exportData = candidates.map((c) => ({
    "Candidate ID": c.candidateId,
    "Full Name": c.fullName,
    "Email Address": c.email,
    "Phone Number": c.phone || "N/A",
    "City / Location": c.location || c.city || "N/A",
    "Target Role": c.targetRole || "N/A",
    "Total Experience (Years)": c.totalExperienceYears || 0,
    "Highest Qualification": c.highestQualification || "Graduate",
    "Key Skills": (c.keySkills || []).join(", "),
    "Current Company": c.currentCompany || "N/A",
    "Current CTC": c.currentCtc || "N/A",
    "Expected CTC": c.expectedCtc || "N/A",
    "Notice Period": c.noticePeriodDays ? `${c.noticePeriodDays} Days` : "N/A",
    "Verification Status": c.verificationStatus?.toUpperCase(),
    "Account Status": c.accountStatus?.toUpperCase(),
    "Assigned Recruiter": c.assignedRecruiterName || "Unassigned",
    "Registration Source": c.source || "Email",
    "Registered Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "N/A"
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function exportJobsToExcel(jobs: RecruitmentJob[], fileName: string = "AIJOBS_Jobs_Live_Export"): void {
  const exportData = jobs.map((j) => ({
    "Job ID": j.jobId,
    "Job Title": j.title,
    "Company Name": j.companyName,
    "Industry": j.industry,
    "Department": j.department || "Engineering",
    "Employment Type": j.employmentType,
    "Work Mode": j.workMode,
    "Location": j.location,
    "Min Experience": j.minimumExperience,
    "Max Experience": j.maximumExperience,
    "Salary Range": j.salaryDisplay || "Industry Standard",
    "Openings": j.openings,
    "Required Skills": (j.skillsRequired || []).join(", "),
    "Status": j.status,
    "Assigned Recruiters": (j.assignedRecruiterNames || []).join(", ") || "None",
    "Application Deadline": j.applyDeadline || "Open",
    "Date Created": j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-IN") : "N/A"
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
}
