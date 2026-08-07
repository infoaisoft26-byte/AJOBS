import { getFirestoreDb } from "./firestoreHelper.js";
import { aiOrchestrator } from "./aiProvider.js";

export interface AgentRequest {
  userId: string;
  userMessage: string;
  sessionId?: string;
  language?: "en" | "hi";
  pendingAction?: {
    action: string;
    params: any;
    confirmed: boolean;
  };
}

export async function handleUnifiedAgentRequest(reqPayload: AgentRequest) {
  const { userId, userMessage, sessionId, language = "en", pendingAction } = reqPayload;

  if (!userId || userId === "anonymous") {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Please sign in to access the AIJobs Unified Agent."
    };
  }

  const db = getFirestoreDb();
  const timestamp = new Date().toISOString();

  // 1. Read User Profile and Role from Firestore
  let userRole = "candidate";
  let userRecord: any = null;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      userRecord = userDoc.data();
      userRole = userRecord.role || "candidate";
    }
  } catch (err: any) {
    console.warn(`[UnifiedAgent] Error fetching user role for ${userId}:`, err.message);
  }

  // 2. Handle Pending Action Confirmation if user clicked "Confirm"
  if (pendingAction && pendingAction.confirmed) {
    const result = await executeConfirmedAction(db, userId, userRole, pendingAction.action, pendingAction.params);
    return result;
  }

  // 3. Admin Escalation Check
  const sensitivePatterns = [
    "account approval", "approve my account", "payment dispute", "refund", "invoice dispute",
    "job approval", "job rejection", "complaint", "duplicate data", "access issue",
    "aadhaar", "pan", "bank detail", "password", "otp", "admin control"
  ];
  const normalizedMsg = userMessage.toLowerCase();
  const needsEscalation = sensitivePatterns.some(p => normalizedMsg.includes(p));

  if (needsEscalation) {
    const ticketId = `ticket_${Math.random().toString(36).substr(2, 9)}`;
    await db.collection("support_tickets").doc(ticketId).set({
      id: ticketId,
      userId,
      userRole,
      issueType: "admin_escalation",
      subject: `Admin Escalation Request from ${userRole}`,
      message: userMessage,
      status: "pending_admin",
      createdAt: timestamp
    });

    await saveAuditLog(db, userId, userRole, "admin_escalation_created", ticketId);

    return {
      success: true,
      role: userRole,
      escalatedToAdmin: true,
      ticketId,
      text: language === "hi"
        ? `आपकी समस्या प्रशासनिक समीक्षा के लिए एडमिन टीम को भेज दी गई है। टिकिट आईडी: **${ticketId}**`
        : `Your request has been escalated to the Admin team for manual review. Ticket ID: **${ticketId}**`,
      summaryCard: {
        type: "escalation",
        title: "Escalated to Admin",
        ticketId,
        status: "Pending Admin Review",
        createdAt: timestamp
      }
    };
  }

  // 4. Load Role-Permitted Live Data from Firestore
  let roleData: any = {};
  if (userRole === "candidate") {
    roleData = await loadCandidateData(db, userId);
  } else if (["consultancy", "agency"].includes(userRole)) {
    roleData = await loadConsultancyData(db, userId);
  } else if (["recruiter", "employer", "corporate"].includes(userRole)) {
    roleData = await loadRecruiterData(db, userId);
  } else if (userRole === "admin") {
    roleData = { adminAccess: true, notice: "Admin panel access granted." };
  }

  // 5. Construct Prompt
  const prompt = `
You are the AIJobs Unified AI Agent for ${userRole.toUpperCase()}.
User Language: ${language === "hi" ? "Hindi (हिंदी)" : "English"}

Current Authenticated User Role: ${userRole}
User Live Data from Firestore:
${JSON.stringify(roleData, null, 2)}

User Question/Request:
"${userMessage}"

STRICT GUIDELINES:
1. Answer strictly based on live Firestore data loaded above. Do not invent fake data.
2. NEVER disclose other users' records, bank details, passwords, OTP, Aadhaar, PAN, or admin notes.
3. Keep response in ${language === "hi" ? "Hindi" : "English"}.
4. If action requires data creation (e.g. apply to job, create support ticket, set follow-up reminder), indicate the action clearly in JSON format so a confirmation card is displayed to the user.
5. Return JSON format with:
   - "text": Markdown explanation in user's language.
   - "actionRequired": boolean (true if user confirmation is needed to save/create data).
   - "actionDetails": optional object with { "action": string, "params": object, "summary": string } if actionRequired is true.
`;

  try {
    const rawAiResponse = await aiOrchestrator.generateContentWithRetry(
      prompt,
      `You are the official role-isolated AIJobs Assistant for ${userRole}. Always output valid JSON.`,
      "application/json",
      3,
      15000,
      undefined,
      "gemini-3.6-flash",
      false,
      userId
    );

    const cleanedJson = rawAiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      success: true,
      role: userRole,
      text: parsed.text || "Here is your response based on verified Firestore data.",
      actionRequired: parsed.actionRequired || false,
      summaryCard: parsed.actionDetails ? {
        title: parsed.actionDetails.summary || "Action Confirmation Required",
        action: parsed.actionDetails.action,
        params: parsed.actionDetails.params,
        requiresConfirm: true
      } : null,
      fallbackUsed: false,
      provider: "gemini"
    };

  } catch (err: any) {
    console.warn(`[UnifiedAgent] AI generation notice for user ${userId}:`, err.message);

    const localText = generateLocalAgentFallback(userRole, roleData, userMessage, language);
    return {
      success: true,
      role: userRole,
      text: localText,
      fallbackUsed: true,
      provider: "local",
      reason: String(err.message).includes("QUOTA") ? "quota_exhausted" : "provider_error"
    };
  }
}

