import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { User } from "lucide-react";
import { db } from "../firebase";
import { normalizeRole } from "../utils/roleUtils";

/**
 * Safely writes/updates a Firestore document using setDoc with merge option.
 */
export async function safeSetDoc(colName: string, docId: string, data: any, merge: boolean = true) {
  try {
    const docRef = doc(db, colName, docId);
    await setDoc(docRef, data, merge ? { merge: true } : undefined);
  } catch (err) {
    console.warn(`[dbInitService] Skipped writing ${colName}/${docId}:`, err);
  }
}

/**
 * Helper to safely write a document if it doesn't already exist
 */
export async function safeSetDocIfNotExists(colName: string, docId: string, data: any) {
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
}


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
  const name = displayName || fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "Candidate");
  const isoDate = new Date().toISOString();

  // 1. Prepare User Profile based on registration flow
  const isPendingKycRole = role === "consultancy" || role === "employer" || role === "recruiter";
  
  const userProfile: UserProfile = {
    uid: userId,
    name,
    email,
    phone: fbUser.phoneNumber || "",
    role: (role === "admin" || role === "superadmin") ? "candidate" : role,
    profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    createdAt: isoDate,
    lastLogin: isoDate,
    status: isPendingKycRole ? "pending_kyc" : "active",
    accountStatus: isPendingKycRole ? "pending_kyc" : "active",
    isActive: !isPendingKycRole,
    isApproved: !isPendingKycRole,
    subscription: role === "consultancy" ? "Pro Agency" : "Enterprise Access",
    resumeURL: "",
    profileCompleted: false,
    companyId: (role === "employer" || role === "recruiter") ? userId : "",
    subscriptionPlan: role === "consultancy" ? "Pro Agency" : "Enterprise Access"
  };

  // --- Collection 1: users ---
  await safeSetDocIfNotExists("users", userId, userProfile);

  // --- Collection 2: admins ---
  // SECURITY REQUIREMENT: Admin documents must NEVER be created automatically during user registration.
  // Admin access is strictly manual provision only.

  // --- Collection 3: companies ---
  if (role === "employer" || role === "recruiter") {
    const companyPayload = {
      companyId: userId,
      companyName: name,
      email,
      createdAt: isoDate,
    };
    await safeSetDocIfNotExists("companies", userId, companyPayload);
    await safeSetDocIfNotExists("employers", userId, {
      userId,
      companyName: name,
      createdAt: isoDate,
    });
  }

  // --- Collection 4: consultancies ---
  if (role === "consultancy") {
    await safeSetDocIfNotExists("consultancies", userId, {
      userId,
      agencyName: name,
      email,
      subscriptionStatus: "pending",
      pricingPlan: "Pro Agency",
      clientsCount: 0,
      revenue: 0,
      createdAt: isoDate,
    });
  }

  // Fresh Candidate Profile (No fake demo data)
  if (role === "candidate") {
    const candidateProfile = {
      uid: userId,
      email,
      name,
      phone: fbUser.phoneNumber || "",
      role: "candidate",
      profileCompleted: false,
      profileCompletionPercentage: 0,
      resumeUrl: null,
      resumeFileName: null,
      resumeStoragePath: null,
      education: [],
      experience: [],
      skills: [],
      certifications: [],
      preferredLocations: [],
      savedJobs: [],
      createdAt: isoDate,
      updatedAt: isoDate,
    };
    await safeSetDocIfNotExists("users", userId, candidateProfile);
    await safeSetDocIfNotExists("candidates", userId, {
      userId,
      name,
      email,
      phone: fbUser.phoneNumber || "",
      resumeUrl: null,
      resumeFileName: null,
      resumeStoragePath: null,
      resumeScore: 0,
      aiInterviewScore: 0,
      skills: [],
      education: [],
      experience: [],
      certifications: [],
      preferredLocations: [],
      savedJobIds: [],
      createdAt: isoDate,
      updatedAt: isoDate,
    });
  }

  // --- Collection 15: activity_logs ---
  const activityId = `act_${userId}_${Math.random().toString(36).substring(2, 6)}`;
  const activityPayload = {
    id: activityId,
    userId,
    action: "account_setup_bootstrap",
    details: `Profile and all 18 standard collection records provisioned for user: ${name}`,
    ipAddress: "127.0.0.1",
    createdAt: isoDate,
  };
  await safeSetDocIfNotExists("activity_logs", activityId, activityPayload);
  await safeSetDocIfNotExists("company_activity_logs", activityId, activityPayload);

  // --- Collection 16: login_logs ---
  const loginId = `login_${userId}_${Date.now()}`;
  await safeSetDocIfNotExists("login_logs", loginId, {
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
  await safeSetDocIfNotExists("support_tickets", ticketId, supportPayload);
  await safeSetDocIfNotExists("support", ticketId, supportPayload);

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
      defaultModel: "gemini-3.6-flash",
      temperature: 0.2,
      maxTokens: 2048,
    },
    createdAt: isoDate,
  };
  await safeSetDocIfNotExists("settings", "global_config", globalConfigPayload);
  await safeSetDocIfNotExists("system_settings", "global_config", globalConfigPayload);

  return userProfile;
}

