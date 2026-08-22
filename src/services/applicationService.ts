import { collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
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
  const candidateName = profile?.name || profile?.fullName || auth.currentUser.displayName || "Candidate";
  const candidateEmail = auth.currentUser.email || profile?.email || "";
  const candidatePhone = profile?.phone || profile?.mobileNumber || profile?.personalDetails?.mobile || profile?.profileDetails?.mobileNumber || "";
  const candidateLocation = profile?.location || profile?.city || profile?.personalDetails?.city || "Remote / Undisclosed";
  const candidateExperience = profile?.experience || profile?.yearsOfExperience || profile?.employmentDetails?.designation || "Fresher";
  const candidateSkills = profile?.skills || profile?.skillsRequired || [];
  const resumeUrl = profile?.resumeUrl || profile?.resumeURL || null;

  try {
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
      companyId: job.companyId || job.employerId || "",
      companyName: job.companyName,
      recruiterId: job.recruiterId || job.employerId || null,
      employerId: job.employerId || null,
      consultancyId: (job as any).consultancyId || ((job as any).consultancyUserId) || null,
      consultancyName: (job as any).consultancyName || (job as any).consultancy || null,
      assignedRecruiterId: null,
      assignedRecruiterName: null,
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
      candidateName: candidateName,
      candidateEmail: candidateEmail,
      candidatePhone: candidatePhone,
      resumeUrl: resumeUrl || "No Resume Attached",
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
      recruiter: job.employerId || job.createdBy || "Direct Employer",
      consultancyId: (job as any).consultancyId || (job as any).consultancyUserId || null,
      consultancy: (job as any).consultancyName || job.consultancy || "Direct",
      currentStatus: "applied",
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Write documents to Firestore
    await setDoc(doc(db, "applications", appId), newApp);
    await setDoc(doc(db, "company_applications", appId), newCompanyApp);
    await setDoc(doc(db, "leads", leadId), newLead);

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

    // 4. Trigger Recruiter & Candidate Notifications
    const recruiterId = job.employerId || job.createdBy || "employer";
    try {
      await NotificationService.triggerEvent({
        userId: recruiterId,
        event: "NEW_APPLICATION",
        title: "Candidate Applied 💼",
        message: `${candidateName} has applied for your job opening "${job.title}".`,
        type: "success",
        link: `jobId=${job.id}`
      });

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
          resumeScore: String(profile?.resumeScore || 80)
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
    const nowIso = new Date().toISOString();
    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      return { success: false, message: "Application document not found." };
    }

    const appData = appSnap.data();
    const updatePayload: Record<string, any> = {
      status: newStatus,
      updatedAt: nowIso
    };

    if (options?.interviewData) {
      Object.assign(updatePayload, options.interviewData);
    }

    // Update primary applications doc
    await updateDoc(appRef, updatePayload);

    // Sync company_applications doc if exists
    try {
      await updateDoc(doc(db, "company_applications", applicationId), {
        status: newStatus,
        updatedAt: nowIso
      });
    } catch (e) {
      // Non-blocking
    }

    // Log timeline
    try {
      const timelineId = `timeline_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, "applications", applicationId, "timeline", timelineId), {
        id: timelineId,
        applicationId,
        previousStatus: appData.status || "applied",
        newStatus,
        changedBy: options?.actorId || auth.currentUser?.uid || "system",
        changedByName: options?.actorName || auth.currentUser?.displayName || "Recruitment Team",
        changedByRole: options?.actorRole || "recruiter",
        remarks: options?.remarks || "",
        createdAt: nowIso
      });
    } catch (timelineErr) {
      console.warn("Timeline recording notice:", timelineErr);
    }

    // Create Candidate In-App Notification & Email Trigger
    const candidateId = appData.candidateId || appData.userId;
    const candidateName = appData.candidateName || "Candidate";
    const candidateEmail = appData.candidateEmail || "";
    const jobTitle = appData.jobTitle || "Job";
    const companyName = appData.companyName || "Employer";

    if (candidateId) {
      let notifTitle = `Application Status Update`;
      let notifMessage = `Your application for "${jobTitle}" at ${companyName} is now in ${newStatus}.`;
      let notifType: "info" | "success" | "alert" | "warning" = "info";
      let eventType: any = "APPLICATION_SUBMITTED";

      if (newStatus === "shortlisted") {
        notifTitle = "Application Shortlisted 🎉";
        notifMessage = `Great news! Your profile for "${jobTitle}" at ${companyName} has been shortlisted by the recruiting team.`;
        notifType = "success";
        eventType = "NEW_JOB_MATCH";
      } else if (newStatus === "interview") {
        notifTitle = "Interview Scheduled 📅";
        notifMessage = `An interview round has been scheduled for your application for "${jobTitle}" at ${companyName}.`;
        notifType = "success";
        eventType = "INTERVIEW_INVITATION";
      } else if (newStatus === "selected") {
        notifTitle = "Selected for Position 🌟";
        notifMessage = `Congratulations! You have been selected for the role of "${jobTitle}" at ${companyName}.`;
        notifType = "success";
        eventType = "OFFER_LETTER_RECEIVED";
      } else if (newStatus === "offer") {
        notifTitle = "Offer Letter Released 💼";
        notifMessage = `An official job offer has been released for "${jobTitle}" at ${companyName}! Please review details in your dashboard.`;
        notifType = "success";
        eventType = "OFFER_LETTER_RECEIVED";
      } else if (newStatus === "joined") {
        notifTitle = "Welcome Aboard 🚀";
        notifMessage = `Your joining for "${jobTitle}" at ${companyName} is confirmed. Welcome to the team!`;
        notifType = "success";
      } else if (newStatus === "rejected") {
        notifTitle = "Application Status Update";
        notifMessage = `Thank you for your application for "${jobTitle}" at ${companyName}. The team has decided to proceed with other applicants for this opening.`;
        notifType = "alert";
      }

      try {
        await NotificationService.triggerEvent({
          userId: candidateId,
          event: eventType,
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          recipientEmail: candidateEmail,
          templateName: newStatus === "offer" ? "Offer Letter" : undefined,
          templateVars: {
            userName: candidateName,
            jobTitle: jobTitle,
            companyName: companyName,
            offerLink: `/candidate/applications`
          },
          link: `/candidate/applications`
        });
      } catch (notifErr) {
        console.warn("Transactional notification trigger error (non-fatal):", notifErr);
      }
    }

    return { success: true, message: `Application status updated to ${newStatus}.` };
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

    // 1. Update applications doc
    await updateDoc(appRef, interviewPayload);

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
