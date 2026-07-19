import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: "candidate" | "consultancy" | "employer" | "recruiter" | "admin" | "superadmin";
  profileImage?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
  status?: string;
  subscription?: string;
  resumeURL?: string;
  profileCompleted?: boolean;
  companyId?: string;
  subscriptionPlan?: string;
}

/**
 * Initializes all required Firestore collections and documents for a new user
 * if they do not already exist, ensuring perfect zero-manual-setup startup.
 */
export async function initializeUserCollectionsAndDocs(
  fbUser: any,
  role: "candidate" | "consultancy" | "employer" | "recruiter" | "admin" | "superadmin",
  displayName: string
): Promise<UserProfile> {
  const userId = fbUser.uid;
  const email = fbUser.email || "";
  const name = displayName || fbUser.displayName || "Aryan Sharma";
  const isoDate = new Date().toISOString();

  // 1. Prepare User Profile
  const userProfile: UserProfile = {
    uid: userId,
    name,
    email,
    phone: fbUser.phoneNumber || "",
    role,
    profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    createdAt: isoDate,
    lastLogin: isoDate,
    status: "active",
    subscription: role === "consultancy" ? "Pro Agency" : "Enterprise Access",
    resumeURL: "",
    profileCompleted: false,
    companyId: role === "employer" || role === "recruiter" ? userId : "",
    subscriptionPlan: role === "consultancy" ? "Pro Agency" : "Enterprise Access"
  };

  // Helper to safely write a document if it doesn't already exist
  const safeSetDoc = async (colName: string, docId: string, data: any) => {
    try {
      const docRef = doc(db, colName, docId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, data);
        console.log(`[dbInitService] Initialized collection '${colName}' document ID: ${docId}`);
      }
    } catch (err) {
      console.warn(`[dbInitService] Skipped seeding ${colName}/${docId}:`, err);
    }
  };

  // --- Collection 1: users ---
  await safeSetDoc("users", userId, userProfile);

  // --- Collection 2: admins ---
  if (role === "admin" || role === "superadmin") {
    await safeSetDoc("admins", userId, {
      userId,
      name,
      email,
      level: role === "superadmin" ? "Super Admin" : "System Admin",
      status: "active",
      createdAt: isoDate,
    });
  }

  // --- Collection 3: companies (and legacy employers) ---
  if (role === "employer" || role === "recruiter") {
    const companyPayload = {
      companyId: userId,
      companyName: name,
      email,
      size: "50-200",
      industry: "Artificial Intelligence & Technology",
      website: "https://google.com",
      description: "Building next-generation search and intelligence platforms.",
      logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=80&q=80",
      createdAt: isoDate,
    };
    await safeSetDoc("companies", userId, companyPayload);
    await safeSetDoc("employers", userId, {
      userId,
      companyName: name,
      industry: "Artificial Intelligence",
      size: "501-1000",
    });
  }

  // --- Collection 4: consultancies ---
  if (role === "consultancy") {
    await safeSetDoc("consultancies", userId, {
      userId,
      agencyName: name,
      email,
      subscriptionStatus: "active",
      pricingPlan: "Pro Agency",
      clientsCount: 18,
      revenue: 45000,
      createdAt: isoDate,
    });
  }

  // Legacy candidates table
  if (role === "candidate") {
    await safeSetDoc("candidates", userId, {
      userId,
      resumeUrl: "https://demo.pdf",
      resumeFileName: "Aryan_Sharma_Resume.pdf",
      resumeScore: 82,
      skills: ["React", "TypeScript", "Tailwind CSS", "Node.js", "Firebase", "Gemini SDK"],
      experience: "3+ Years Web Developer",
      aiInterviewScore: 88,
      resumeText: "Aryan Sharma\nWeb Engineer\nReact Developer with experience building responsive cloud applications.",
      summary: "Skilled Software Engineer focused on interactive user dashboards and generative AI API systems.",
      careerCoachChat: [
        { id: "init_coach", sender: "ai", text: `Hi ${name}! I'm your AI Career Coach. Let's optimize your technical journey and interview pipeline today!`, timestamp: isoDate }
      ],
    });
  }

  // --- Collection 5: jobs (and legacy company_jobs) ---
  const jobDemoId = `job_demo_${userId.substring(0, 5)}`;
  const sampleJob = {
    id: jobDemoId,
    employerId: role === "employer" ? userId : "demo_employer_uid",
    companyName: role === "employer" ? name : "Google AI Labs",
    title: "Senior Full-Stack Engineer",
    description: "Join us to build state-of-the-art interactive portals. Requires React, TypeScript, and Generative AI knowledge.",
    location: "Bengaluru, India (Hybrid)",
    type: "Full-time",
    salary: "₹24,00,000 - ₹34,00,000 PA",
    skillsRequired: ["React", "TypeScript", "Node.js", "Firebase"],
    status: "open",
    createdAt: isoDate,
  };
  await safeSetDoc("jobs", jobDemoId, sampleJob);
  await safeSetDoc("company_jobs", jobDemoId, sampleJob);

  // --- Collection 6: applications (and legacy company_applications) ---
  const appDemoId = `app_demo_${userId}`;
  const sampleApp = {
    id: appDemoId,
    userId: role === "candidate" ? userId : "demo_candidate_uid",
    candidateName: role === "candidate" ? name : "Aryan Sharma",
    jobId: jobDemoId,
    jobTitle: sampleJob.title,
    companyName: sampleJob.companyName,
    status: "applied",
    appliedAt: isoDate,
    createdAt: isoDate,
  };
  await safeSetDoc("applications", appDemoId, sampleApp);
  await safeSetDoc("company_applications", appDemoId, sampleApp);

  // --- Collection 7: interviews (and legacy company_interviews) ---
  const interviewDemoId = `int_demo_${userId}`;
  const sampleInterview = {
    id: interviewDemoId,
    userId: role === "candidate" ? userId : "demo_candidate_uid",
    candidateName: role === "candidate" ? name : "Aryan Sharma",
    jobId: jobDemoId,
    jobTitle: sampleJob.title,
    dateTime: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in future
    status: "scheduled",
    type: "AI Screen Test",
    createdAt: isoDate,
  };
  await safeSetDoc("interviews", interviewDemoId, sampleInterview);
  await safeSetDoc("company_interviews", interviewDemoId, sampleInterview);

  // --- Collection 8: resumes ---
  const resumePayload = {
    id: userId,
    userId,
    fileName: role === "candidate" ? "Aryan_Sharma_Resume.pdf" : "Default_Template.pdf",
    fileUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=120&q=80",
    text: "Interactive System Architect & Developer. Specialized in real-time interfaces, databases, and AI model orchestration.",
    score: 85,
    parsedSkills: ["React", "TypeScript", "Tailwind CSS", "Cloud Solutions"],
    createdAt: isoDate,
  };
  await safeSetDoc("resumes", userId, resumePayload);

  // --- Collection 9: notifications ---
  const notifId = `notif_welcome_${userId}`;
  const sampleNotif = {
    id: notifId,
    userId,
    title: "System Initialized Successfully!",
    message: `Welcome to AIJobs, ${name}! Your sandbox is pre-populated with active analytics, smart ATS pipelines, and sample resumes.`,
    read: false,
    archived: false,
    createdAt: isoDate,
  };
  await safeSetDoc("notifications", notifId, sampleNotif);

  // --- Collection 10: subscriptions ---
  const subId = `sub_${userId}`;
  await safeSetDoc("subscriptions", subId, {
    id: subId,
    userId,
    status: "active",
    plan: role === "consultancy" ? "Pro Agency" : "Enterprise Access",
    expiresAt: "2030-12-31T23:59:59.000Z",
    price: role === "consultancy" ? 45000 : 0,
    billingCycle: "yearly",
    createdAt: isoDate,
  });

  // --- Collection 11: payments ---
  const payId = `pay_init_${userId}`;
  await safeSetDoc("payments", payId, {
    id: payId,
    userId,
    amount: role === "consultancy" ? 45000 : 0,
    currency: "INR",
    status: "completed",
    gateway: "Stripe",
    reference: `TXN_${userId.substring(0, 8).toUpperCase()}`,
    createdAt: isoDate,
  });

  // --- Collection 12: plans ---
  const plansToSeed = [
    { id: "plan_free", name: "Free Tier", price: 0, cycle: "monthly", features: ["1 ATS Match", "Basic CV Score"] },
    { id: "plan_starter", name: "Starter Suite", price: 4999, cycle: "monthly", features: ["15 ATS Matches", "Generative Interview Screening"] },
    { id: "plan_pro", name: "Pro Agency", price: 14999, cycle: "monthly", features: ["Unlimited Pipeline Matching", "Custom Candidate Portals"] }
  ];
  for (const plan of plansToSeed) {
    await safeSetDoc("plans", plan.id, plan);
  }

  // --- Collection 13: ai_reports ---
  const reportId = `rep_wel_${userId}`;
  await safeSetDoc("ai_reports", reportId, {
    id: reportId,
    userId,
    score: 88,
    grade: "Excellent",
    breakdown: { technical: 92, communication: 84, experience: 88 },
    analysisText: "Strong competency in modern web interfaces, React rendering strategies, and state isolation.",
    sharedWithConsultancies: [],
    sharedWithEmployers: [],
    isPublic: true,
    createdAt: isoDate,
  });

  // --- Collection 14: interview_results ---
  const intResultId = `res_wel_${userId}`;
  await safeSetDoc("interview_results", intResultId, {
    id: intResultId,
    userId,
    candidateName: name,
    score: 91,
    status: "passed",
    feedback: "Exhibited highly logical layout mapping, fast system updates, and clear architecture breakdown.",
    createdAt: isoDate,
  });

  // --- Collection 15: activity_logs (and company_activity_logs) ---
  const activityId = `act_${userId}_${Math.random().toString(36).substring(2, 6)}`;
  const activityPayload = {
    id: activityId,
    userId,
    action: "account_setup_bootstrap",
    details: `Profile and all 18 standard collection records provisioned for user: ${name}`,
    ipAddress: "127.0.0.1",
    createdAt: isoDate,
  };
  await safeSetDoc("activity_logs", activityId, activityPayload);
  await safeSetDoc("company_activity_logs", activityId, activityPayload);

  // --- Collection 16: login_logs ---
  const loginId = `login_${userId}_${Date.now()}`;
  await safeSetDoc("login_logs", loginId, {
    id: loginId,
    userId,
    email,
    status: "success",
    userAgent: navigator.userAgent,
    createdAt: isoDate,
  });

  // --- Collection 17: support_tickets (and legacy support) ---
  const ticketId = `tkt_wel_${userId}`;
  const supportPayload = {
    id: ticketId,
    userId,
    subject: "Welcome to AIJobs Enterprise Support",
    message: "How can I set up direct API ingestion for my candidate spreadsheets?",
    status: "resolved",
    reply: "Simply go to the AI Control Center on your admin panel to toggle CSV custom ingestion maps.",
    createdAt: isoDate,
  };
  await safeSetDoc("support_tickets", ticketId, supportPayload);
  await safeSetDoc("support", ticketId, supportPayload);

  // --- Collection 18: settings (and legacy system_settings) ---
  const globalConfigPayload = {
    general: {
      siteName: "AIJobs Intelligent Recruitment",
      supportEmail: "support@aijobs.example",
      contactPhone: "+91 80 4012 3456",
      maintenanceMode: false,
    },
    smtp: {
      host: "smtp.aijobs.example",
      port: "587",
      user: "no-reply@aijobs.example",
    },
    security: {
      maxLoginAttempts: 5,
      sessionTimeoutMinutes: 45,
      mfaRequired: false,
    },
    backup: {
      frequency: "Daily",
      lastBackupAt: isoDate,
      totalBackups: 142,
    },
    aiEngine: {
      defaultModel: "gemini-3.5-flash",
      temperature: 0.2,
      maxTokens: 2048,
    },
    createdAt: isoDate,
  };
  await safeSetDoc("settings", "global_config", globalConfigPayload);
  await safeSetDoc("system_settings", "global_config", globalConfigPayload);

  return userProfile;
}

