import { Request, Response } from "express";
import { getFirestoreDb, getFirebaseAuth } from "./firestoreHelper.js";
import { aiOrchestrator } from "./aiProvider.js";

// Rate limiting store for AI Assistant endpoint (30 requests per minute per user/IP)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, limit = 30, windowMs = 60000): { isLimited: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { isLimited: false, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { isLimited: true, remaining: 0 };
  }

  entry.count += 1;
  return { isLimited: false, remaining: limit - entry.count };
}

/**
 * Verify Firebase ID Token from Authorization Header (Optional for public general queries, required for private account operations)
 */
export async function verifyFirebaseIdToken(req: Request): Promise<{ uid: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token || token === "null" || token === "undefined") return null;

  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch (err: any) {
    console.warn("[AIAssistant] Firebase ID token verification notice:", err?.message || err);
    return null;
  }
}

/**
 * Normalize and sanitize user roles to prevent privilege escalation
 */
export function normalizeUserRole(rawRole?: string): string {
  const r = (rawRole || "").toLowerCase().trim();
  if (r === "admin" || r === "superadmin" || r === "administrator") return "admin";
  if (r === "employer" || r === "recruiter" || r === "corporate") return "recruiter";
  if (r === "consultancy" || r === "agency") return "consultancy";
  if (r === "employee" || r === "staff") return "employee";
  return "candidate";
}

/**
 * Intent Resolution: Categorize user query to provide precision-tuned assistance
 */
export function resolveUserIntent(message: string): "APPLICATION_STATUS" | "JOB_SEARCH" | "PROFILE_HELP" | "RESUME_HELP" | "INTERVIEW_HELP" | "GENERAL_CHAT" {
  const m = message.toLowerCase();

  if (
    m.includes("application status") ||
    m.includes("applied job") ||
    m.includes("my application") ||
    m.includes("mera application") ||
    m.includes("application update") ||
    m.includes("status kya hai") ||
    m.includes("track application")
  ) {
    return "APPLICATION_STATUS";
  }

  if (
    m.includes("job") ||
    m.includes("vacancy") ||
    m.includes("opening") ||
    m.includes("hiring") ||
    m.includes("mere liye job") ||
    m.includes("find work") ||
    m.includes("developer jobs") ||
    m.includes("naukri")
  ) {
    return "JOB_SEARCH";
  }

  if (
    m.includes("resume") ||
    m.includes("cv") ||
    m.includes("ats") ||
    m.includes("ats score") ||
    m.includes("resume upload") ||
    m.includes("mera resume")
  ) {
    return "RESUME_HELP";
  }

  if (
    m.includes("interview") ||
    m.includes("mock") ||
    m.includes("preparation") ||
    m.includes("prepare") ||
    m.includes("technical round") ||
    m.includes("hr question") ||
    m.includes("star method")
  ) {
    return "INTERVIEW_HELP";
  }

  if (
    m.includes("profile") ||
    m.includes("kyc") ||
    m.includes("verification") ||
    m.includes("account") ||
    m.includes("settings")
  ) {
    return "PROFILE_HELP";
  }

  // All unknown or conversational queries default strictly to GENERAL_CHAT (never static fallback)
  return "GENERAL_CHAT";
}

/**
 * Build live, role-authorized Firestore context for the AI prompt
 */
