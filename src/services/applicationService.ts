import { 
  doc, 
  setDoc, 
  getDoc,
  updateDoc, 
  increment, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { JobPosting, JobApplication } from "../types";

export interface ApplyResult {
  success: boolean;
  message: string;
  applicationId?: string;
}

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

  // 2. Verify Profile Completion
  if (!profile) {
    return {
      success: false,
      message: "Candidate profile is required to apply. Please complete your profile."
    };
  }

  const hasResume = 
    (resumeText && resumeText.trim().length > 0) || 
    (profile?.resumeText && profile.resumeText.trim().length > 0) || 
    profile?.resumeFileName ||
    profile?.resumeUrl;

  if (!hasResume) {
    return {
      success: false,
      message: "A resume is required to apply. Please upload or paste your resume in the Resume & ATS Audit tab."
    };
  }

  // Check if profile has basic info like candidate name or email
  const userName = profile?.name || auth.currentUser.displayName || "Anonymous Candidate";
  const userEmail = profile?.email || auth.currentUser.email || "candidate@aijobs.global";

  try {
    // 3. Prevent duplicate applications
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
        message: `You have already applied for the position of "${job.title}" at ${job.companyName}!`
      };
    }

    // Generate ID for application
    const appId = `app_${Math.random().toString(36).substring(2, 11)}`;
    
    // Application document in standard collection
    const newApp: JobApplication = {
      id: appId,
      jobId: job.id,
      candidateId: userId,
      candidateName: userName,
      jobTitle: job.title,
      companyName: job.companyName,
      status: "Applied",
      appliedAt: new Date().toISOString(),
      resumeScore: profile?.resumeScore || 70
    };

    // Application document in company-specific collection
    const newCompanyApp = {
      id: appId,
      jobId: job.id,
      jobTitle: job.title,
      candidateId: userId,
      candidateName: userName,
      candidateEmail: userEmail,
      resumeUrl: profile?.resumeFileName || profile?.resumeUrl || "gs://aijobs-resumes/resume.pdf",
      resumeScore: profile?.resumeScore || 70,
      interviewScore: profile?.aiInterviewScore || 0,
      status: "Applied",
      appliedAt: new Date().toISOString()
    };

    // Create a lead automatically for the CRM / Recruiter pipeline
    const leadId = `lead_${Math.random().toString(36).substring(2, 11)}`;
    const newLead = {
      id: leadId,
      candidateId: userId,
      candidateName: userName,
      email: userEmail,
      phone: profile?.phone || profile?.profileDetails?.mobileNumber || "Not Provided",
      resume: profile?.resumeFileName || profile?.resumeUrl || "No Resume Attached",
      jobId: job.id,
      jobTitle: job.title,
      company: job.companyName,
      recruiter: job.employerId || job.createdBy || "Direct Employer",
      consultancy: job.consultancy || "Direct",
      currentStatus: "Applied",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Write all documents to Firestore
    await setDoc(doc(db, "applications", appId), newApp);
    await setDoc(doc(db, "company_applications", appId), newCompanyApp);
    await setDoc(doc(db, "leads", leadId), newLead);

    // Update job application counts in standard jobs collection
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        applicationCount: increment(1)
      });
    } catch (e) {
      await setDoc(doc(db, "jobs", job.id), { applicationCount: 1 }, { merge: true });
    }

    // Update job application counts in company-specific jobs collection
    try {
      await updateDoc(doc(db, "company_jobs", job.id), {
        applicationCount: increment(1)
      });
    } catch (e) {
      // Ignored non-blocking
    }

    // 4. Trigger Recruiter Notification
    const recruiterId = job.employerId || job.createdBy || "employer";
    const employerNotifId = "notif_" + Math.random().toString(36).substring(2, 11);
    await setDoc(doc(db, "notifications", employerNotifId), {
      id: employerNotifId,
      userId: recruiterId,
      title: "Candidate Applied 💼",
      message: `${userName} has applied for your job opening "${job.title}". A Sourcing Lead has been automatically registered.`,
      read: false,
      type: "success",
      createdAt: new Date().toISOString()
    });

    // Trigger Candidate Confirmation Notification
    const confNotifId = "notif_" + Math.random().toString(36).substring(2, 11);
    await setDoc(doc(db, "notifications", confNotifId), {
      id: confNotifId,
      userId: userId,
      title: "Application Received Successfully",
      message: `Your application for "${job.title}" at ${job.companyName} has been processed. A Lead has been registered under status "Applied".`,
      read: false,
      createdAt: new Date().toISOString()
    });

    // 5. Trigger Admin Notification
    const adminNotifId = "notif_" + Math.random().toString(36).substring(2, 11);
    await setDoc(doc(db, "notifications", adminNotifId), {
      id: adminNotifId,
      userId: "admin",
      title: "New Job Application Logged 🚀",
      message: `${userName} has submitted an application for "${job.title}" at ${job.companyName}. Lead Registered.`,
      read: false,
      type: "info",
      createdAt: new Date().toISOString()
    });

    // Trigger Twilio SMS Notifications (Requirement 4)
    try {
      const candidatePhone = profile?.phone || profile?.profileDetails?.mobileNumber || "+919999999998";
      let recruiterPhone = "+919999999999";
      let recruiterName = "Recruiter";
      try {
        const recId = job.employerId || job.createdBy;
        if (recId) {
          const recSnap = await getDoc(doc(db, "users", recId));
          if (recSnap.exists()) {
            const recData = recSnap.data();
            recruiterPhone = recData.phone || recData.profileDetails?.mobileNumber || "+919999999999";
            recruiterName = recData.name || "Recruiter";
          }
        }
      } catch (recErr) {
        console.warn("Could not fetch recruiter contact info for SMS, using default fallback:", recErr);
      }

      await fetch("/api/twilio/job-applied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidatePhone,
          candidateName: userName,
          recruiterPhone,
          recruiterName,
          jobTitle: job.title,
          companyName: job.companyName
        })
      });
    } catch (smsErr) {
      console.warn("Failed to dispatch application Twilio SMS alerts:", smsErr);
    }

    return {
      success: true,
      message: `Success! Your application for "${job.title}" has been submitted to ${job.companyName}.`,
      applicationId: appId
    };
  } catch (error: any) {
    console.error("Error in applyToJob service: ", error);
    return {
      success: false,
      message: `There was an error filing your application: ${error.message || error}`
    };
  }
}