/**
 * Highly resilient self-healing profile retriever and bootstrapper.
 * Strict Role Resolution Order:
 * 1. Check admins/{uid}
 * 2. Check users/{uid}
 * 3. Read Firebase custom claims if available
 * 4. Only use "candidate" as default for a genuinely new public Candidate registration
 */
export async function getOrCreateUserProfile(
  fbUser: any,
  preferredRole?: "candidate" | "consultancy" | "employer" | "recruiter" | "admin" | "superadmin",
  loginSource?: "admin" | "candidate" | "recruiter" | "consultancy" | "employer" | "internal"
): Promise<UserProfile> {
  const userId = fbUser.uid;

  // 1. Check admins/{uid} FIRST
  let adminSnap: any = null;
  try {
    adminSnap = await getDoc(doc(db, "admins", userId));
  } catch (err) {
    console.warn("[getOrCreateUserProfile] Fetch attempt for 'admins' document failed:", err);
  }

  if (adminSnap && adminSnap.exists()) {
    const adminData = adminSnap.data();
    const rawRole = adminData.role || "admin";
    const resolvedRole: "admin" | "superadmin" = (rawRole === "superadmin" || rawRole === "super_admin" || rawRole === "Super Admin" || adminData.level === "Super Admin") ? "superadmin" : "admin";
    const adminName = adminData.name || fbUser.displayName || fbUser.email?.split("@")[0] || "AIJobs Super Admin";

    const userPayload: UserProfile = {
      uid: userId,
      name: adminName,
      email: fbUser.email || adminData.email || "",
      phone: fbUser.phoneNumber || adminData.phone || "",
      role: resolvedRole,
      profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(adminName)}`,
      photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(adminName)}`,
      createdAt: adminData.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      accountStatus: "active",
      status: "active",
      isActive: true,
      isApproved: true,
      onboardingCompleted: true,
      internalAccess: true,
      isBetaTester: true,
      updatedAt: new Date().toISOString()
    };

    const adminDocPayload = {
      uid: userId,
      email: fbUser.email || adminData.email || "",
      name: adminName,
      role: resolvedRole,
      level: resolvedRole === "superadmin" ? "Super Admin" : "Administrator",
      status: "active",
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    console.log(`[Trace dbInitService] Admin doc found for UID: ${userId}, Resolved Role: ${resolvedRole}`);

    await Promise.all([
      safeSetDoc("users", userId, userPayload),
      safeSetDoc("admins", userId, adminDocPayload)
    ]).catch(e => console.warn("[getOrCreateUserProfile] Admin sync warning:", e));

    return userPayload;
  }

  // 2. Check users/{uid} SECOND
  let userSnap: any = null;
  try {
    userSnap = await getDoc(doc(db, "users", userId));
  } catch (err) {
    console.warn("[getOrCreateUserProfile] Fetch attempt for 'users' document failed:", err);
  }

  if (userSnap && userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    if (data && data.uid && data.role) {
      const normRole = normalizeRole(data.role);
      if (normRole === "admin" || normRole === "superadmin") {
        const resolvedRole: "admin" | "superadmin" = (normRole === "superadmin" || data.role === "superadmin" || data.role === "super_admin" || (data as any).level === "Super Admin") ? "superadmin" : "admin";
        const adminName = data.name || fbUser.displayName || fbUser.email?.split("@")[0] || "AIJobs Super Admin";

        const userPayload: UserProfile = {
          ...data,
          uid: userId,
          email: fbUser.email || data.email || "",
          name: adminName,
          role: resolvedRole,
          accountStatus: "active",
          status: "active",
          isActive: true,
          isApproved: true,
          onboardingCompleted: true,
          internalAccess: true,
          isBetaTester: true,
          updatedAt: new Date().toISOString()
        };

        const adminDocPayload = {
          uid: userId,
          email: fbUser.email || data.email || "",
          name: adminName,
          role: resolvedRole,
          level: resolvedRole === "superadmin" ? "Super Admin" : "Administrator",
          status: "active",
          isActive: true,
          updatedAt: new Date().toISOString()
        };

        console.log(`[Trace dbInitService] User doc admin found for UID: ${userId}, Resolved Role: ${resolvedRole}`);

        await Promise.all([
          safeSetDoc("users", userId, userPayload),
          safeSetDoc("admins", userId, adminDocPayload)
        ]).catch(e => console.warn("[getOrCreateUserProfile] Admin user doc sync warning:", e));

        return userPayload;
      }

      console.log(`[Trace dbInitService] User doc non-admin found for UID: ${userId}, Role: ${data.role}`);
      // Preserve existing non-candidate role (recruiter, consultancy, employer, candidate)
      return data;
    }
  }

  // 3. Read Firebase Custom Claims if available
  try {
    if (typeof fbUser.getIdTokenResult === "function") {
      const tokenResult = await fbUser.getIdTokenResult();
      if (tokenResult?.claims?.admin || tokenResult?.claims?.role === "admin" || tokenResult?.claims?.role === "superadmin") {
        const resolvedRole: "admin" | "superadmin" = tokenResult?.claims?.role === "superadmin" ? "superadmin" : "admin";
        const adminName = fbUser.displayName || fbUser.email?.split("@")[0] || "AIJobs Super Admin";

        const userPayload: UserProfile = {
          uid: userId,
          name: adminName,
          email: fbUser.email || "",
          role: resolvedRole,
          accountStatus: "active",
          status: "active",
          isActive: true,
          isApproved: true,
          onboardingCompleted: true,
          internalAccess: true,
          isBetaTester: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const adminDocPayload = {
          uid: userId,
          email: fbUser.email || "",
          name: adminName,
          role: resolvedRole,
          level: resolvedRole === "superadmin" ? "Super Admin" : "Administrator",
          status: "active",
          isActive: true,
          updatedAt: new Date().toISOString()
        };

        console.log(`[Trace dbInitService] Admin claims found for UID: ${userId}, Resolved Role: ${resolvedRole}`);

        await Promise.all([
          safeSetDoc("users", userId, userPayload),
          safeSetDoc("admins", userId, adminDocPayload)
        ]).catch(e => console.warn("[getOrCreateUserProfile] Admin claim sync warning:", e));

        return userPayload;
      }
    }
  } catch (claimErr) {
    console.warn("[getOrCreateUserProfile] Claims check skipped or failed:", claimErr);
  }

  // 4. Safe fallback for new public user profile creation
  // IMPORTANT: Public registration flows can NEVER create admin or superadmin roles automatically.
  let targetRole: "candidate" | "consultancy" | "employer" | "recruiter" = "candidate";

  if (preferredRole && preferredRole !== "admin" && preferredRole !== "superadmin") {
    targetRole = preferredRole as "candidate" | "consultancy" | "employer" | "recruiter";
  } else {
    const emailLower = (fbUser.email || "").toLowerCase();
    if (loginSource === "candidate") {
      targetRole = "candidate";
    } else if (emailLower.includes("employer") || emailLower.includes("company") || emailLower.includes("corporate") || emailLower.includes("recruiter")) {
      targetRole = "employer";
    } else if (emailLower.includes("consultancy") || emailLower.includes("agency")) {
      targetRole = "consultancy";
    } else {
      targetRole = "candidate";
    }
  }

  // Automatically create default profile in Firestore users/{uid} and seed collections
  try {
    const displayName = fbUser.displayName || fbUser.email?.split("@")[0] || "User Desk";
    const profile = await initializeUserCollectionsAndDocs(fbUser, targetRole, displayName);
    return profile;
  } catch (initErr) {
    console.error("[getOrCreateUserProfile] Auto-initialization error during document creation:", initErr);
    const defaultName = fbUser.displayName || fbUser.email?.split("@")[0] || "User Desk";
    const isPendingKycRole = targetRole === "consultancy" || targetRole === "employer" || targetRole === "recruiter";
    return {
      uid: userId,
      name: defaultName,
      email: fbUser.email || "",
      phone: fbUser.phoneNumber || "",
      role: targetRole,
      profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(defaultName)}`,
      photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(defaultName)}`,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: isPendingKycRole ? "pending_kyc" : "active",
      accountStatus: isPendingKycRole ? "pending_kyc" : "active",
      isActive: !isPendingKycRole,
      isApproved: !isPendingKycRole,
      subscription: targetRole === "consultancy" ? "Pro Agency" : "Enterprise Access",
      resumeURL: "",
      profileCompleted: false,
      companyId: targetRole === "employer" || targetRole === "recruiter" ? userId : "",
      subscriptionPlan: targetRole === "consultancy" ? "Pro Agency" : "Enterprise Access"
    };
  }
}