export async function buildAssistantContext(db: any, uid: string | null, role: string, userMessage: string, intent: string): Promise<{
  name: string;
  email: string;
  role: string;
  summary: string;
  contextText: string;
  hasPrivateAccess: boolean;
}> {
  let name = uid ? "Candidate" : "Guest Seeker";
  let email = "";
  let summary = "";
  let contextLines: string[] = [];
  const hasPrivateAccess = Boolean(uid);

  if (!uid) {
    // Unauthenticated Guest Context: Fetch public active jobs for reference
    const sampleJobs: any[] = [];
    try {
      const jobsSnap = await db.collection("jobs").where("status", "==", "active").limit(5).get();
      jobsSnap.forEach((doc: any) => {
        const j = doc.data();
        sampleJobs.push({
          id: doc.id,
          title: j.title || j.jobTitle || "",
          company: j.company || j.companyName || "Employer",
          location: j.location || "India / Remote",
          salary: j.salary || j.salaryRange || "Competitive"
        });
      });
    } catch (e) {
      // Ignore guest lookup notices
    }

    contextLines.push("- Authentication: Guest / Public Visitor");
    if (sampleJobs.length > 0) {
      contextLines.push(`- Sample Active Platform Roles (${sampleJobs.length}): ${JSON.stringify(sampleJobs)}`);
    }
    return {
      name: "Guest",
      email: "",
      role: "guest",
      summary: "Guest Visitor",
      contextText: contextLines.join("\n"),
      hasPrivateAccess: false
    };
  }

  try {
    // 1. Fetch User Record
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data() || {};
      name = userData.name || userData.displayName || userData.companyName || "User";
      email = userData.email || "";
    }
  } catch (err: any) {
    console.warn("[AIAssistant] Error loading user doc:", err?.message);
  }

  // 2. Load Role-Specific Live Records
  if (role === "candidate") {
    let candidateSkills: string[] = [];
    let experience = "";
    let preferredRoles: string[] = [];
    let preferredLocations: string[] = [];
    let education = "";
    let resumeUploaded = false;
    let atsScore: number | null = null;
    const applications: any[] = [];
    const interviews: any[] = [];
    const availableJobs: any[] = [];

    // Candidate Profile
    try {
      const candDoc = await db.collection("candidates").doc(uid).get();
      if (candDoc.exists) {
        const cData = candDoc.data() || {};
        candidateSkills = Array.isArray(cData.skills) ? cData.skills : [];
        experience = cData.experience || cData.totalExperience || "";
        preferredRoles = Array.isArray(cData.preferredRoles) ? cData.preferredRoles : cData.preferredRole ? [cData.preferredRole] : [];
        preferredLocations = Array.isArray(cData.preferredLocations) ? cData.preferredLocations : cData.location ? [cData.location] : [];
        education = cData.highestQualification || cData.education || "";
        resumeUploaded = Boolean(cData.resumeUrl || cData.resumeParsed || cData.resumeFile);
        if (typeof cData.atsScore === "number") atsScore = cData.atsScore;
      }
    } catch (err: any) {
      console.warn("[AIAssistant] Error loading candidate doc:", err?.message);
    }

    // Candidate Applications
    try {
      const snap1 = await db.collection("company_applications").where("candidateId", "==", uid).limit(10).get();
      snap1.forEach((doc: any) => {
        const a = doc.data();
        applications.push({
          jobId: a.jobId || "",
          jobTitle: a.jobTitle || "Role Application",
          companyName: a.companyName || a.employerName || "Hiring Company",
          status: a.status || "Applied",
          appliedAt: a.appliedAt || a.createdAt || ""
        });
      });

      if (applications.length === 0) {
        const snap2 = await db.collection("applications").where("candidateId", "==", uid).limit(10).get();
        snap2.forEach((doc: any) => {
          const a = doc.data();
          applications.push({
            jobId: a.jobId || "",
            jobTitle: a.jobTitle || "Role Application",
            companyName: a.companyName || "Company",
            status: a.status || "Applied",
            appliedAt: a.appliedAt || a.createdAt || ""
          });
        });
      }
    } catch (err: any) {
      console.warn("[AIAssistant] Error loading candidate applications:", err?.message);
    }

    // Candidate Interview Sessions
    try {
      const intSnap = await db.collection("interview_sessions").where("candidateId", "==", uid).limit(5).get();
      intSnap.forEach((doc: any) => {
        const it = doc.data();
        interviews.push({
          jobTitle: it.jobTitle || it.role || "Technical Interview",
          status: it.status || "Scheduled",
          scheduledAt: it.scheduledDate || it.scheduledAt || it.createdAt || "",
          mode: it.mode || "AI Video / Mock"
        });
      });
    } catch (err: any) {
      console.warn("[AIAssistant] Error loading interview sessions:", err?.message);
    }

    // Live Matching Active Jobs
    try {
      const jobsSnap = await db.collection("jobs").where("status", "==", "active").limit(8).get();
      jobsSnap.forEach((doc: any) => {
        const j = doc.data();
        availableJobs.push({
          jobId: doc.id,
          title: j.title || j.jobTitle || "",
          company: j.company || j.companyName || "Partner Employer",
          location: j.location || "Remote / Pan-India",
          salary: j.salary || j.salaryRange || "Competitive",
          experienceRequired: j.experience || j.minExperience || "",
          skills: Array.isArray(j.skills) ? j.skills.slice(0, 6) : []
        });
      });
    } catch (err: any) {
      console.warn("[AIAssistant] Error loading active jobs:", err?.message);
    }

    contextLines.push(`- Verified Candidate Name: ${name}`);
    contextLines.push(`- Candidate Skills: ${JSON.stringify(candidateSkills)}`);
    contextLines.push(`- Experience: ${experience || "Not specified"}`);
    contextLines.push(`- Education / Qualification: ${education || "Not specified"}`);
    contextLines.push(`- Preferred Roles: ${JSON.stringify(preferredRoles)}`);
    contextLines.push(`- Preferred Locations: ${JSON.stringify(preferredLocations)}`);
    contextLines.push(`- Resume Status: ${resumeUploaded ? "Uploaded" : "Not uploaded yet"}${atsScore ? ` (ATS Score: ${atsScore}/100)` : ""}`);
    contextLines.push(`- Real Applications in Database (${applications.length}): ${JSON.stringify(applications)}`);
    contextLines.push(`- Scheduled Interviews (${interviews.length}): ${JSON.stringify(interviews)}`);
    contextLines.push(`- Live Matching Jobs Available (${availableJobs.length}): ${JSON.stringify(availableJobs)}`);

    summary = `Candidate Profile: ${name}, ${candidateSkills.length} skills, ${applications.length} applications logged.`;

  } else if (role === "recruiter") {
    const postedJobs: any[] = [];
    let totalApplicants = 0;

    try {
      const jobsSnap = await db.collection("jobs").where("postedBy", "==", uid).limit(10).get();
      jobsSnap.forEach((doc: any) => {
        const j = doc.data();
        postedJobs.push({
          id: doc.id,
          title: j.title || j.jobTitle || "",
          location: j.location || "",
          status: j.status || "active",
          applicantsCount: j.applicantCount || j.applicationsCount || 0
        });
        totalApplicants += (j.applicantCount || j.applicationsCount || 0);
      });
    } catch (err: any) {
      console.warn("[AIAssistant] Error loading recruiter jobs:", err?.message);
    }

    contextLines.push(`- Recruiter Organization: ${name}`);
    contextLines.push(`- Posted Openings (${postedJobs.length}): ${JSON.stringify(postedJobs)}`);
    contextLines.push(`- Total Active Pipeline Applicants: ${totalApplicants}`);
    summary = `Recruiter Profile: ${name}, ${postedJobs.length} active job postings.`;

  } else if (role === "consultancy") {
    let agencyStatus = "active";
    let candidateCount = 0;

    try {
      const cDoc = await db.collection("consultancies").doc(uid).get();
      if (cDoc.exists) {
        const cd = cDoc.data() || {};
        agencyStatus = cd.status || cd.verificationStatus || "verified";
      }
      const candsSnap = await db.collection("candidates").where("consultancyId", "==", uid).limit(20).get();
      candidateCount = candsSnap.size;
    } catch (err: any) {
      console.warn("[AIAssistant] Error loading consultancy data:", err?.message);
    }

    contextLines.push(`- Agency Name: ${name}`);
    contextLines.push(`- Agency Verification Status: ${agencyStatus}`);
    contextLines.push(`- Managed Candidates Count: ${candidateCount}`);
    summary = `Consultancy Profile: ${name}, ${candidateCount} candidates submitted.`;

  } else if (role === "admin") {
    let totalJobs = 0;
    let totalCandidates = 0;
    let totalApplications = 0;

    try {
      const jSnap = await db.collection("jobs").limit(50).get();
      totalJobs = jSnap.size;
      const cSnap = await db.collection("candidates").limit(50).get();
      totalCandidates = cSnap.size;
      const aSnap = await db.collection("company_applications").limit(50).get();
      totalApplications = aSnap.size;
    } catch (err: any) {
      console.warn("[AIAssistant] Error loading admin aggregated metrics:", err?.message);
    }

    contextLines.push(`- Platform Overview: ~${totalJobs}+ jobs, ~${totalCandidates}+ candidates, ~${totalApplications}+ applications logged.`);
    contextLines.push(`- Security Notice: Administrative authorization active. Never disclose private API keys, internal credentials, passwords, or hashes.`);
    summary = `Admin Dashboard: ${name}, administrative access privileges active.`;

  } else {
    contextLines.push(`- Standard platform role context.`);
    summary = `Standard User: ${name}.`;
  }

  return {
    name,
    email,
    role,
    summary,
    contextText: contextLines.join("\n"),
    hasPrivateAccess: true
  };
}

