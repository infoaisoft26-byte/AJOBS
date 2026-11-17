import { collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";
import { JobPosting, JobApplication } from "../types";
import { NotificationService } from "./notificationService";
import { trackJobApplicationSubmitted } from "../utils/analytics";

export interface ApplyResult {
  success: boolean;
  message: string;
  applicationId?: string;
}

export type ApplicationPipelineStatus = 
  | "applied" 
  | "under_review" 
  | "shortlisted" 
  | "interview" 
  | "selected" 
  | "offer" 
  | "joined" 
  | "rejected";

/**
 * Applies a candidate to a job, verifying authentication and profile status first,
 * creating the necessary Firestore application and lead documents, updating statistics, 
 * and dispatching in-app alerts to both candidate and recruiter/employer.
 */
export async function applyToJob(
  job: JobPosting,
  userId: string,
  profile: any,
  resumeText?: string
): Promise<ApplyResult> {
  // 1. Verify User Authentication
  if (!userId || !auth.currentUser) {
    return {
      success: false,
      message: "Authentication is required. Please sign in or register to apply for jobs."
    };
  }

  // 2. Check candidate role & basic profile info
  let candidateName = profile?.name || profile?.fullName || auth.currentUser.displayName || "Candidate";
  let candidateEmail = auth.currentUser.email || profile?.email || "";
  let candidatePhone =
    profile?.phone ||
    profile?.phoneNumber ||
    profile?.mobileNumber ||
    profile?.mobile ||
    profile?.personalDetails?.mobile ||
    profile?.profileDetails?.mobileNumber ||
    profile?.profileDetails?.phone ||
    "";
  let candidateLocation = profile?.location || profile?.city || profile?.personalDetails?.city || "";
  let candidateExperience = profile?.experience || profile?.yearsOfExperience || profile?.employmentDetails?.designation || "";
  let candidateSkills = Array.isArray(profile?.skills || profile?.skillsRequired) ? (profile?.skills || profile?.skillsRequired) : [];
  let resumeUrl = profile?.resumeUrl || profile?.resumeURL || null;

  try {
    // Resolve contact/profile fields from all canonical candidate records. This prevents
    // stale component state from saving an empty or incorrect phone number.
    const profileDocs = await Promise.all([
      getDoc(doc(db, "users", userId)),
      getDoc(doc(db, "candidates", userId)),
      getDoc(doc(db, "candidateProfiles", userId)),
      getDoc(doc(db, "candidate_profiles", userId))
    ]);
    const records = profileDocs.filter(s => s.exists()).map(s => s.data());
    const pick = (...values: any[]) => values.find(v => typeof v === "string" && v.trim())?.trim() || "";
    for (const data of records) {
      candidateName = pick(candidateName, data.name, data.fullName, data.displayName) || "Candidate";
      candidateEmail = pick(candidateEmail, data.email, data.contactEmail);
      candidatePhone = pick(candidatePhone, data.phone, data.mobile, data.mobileNumber, data.phoneNumber, data.personalDetails?.mobile, data.profileDetails?.mobileNumber);
      candidateLocation = pick(candidateLocation, data.location, data.city, data.currentLocation, data.profileDetails?.currentLocation, data.personalDetails?.city);
      candidateExperience = pick(candidateExperience, data.experience, data.yearsOfExperience, data.employmentDetails?.designation);
      if (!candidateSkills.length && Array.isArray(data.skills)) candidateSkills = data.skills.filter((s: any) => typeof s === "string");
      resumeUrl = resumeUrl || data.resumeUrl || data.resumeURL || null;
    }
    // 3. Prevent duplicate applications (Section M)
    const applicationsRef = collection(db, "applications");
    const q = query(
      applicationsRef,
      where("jobId", "==", job.id),
      where("candidateId", "==", userId)
    );
    const existingApps = await getDocs(q);
    if (!existingApps.empty) {
      return {
        success: false,
        message: `You have already applied for the position of "${job.title}" at ${job.companyName}.`
      };
    }

    // Generate ID for application
    const appId = `app_${Math.random().toString(36).substring(2, 11)}`;
    const nowIso = new Date().toISOString();

    // Standardized single source of truth Application Document
    const newApp = {
      id: appId,
      candidateId: userId,
      userId: userId,
      candidateName: candidateName,
      candidateEmail: candidateEmail,
      candidatePhone: candidatePhone,
      candidateLocation: candidateLocation,
      candidateExperience: candidateExperience,
      candidateSkills: candidateSkills,
      jobId: job.id,
      jobTitle: job.title,
      companyName: job.companyName,
      recruiterId: (job as any).assignedRecruiterId || job.recruiterId || null,
      employerId: job.employerId || job.companyId || job.ownerUid || job.createdBy || null,
      ownerUid: job.ownerUid || job.createdBy || job.postedBy || job.employerId || job.companyId || null,
      jobOwnerUid: job.ownerUid || job.createdBy || job.postedBy || job.employerId || job.companyId || null,
      companyId: job.companyId || job.employerId || null,
      consultancyId: (job as any).consultancyId || ((job as any).consultancyUserId) || null,
      consultancyName: (job as any).consultancyName || (job as any).consultancy || null,
      assignedRecruiterId: (job as any).assignedRecruiterId || null,
      assignedRecruiterName: (job as any).assignedRecruiterName || null,
      assignedAt: null,
      assignedBy: null,
      resumeUrl: resumeUrl,
      status: "applied",
      source: "AIJobs",
      appliedAt: nowIso,
      updatedAt: nowIso,
      resumeScore: Number(profile?.resumeScore || 0)
    };

    // Application document in company-specific collection for backwards compatibility
    const newCompanyApp = {
      id: appId,
      jobId: job.id,
      jobTitle: job.title,
      candidateId: userId,
      userId,
      candidateName: candidateName,
      candidateEmail: candidateEmail,
      candidatePhone: candidatePhone,
      candidateLocation,
      candidateExperience,
      candidateSkills,
      companyId: job.companyId || job.employerId || null,
      companyName: job.companyName,
      recruiterId: (job as any).assignedRecruiterId || job.recruiterId || job.createdBy || job.ownerUid || null,
      employerId: job.employerId || job.companyId || job.ownerUid || job.createdBy || null,
      ownerUid: job.ownerUid || job.createdBy || job.postedBy || job.employerId || job.companyId || null,
      jobOwnerUid: job.ownerUid || job.createdBy || job.postedBy || job.employerId || job.companyId || null,
      assignedRecruiterId: (job as any).assignedRecruiterId || null,
      assignedRecruiterName: (job as any).assignedRecruiterName || null,
      consultancyId: (job as any).consultancyId || (job as any).consultancyUserId || null,
      consultancyName: (job as any).consultancyName || (job as any).consultancy || null,
      resumeUrl: resumeUrl || null,
      resumeScore: Number(profile?.resumeScore || 0),
      interviewScore: profile?.aiInterviewScore || 0,
      status: "applied",
      appliedAt: nowIso
    };

    // Lead document for CRM pipeline
    const leadId = `lead_${Math.random().toString(36).substring(2, 11)}`;
    const newLead = {
      id: leadId,
      candidateId: userId,
      candidateName: candidateName,
      email: candidateEmail,
      phone: candidatePhone || "Not Provided",
      resume: resumeUrl || "No Resume Attached",
      jobId: job.id,
      jobTitle: job.title,
      company: job.companyName,
      recruiter: (job as any).assignedRecruiterId || job.recruiterId || "",
      consultancyId: (job as any).consultancyId || (job as any).consultancyUserId || null,
      consultancy: (job as any).consultancyName || job.consultancy || "Direct",
      currentStatus: "applied",
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Atomically publish the same application to candidate, hiring workspace and CRM.
    // There is no admin forwarding/approval gate for candidate applications.
    const applicationBatch = writeBatch(db);
    applicationBatch.set(doc(db, "applications", appId), newApp);
    applicationBatch.set(doc(db, "company_applications", appId), newCompanyApp);
    applicationBatch.set(doc(db, "leads", leadId), newLead);
    await applicationBatch.commit();

    // Update job application counts in standard jobs collection safely
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        applicationCount: increment(1),
        applicantsCount: increment(1),
        updatedAt: nowIso
      });
    } catch (e) {
      console.debug("Non-fatal job metric update notice:", e);
    }

    // Update job application counts in company-specific jobs collection safely
    try {
      await updateDoc(doc(db, "company_jobs", job.id), {
        applicationCount: increment(1),
        applicantsCount: increment(1),
        updatedAt: nowIso
      });
    } catch (e) {
      // Non-blocking
    }

    // Trigger GA4 Telemetry
    trackJobApplicationSubmitted(job.id, job.title, job.companyName);

    // 4. Trigger realtime notifications for every responsible workspace.
    const consultancyId = (job as any).consultancyId || (job as any).consultancyUserId || "";
    try {
      const workspaceRecipients = Array.from(new Set([newApp.recruiterId, newApp.employerId, newApp.ownerUid, consultancyId].filter(Boolean)));
      await Promise.all(workspaceRecipients.map(recipientId => NotificationService.triggerEvent({
          userId: recipientId,
          event: "NEW_APPLICATION",
          title: "New Candidate Application",
          message: `${candidateName} applied for "${job.title}" at ${job.companyName}. Contact: ${candidatePhone || "not provided"}.`,
          type: "success",
          link: `/applications?jobId=${job.id}&applicationId=${appId}`
      })));

      // Send a branded administration email to the owning consultancy once per application.
      if (consultancyId) {
        const [consultancySnap, consultancyUserSnap] = await Promise.all([
          getDoc(doc(db, "consultancies", consultancyId)),
          getDoc(doc(db, "users", consultancyId))
        ]);
        const consultancyData = consultancySnap.exists() ? consultancySnap.data() : {};
        const consultancyUser = consultancyUserSnap.exists() ? consultancyUserSnap.data() : {};
        const consultancyEmail = consultancyData.email || consultancyData.officialEmail || consultancyUser.email || "";
        const consultancyName = consultancyData.agencyName || consultancyData.companyName || consultancyUser.name || (job as any).consultancyName || "Consultancy Partner";
        if (consultancyEmail) {
          await fetch("/api/email/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              triggerType: "consultancy_application_received",
              email: consultancyEmail,
              recipientName: consultancyName,
              recipientRole: "consultancy",
              userId: consultancyId,
              data: { candidateName, candidatePhone, jobTitle: job.title, companyName: job.companyName, applicationId: appId }
            })
          }).catch(error => console.warn("Consultancy application email warning:", error));
        }
      }

      await NotificationService.triggerEvent({
        userId: userId,
        event: "APPLICATION_SUBMITTED",
        title: "Application Submitted Successfully",
        message: `Your application for "${job.title}" at ${job.companyName} has been submitted.`,
        type: "info",
        recipientEmail: candidateEmail,
        templateName: "Application Confirmation",
        templateVars: {
          userName: candidateName,
          jobTitle: job.title,
          companyName: job.companyName,
          resumeScore: String(profile?.resumeScore || 0)
        },
        link: `/candidate/applications`
      });
    } catch (notifErr) {
      console.warn("Notification triggers failed on application submit:", notifErr);
    }

    return {
      success: true,
      message: `Application submitted successfully for "${job.title}" at ${job.companyName}.`,
      applicationId: appId
    };
  } catch (error: any) {
    console.error("Error in applyToJob service:", error);
    return {
      success: false,
      message: `Failed to submit application: ${error.message || error}`
    };
  }
}