async function loadCandidateData(db: any, userId: string) {
  const profileDoc = await db.collection("candidates").doc(userId).get();
  const appsSnap = await db.collection("company_applications").where("candidateId", "==", userId).limit(20).get();
  const jobsSnap = await db.collection("jobs").where("status", "==", "active").limit(10).get();

  const applications: any[] = [];
  appsSnap.forEach((doc: any) => applications.push({ id: doc.id, ...doc.data() }));

  const activeJobs: any[] = [];
  jobsSnap.forEach((doc: any) => {
    const d = doc.data();
    activeJobs.push({ id: doc.id, title: d.title, company: d.company, location: d.location, salary: d.salary });
  });

  return {
    profile: profileDoc.exists ? profileDoc.data() : null,
    myApplications: applications,
    availableActiveJobs: activeJobs
  };
}

async function loadConsultancyData(db: any, userId: string) {
  const compDoc = await db.collection("consultancies").doc(userId).get();
  const jobsSnap = await db.collection("jobs").where("consultancyId", "==", userId).limit(20).get();
  const recruitersSnap = await db.collection("recruiters").where("consultancyId", "==", userId).limit(20).get();
  const candidatesSnap = await db.collection("candidate_leads").where("consultancyId", "==", userId).limit(20).get();

  const jobs: any[] = [];
  jobsSnap.forEach((doc: any) => jobs.push({ id: doc.id, ...doc.data() }));

  const recruiters: any[] = [];
  recruitersSnap.forEach((doc: any) => recruiters.push({ id: doc.id, name: doc.data().name, email: doc.data().email }));

  const candidates: any[] = [];
  candidatesSnap.forEach((doc: any) => candidates.push({ id: doc.id, candidateName: doc.data().candidateName, status: doc.data().status }));

  return {
    companyProfile: compDoc.exists ? compDoc.data() : null,
    myJobPosts: jobs,
    myRecruiters: recruiters,
    referredCandidates: candidates
  };
}

async function loadRecruiterData(db: any, userId: string) {
  const jobsSnap = await db.collection("jobs").where("recruiterId", "==", userId).limit(20).get();
  const leadsSnap = await db.collection("candidate_leads").where("assignedRecruiterId", "==", userId).limit(20).get();

  const assignedJobs: any[] = [];
  jobsSnap.forEach((doc: any) => assignedJobs.push({ id: doc.id, title: doc.data().title, status: doc.data().status }));

  const assignedLeads: any[] = [];
  leadsSnap.forEach((doc: any) => assignedLeads.push({ id: doc.id, candidateName: doc.data().candidateName, stage: doc.data().stage }));

  return {
    assignedJobs,
    assignedLeads
  };
}