/**
 * Persist conversation message in Firestore under ai_conversations/{conversationId}
 */
export async function persistConversationTurn(
  db: any,
  conversationId: string,
  uid: string | null,
  userRole: string,
  userMessage: string,
  replyText: string
): Promise<void> {
  if (!db) return;
  const timestamp = new Date().toISOString();
  try {
    const convRef = db.collection("ai_conversations").doc(conversationId);
    await convRef.set({
      id: conversationId,
      uid: uid || "guest",
      role: userRole,
      lastMessage: replyText.slice(0, 200),
      lastUpdated: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    const msgUserRef = convRef.collection("messages").doc(`msg_${Date.now()}_u`);
    await msgUserRef.set({
      conversationId,
      sender: "user",
      content: userMessage,
      timestamp
    });

    const msgAiRef = convRef.collection("messages").doc(`msg_${Date.now()}_a`);
    await msgAiRef.set({
      conversationId,
      sender: "assistant",
      content: replyText,
      timestamp
    });
  } catch (err: any) {
    console.warn("[AIAssistant] Error persisting conversation in Firestore:", err?.message);
  }
}

/**
 * Health Check Handler: GET /api/ai-assistant/health
 */
export async function handleAiAssistantHealth(req: Request, res: Response): Promise<void> {
  const isConfigured = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    success: true,
    service: "AIJOBS AI Assistant",
    status: isConfigured ? "ready" : "unconfigured",
    geminiConfigured: isConfigured,
    timestamp: new Date().toISOString()
  });
}