/**
 * Standard status update function for candidate application lifecycle:
 * Allowed statuses: applied, under_review, shortlisted, interview, selected, offer, joined, rejected
 * Dispatches realtime in-app notification & transactional email to candidate.
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationPipelineStatus,
  options?: {
    remarks?: string;
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    interviewData?: any;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Status changes must pass through the authenticated server route so the
    // server can verify the employer/recruiter owns the job before writing.
    const currentUser = auth.currentUser;
    if (!currentUser) return { success: false, message: "Please sign in again." };
    const token = await currentUser.getIdToken();
    const response = await fetch(
      `/api/hire/workspace/applications/${encodeURIComponent(applicationId)}/status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: options?.remarks || "",
          interviewData: options?.interviewData || undefined
        })
      }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) {
      return { success: false, message: result.error || "Application status update failed." };
    }
    return { success: true, message: `Application status updated to ${result.status || newStatus}.` };
  } catch (error: any) {
    console.error("Failed to update application status:", error);
    return { success: false, message: error.message || "Failed to update status." };
  }
}

/**
 * Assigns an application to an authorized Recruiter by Admin.
 * Stores assignedRecruiterId, assignedRecruiterName, assignedAt, assignedBy.
 */
export async function assignRecruiterToApplication(
  applicationId: string,
  recruiterId: string,
  recruiterName: string,
  assignedBy: string = "Admin"
): Promise<{ success: boolean; message: string }> {
  try {
    const nowIso = new Date().toISOString();
    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      return { success: false, message: "Application not found." };
    }

    const appData = appSnap.data();

    // Update assignment fields
    await updateDoc(appRef, {
      assignedRecruiterId: recruiterId,
      assignedRecruiterName: recruiterName,
      assignedAt: nowIso,
      assignedBy: assignedBy,
      updatedAt: nowIso
    });

    // Notify assigned Recruiter
    try {
      await NotificationService.triggerEvent({
        userId: recruiterId,
        event: "NEW_APPLICATION",
        title: "Candidate Application Assigned 👤",
        message: `You have been assigned ${appData.candidateName || "a candidate"} for "${appData.jobTitle || "Job"}" by ${assignedBy}.`,
        type: "info",
        link: `/recruiter/applications`
      });
    } catch (e) {
      console.warn("Recruiter assignment notification notice:", e);
    }

    return { success: true, message: `Application assigned to ${recruiterName}.` };
  } catch (error: any) {
    console.error("Failed to assign recruiter:", error);
    return { success: false, message: error.message || "Failed to assign recruiter." };
  }
}