/**
 * Highly resilient self-healing profile retriever and bootstrapper.
 * Tries to fetch user profile, and if missing, uses the preferredRole (if passed),
 * or deduces the correct role from existing sub-collections, then auto-initializes
 * all 18 Firestore collections/documents, and returns the profile.
 * Never throws an error; returns a fallback profile if Firestore is totally unreachable.
 */
export async function getOrCreateUserProfile(
  fbUser: any,
  preferredRole?: "candidate" | "consultancy" | "employer" | "admin"
): Promise<UserProfile> {
  const userId = fbUser.uid;
  
  try {
    // 1. Try reading the users profile
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
  } catch (err) {
    console.warn("[getOrCreateUserProfile] Failed to read 'users' collection:", err);
  }

  // 2. If missing (or read failed), try to deduce role from other collections
  let deducedRole: "candidate" | "consultancy" | "employer" | "admin" = preferredRole || "candidate";
  
  if (!preferredRole) {
    try {
      const [adminSnap, companySnap, employerSnap, consultancySnap, candidateSnap] = await Promise.all([
        getDoc(doc(db, "admins", userId)).catch(() => null),
        getDoc(doc(db, "companies", userId)).catch(() => null),
        getDoc(doc(db, "employers", userId)).catch(() => null),
        getDoc(doc(db, "consultancies", userId)).catch(() => null),
        getDoc(doc(db, "candidates", userId)).catch(() => null),
      ]);

      if (adminSnap?.exists()) {
        deducedRole = "admin";
      } else if (companySnap?.exists() || employerSnap?.exists()) {
        deducedRole = "employer";
      } else if (consultancySnap?.exists()) {
        deducedRole = "consultancy";
      } else if (candidateSnap?.exists()) {
        deducedRole = "candidate";
      } else {
        // 3. Fallback to email domain/prefix deduction
        const emailLower = (fbUser.email || "").toLowerCase();
        if (emailLower.includes("admin")) {
          deducedRole = "admin";
        } else if (emailLower.includes("employer") || emailLower.includes("company") || emailLower.includes("corporate")) {
          deducedRole = "employer";
        } else if (emailLower.includes("consultancy") || emailLower.includes("agency") || emailLower.includes("crm")) {
          deducedRole = "consultancy";
        } else {
          deducedRole = "candidate";
        }
      }
    } catch (deduceErr) {
      console.warn("[getOrCreateUserProfile] Failed to deduce role from collections:", deduceErr);
      // Deduce from email as fallback
      const emailLower = (fbUser.email || "").toLowerCase();
      if (emailLower.includes("admin")) {
        deducedRole = "admin";
      } else if (emailLower.includes("employer") || emailLower.includes("company") || emailLower.includes("corporate")) {
        deducedRole = "employer";
      } else if (emailLower.includes("consultancy") || emailLower.includes("agency") || emailLower.includes("crm")) {
        deducedRole = "consultancy";
      }
    }
  }

  // 4. Automatically create the profile and seed all collections
  try {
    const displayName = fbUser.displayName || fbUser.email?.split("@")[0] || "Aryan Sharma";
    const profile = await initializeUserCollectionsAndDocs(fbUser, deducedRole, displayName);
    return profile;
  } catch (initErr) {
    console.error("[getOrCreateUserProfile] Failed to auto-initialize profile document:", initErr);
    // 5. Hard fallback: Return a fully compliant client-side profile so login never fails
    return {
      uid: userId,
      name: fbUser.displayName || "Aryan Sharma",
      email: fbUser.email || "",
      phone: fbUser.phoneNumber || "",
      role: deducedRole,
      profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.displayName || "Aryan Sharma")}`,
      photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.displayName || "Aryan Sharma")}`,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: "active",
      subscription: deducedRole === "consultancy" ? "Pro Agency" : "Enterprise Access",
      resumeURL: "",
      profileCompleted: false,
      companyId: deducedRole === "employer" || deducedRole === "recruiter" ? userId : "",
      subscriptionPlan: deducedRole === "consultancy" ? "Pro Agency" : "Enterprise Access"
    };
  }
}