/**
 * Canonical AI Assistant Chat Endpoint: POST /api/ai-assistant/chat
 */
export async function handleAiAssistantChat(req: Request, res: Response): Promise<void> {
  console.log("[AI Assistant] request received");

  // 1. Input Validation
  const rawMessage = req.body?.message ?? req.body?.userMessage;
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

  if (!message) {
    return void res.status(400).json({
      success: false,
      code: "INVALID_MESSAGE",
      message: "Please enter a message."
    });
  }

  if (message.length > 2500) {
    return void res.status(400).json({
      success: false,
      code: "MESSAGE_TOO_LONG",
      message: "Message exceeds maximum length of 2500 characters."
    });
  }

  // 2. Provider Configuration Check
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI Assistant] provider failed: AI_NOT_CONFIGURED");
    return void res.status(500).json({
      success: false,
      code: "AI_NOT_CONFIGURED",
      message: "AI Assistant is not configured on the server."
    });
  }

  const { conversationId, history } = req.body || {};

  // 3. Authentication Check
  const authResult = await verifyFirebaseIdToken(req);
  const uid = authResult?.uid || null;
  const isAuthenticated = Boolean(uid);

  if (isAuthenticated) {
    console.log(`[AI Assistant] authenticated: ${uid}`);
  } else {
    console.log("[AI Assistant] unauthenticated / guest request");
  }

  // 4. Rate Limiting Check (by UID or IP)
  const rateLimitKey = uid || (req.headers["x-forwarded-for"] as string) || req.ip || "anonymous";
  const rateLimit = checkRateLimit(rateLimitKey, 30, 60000);
  if (rateLimit.isLimited) {
    console.warn(`[AI Assistant] provider failed: RATE_LIMITED for key ${rateLimitKey}`);
    return void res.status(429).json({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Please wait a few seconds before asking again."
    });
  }

  const db = getFirestoreDb();

  // 5. Role Determination from Trusted Database
  let userRole = "candidate";
  if (uid) {
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        userRole = normalizeUserRole(userData.role);
      }
    } catch (err: any) {
      console.warn("[AIAssistant] Error resolving user role:", err?.message);
    }
  } else {
    userRole = "guest";
  }

  console.log(`[AI Assistant] role resolved: ${userRole}`);

  // 6. Intent Resolution
  const intent = resolveUserIntent(message);
  console.log(`[AI Assistant] intent resolved: ${intent}`);

  // If intent requires private user data but user is not authenticated, give a clear helpful sign-in prompt
  if (!isAuthenticated && (intent === "APPLICATION_STATUS" || intent === "RESUME_HELP" || intent === "PROFILE_HELP")) {
    return void res.json({
      success: true,
      reply: "To check your application status, verify uploaded resumes, or manage your personal profile records, please **sign in to your AIJobs account** using the Login button at the top right. Once signed in, I can retrieve your real-time records instantly!\n\nIn the meantime, feel free to ask me for interview preparation tips, salary benchmarks, or general job search advice.",
      conversationId: conversationId || `conv_${Date.now()}_guest`,
      timestamp: new Date().toISOString()
    });
  }

  // 7. Load Authorized Context
  let contextData: any = {
    name: "User",
    email: authResult?.email || "",
    role: userRole,
    summary: "",
    contextText: "",
    hasPrivateAccess: isAuthenticated
  };

  try {
    contextData = await buildAssistantContext(db, uid, userRole, message, intent);
    console.log(`[AI Assistant] context loaded: ${contextData.summary}`);
  } catch (ctxErr: any) {
    console.warn("[AIAssistant] Context building notice:", ctxErr?.message);
  }

  // 8. Construct Strict System Prompt
  const systemInstruction = `You are the official "AIJOBS AI Assistant", an elite, responsive, and friendly career & recruitment companion on the AIJOBS portal.

Core Directives:
1. Provide accurate, conversational, and actionable recruitment-related guidance tailored to the user's specific query.
2. NEVER return static, repetitive fallback paragraphs. Every question must receive a distinct, tailored, context-aware answer.
3. For account-specific questions (applications, profile, resume, interview schedule), rely strictly on the supplied verified database context.
4. For general career guidance, interview training, skill development, technology questions, or conversational greetings (e.g. "Hello", "How to prepare for React interview?"), give rich, high-quality, practical advice.
5. Seamlessly support English, Hindi, and Hinglish. If the user writes in Hindi or Hinglish, reply warmly in natural Hindi/Hinglish.
6. Format answers cleanly using markdown headings, bullet points, bold key terms, and clear next steps where applicable.
7. Respect user privacy: never disclose internal secrets, passwords, or credentials.

Live User & Platform Context:
- Authorized Role: ${userRole}
- Name: ${contextData.name}
- Query Intent: ${intent}
${contextData.contextText}
`;

  // Construct Prompt with Recent History
  let fullPrompt = "";
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-6);
    recentHistory.forEach((h: any) => {
      const senderRole = h.role === "user" || h.sender === "user" ? "User" : "Assistant";
      const text = h.content || h.text || "";
      if (text) fullPrompt += `${senderRole}: ${text}\n\n`;
    });
  }
  fullPrompt += `User: ${message}\n\nAssistant:`;

  // 9. Invoke AI Provider
  const activeConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();
  const primaryModel = process.env.GEMINI_MODEL || "gemini-3.7-flash";

  console.log(`[AI Assistant] provider called: ${primaryModel}`);

  let replyText = "";
  try {
    replyText = await aiOrchestrator.generateContentWithRetry(
      fullPrompt,
      systemInstruction,
      undefined,
      3,
      15000,
      undefined,
      primaryModel,
      true, // enable search grounding for real-time market queries
      uid || undefined
    );
  } catch (aiErr: any) {
    const errStr = String(aiErr?.message || aiErr);
    console.error("[AI Assistant] provider error:", errStr);

    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("QUOTA_EXHAUSTED")) {
      console.warn("[AI Assistant] provider failed: AI_QUOTA_EXCEEDED");
      return void res.status(503).json({
        success: false,
        code: "AI_QUOTA_EXCEEDED",
        message: "AI Assistant is temporarily busy due to high demand. Please try again shortly."
      });
    }

    console.warn("[AI Assistant] provider failed: AI_TEMPORARILY_UNAVAILABLE");
    return void res.status(503).json({
      success: false,
      code: "AI_TEMPORARILY_UNAVAILABLE",
      message: "AI Assistant is temporarily unavailable. Please try again."
    });
  }

  // Validate reply text format
  if (typeof replyText !== "string" || !replyText.trim()) {
    console.error("[AI Assistant] provider failed: EMPTY_RESPONSE");
    return void res.status(503).json({
      success: false,
      code: "AI_TEMPORARILY_UNAVAILABLE",
      message: "AI Assistant is temporarily unavailable. Please try again."
    });
  }

  console.log("[AI Assistant] provider success");

  // 10. Persist Conversation in Background
  persistConversationTurn(db, activeConversationId, uid, userRole, message, replyText).catch((saveErr) => {
    console.warn("[AIAssistant] Background conversation persist notice:", saveErr?.message);
  });

  // 11. Return Canonical JSON Response (data.reply)
  return void res.json({
    success: true,
    reply: replyText.trim(),
    conversationId: activeConversationId,
    timestamp
  });
}