/**
 * Schedules an interview for an application.
 * Saves: interviewDate, interviewTime, interviewMode, interviewLocation, meetingLink, interviewerName.
 * Sets status to "interview" and creates interview record in Firestore.
 */
export async function scheduleApplicationInterview(
  applicationId: string,
  details: {
    interviewDate: string;
    interviewTime: string;
    interviewMode: string;
    interviewLocation: string;
    meetingLink?: string;
    interviewerName: string;
    notes?: string;
  },
  scheduledBy: string = "Recruiter"
): Promise<{ success: boolean; message: string }> {
  try {
    const nowIso = new Date().toISOString();
    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      return { success: false, message: "Application not found." };
    }

    const appData = appSnap.data();
    const candidateId = appData.candidateId || appData.userId;
    const candidateName = appData.candidateName || "Candidate";
    const candidateEmail = appData.candidateEmail || "";
    const jobTitle = appData.jobTitle || "Job Position";
    const companyName = appData.companyName || "Employer";

    const interviewPayload = {
      interviewDate: details.interviewDate,
      interviewTime: details.interviewTime,
      interviewMode: details.interviewMode,
      interviewLocation: details.interviewLocation,
      meetingLink: details.meetingLink || "",
      interviewerName: details.interviewerName,
      interviewNotes: details.notes || "",
      status: "interview",
      updatedAt: nowIso
    };

    // 1. Update application status through the server-side ownership check.
    const statusResult = await updateApplicationStatus(applicationId, "interview", {
      remarks: details.notes || "Interview scheduled.",
      interviewData: interviewPayload
    });
    if (!statusResult.success) return statusResult;

    // 2. Create interview document in interviews collection
    const interviewId = `int_${Math.random().toString(36).substr(2, 9)}`;
    const interviewDoc = {
      id: interviewId,
      applicationId,
      candidateId,
      candidateName,
      candidateEmail,
      jobId: appData.jobId,
      jobTitle,
      companyName,
      recruiterId: appData.recruiterId || auth.currentUser?.uid,
      assignedRecruiterId: appData.assignedRecruiterId || null,
      interviewDate: details.interviewDate,
      interviewTime: details.interviewTime,
      interviewMode: details.interviewMode,
      interviewLocation: details.interviewLocation,
      meetingLink: details.meetingLink || "",
      interviewerName: details.interviewerName,
      scheduledBy,
      notes: details.notes || "",
      status: "scheduled",
      createdAt: nowIso
    };

    await setDoc(doc(db, "interviews", interviewId), interviewDoc);
    await setDoc(doc(db, "company_interviews", interviewId), interviewDoc);
    await setDoc(doc(db, "interviews_scheduled", interviewId), interviewDoc);

    // 3. Notify Candidate
    try {
      await NotificationService.triggerEvent({
        userId: candidateId,
        event: "AI_INTERVIEW_SCHEDULED",
        title: "Interview Scheduled 📅",
        message: `Your interview for "${jobTitle}" at ${companyName} has been scheduled for ${details.interviewDate} at ${details.interviewTime} (${details.interviewMode}).`,
        type: "success",
        recipientEmail: candidateEmail,
        templateName: "Interview Invite",
        templateVars: {
          userName: candidateName,
          jobTitle: jobTitle,
          companyName: companyName,
          interviewTime: `${details.interviewDate} at ${details.interviewTime}`,
          interviewLink: details.meetingLink || "Online / AIJobs Arena"
        },
        link: `/candidate/interviews`
      });
    } catch (e) {
      console.warn("Interview scheduled notification notice:", e);
    }

    return { success: true, message: "Interview scheduled successfully!" };
  } catch (error: any) {
    console.error("Failed to schedule interview:", error);
    return { success: false, message: error.message || "Failed to schedule interview." };
  }
}