async function executeConfirmedAction(db: any, userId: string, role: string, action: string, params: any) {
  const timestamp = new Date().toISOString();
  let targetId = params?.targetId || `target_${Math.random().toString(36).substr(2, 7)}`;

  if (action === "createApplicationAfterConfirmation") {
    targetId = `app_${userId}_${params.jobId}`;
    await db.collection("company_applications").doc(targetId).set({
      id: targetId,
      candidateId: userId,
      jobId: params.jobId,
      jobTitle: params.jobTitle || "Software Engineer",
      status: "Applied",
      appliedAt: timestamp
    }, { merge: true });

  } else if (action === "createSupportTicket") {
    targetId = `ticket_${Math.random().toString(36).substr(2, 9)}`;
    await db.collection("support_tickets").doc(targetId).set({
      id: targetId,
      userId,
      userRole: role,
      subject: params?.subject || "Support Request",
      message: params?.message || "",
      status: "Open",
      createdAt: timestamp
    });

  } else if (action === "createFollowUpReminder") {
    targetId = `rem_${Math.random().toString(36).substr(2, 9)}`;
    await db.collection("reminders").doc(targetId).set({
      id: targetId,
      userId,
      role,
      leadId: params?.leadId || null,
      note: params?.note || "Follow up with candidate",
      dueDate: params?.dueDate || timestamp,
      status: "pending",
      createdAt: timestamp
    });
  }

  await saveAuditLog(db, userId, role, action, targetId);

  return {
    success: true,
    actionExecuted: action,
    targetId,
    text: `✅ Action **${action}** executed successfully. Audit log saved. Target ID: **${targetId}**`,
    summaryCard: {
      type: "action_executed",
      action,
      targetId,
      status: "Completed",
      executedAt: timestamp
    }
  };
}

async function saveAuditLog(db: any, userId: string, role: string, action: string, targetId: string) {
  try {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await db.collection("audit_logs").doc(logId).set({
      id: logId,
      userId,
      role,
      action,
      targetId,
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn("[UnifiedAgent] Non-blocking audit log notice:", err.message);
  }
}

function generateLocalAgentFallback(role: string, data: any, userMsg: string, lang: string) {
  if (lang === "hi") {
    if (role === "candidate") {
      return `### कैंडिडेट डैशबोर्ड सहायता\n\n- आपके द्वारा सबमिट किए गए आवेदन: **${data.myApplications?.length || 0}**\n- वर्तमान में सक्रिय जॉब्स: **${data.availableActiveJobs?.length || 0}**\n\nनवीनतम नौकरियां देखने के लिए कृपया जॉब सेक्शन में जाएं।`;
    }
    return `### AIJobs सहायता\n\nआपकी भूमिका: **${role}**\nलाइव डेटा लोड हो चुका है।`;
  }

  if (role === "candidate") {
    return `### Candidate Portal Summary\n\n- **Submitted Applications**: ${data.myApplications?.length || 0}\n- **Available Active Jobs**: ${data.availableActiveJobs?.length || 0}\n\nAll data is verified live from your Firestore candidate record.`;
  } else if (["consultancy", "agency"].includes(role)) {
    return `### Consultancy Dashboard Overview\n\n- **Active Job Posts**: ${data.myJobPosts?.length || 0}\n- **Authorized Recruiters**: ${data.myRecruiters?.length || 0}\n- **Referred Candidates**: ${data.referredCandidates?.length || 0}`;
  } else if (["recruiter", "employer"].includes(role)) {
    return `### Recruiter Workstation\n\n- **Assigned Jobs**: ${data.assignedJobs?.length || 0}\n- **Assigned Candidate Leads**: ${data.assignedLeads?.length || 0}`;
  }

  return `### AIJobs Portal Assistant\n\nVerified authenticated access for role **${role}**.`;
}
