import { getFirestoreDb } from "./firestoreHelper";

export interface ThreatAnalysisResult {
  isThreat: boolean;
  keywordsFound: string[];
  threatType: string;
}

/**
 * Middleware-style function that parses incoming messages for payment-related keywords.
 */
export function parsePaymentThreat(messageText: string): ThreatAnalysisResult {
  if (!messageText || typeof messageText !== "string") {
    return { isThreat: false, keywordsFound: [], threatType: "none" };
  }

  const normalized = messageText.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

  const SUSPICIOUS_PATTERNS = [
    "pay money", "registration fee", "security deposit", "interview fee", "offer letter fee",
    "joining fee", "training fee", "send upi", "send qr code", "transfer money", "cash payment",
    "wallet payment", "bank transfer", "processing fee", "refundable amount", "document charge",
    "paise bhejo", "payment karo", "registration charge", "joining ke paise", "interview ke paise",
    "security amount", "upi karo", "qr scan karo", "pay fee", "deposit fee", "pay charges",
    "advance payment", "paid job", "wire transfer", "crypto", "gpay", "google pay", "phonepe",
    "paytm", "zelle", "venmo", "paypal", "pay upfront", "upfront payment"
  ];

  const matched: string[] = [];
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (normalized.includes(pattern)) {
      matched.push(pattern);
    }
  }

  if (matched.length === 0) {
    if (
      (normalized.includes("pay") && (normalized.includes("fee") || normalized.includes("charge") || normalized.includes("deposit") || normalized.includes("money"))) ||
      (normalized.includes("send") && (normalized.includes("payment") || normalized.includes("upi") || normalized.includes("money")))
    ) {
      matched.push("generic_payment_demand");
    }
  }

  return {
    isThreat: matched.length > 0,
    keywordsFound: matched,
    threatType: matched.length > 0 ? "payment_demand" : "none"
  };
}

export interface ChatSessionPayload {
  sessionId: string;
  userId: string;
  senderName?: string;
  senderRole?: string;
  candidateId?: string | null;
  recruiterId?: string | null;
  consultancyId?: string | null;
  jobId?: string | null;
  userMessage: string;
  response?: string;
  groundingSources?: any[] | null;
  source?: string;
}

/**
 * Persists chat sessions and messages in `chat_sessions/{sessionId}/messages/{messageId}`
 * and executes fraud threat actions if payment demands are detected.
 */
export async function logChatSessionAndMessage(payload: ChatSessionPayload) {
  const db = getFirestoreDb();
  const timestamp = new Date().toISOString();
  const activeSessionId = payload.sessionId || `session_${Math.random().toString(36).substr(2, 9)}`;
  const activeUserId = payload.userId || "anonymous";

  // Parse incoming message for payment threats
  const threatAnalysis = parsePaymentThreat(payload.userMessage);
  const isThreat = threatAnalysis.isThreat;

  const displayMessage = isThreat
    ? "⚠️ [Message hidden due to security policy violation: Requesting direct payments or fees is strictly forbidden on AIJobs.]"
    : payload.userMessage;

  const resolvedCandidateId = payload.candidateId || (payload.senderRole === "candidate" ? activeUserId : null);
  const resolvedRecruiterId = payload.recruiterId || (["recruiter", "employer", "corporate"].includes(payload.senderRole || "") ? activeUserId : null);
  const resolvedConsultancyId = payload.consultancyId || (["consultancy", "agency"].includes(payload.senderRole || "") ? activeUserId : null);
  const resolvedJobId = payload.jobId || null;

  try {
    // 1. Save / Update parent session in chat_sessions/{sessionId}
    await db.collection("chat_sessions").doc(activeSessionId).set({
      id: activeSessionId,
      sessionId: activeSessionId,
      userId: activeUserId,
      candidateId: resolvedCandidateId,
      candidateName: payload.senderRole === "candidate" ? (payload.senderName || "Candidate") : null,
      recruiterId: resolvedRecruiterId,
      recruiterName: ["recruiter", "employer", "corporate"].includes(payload.senderRole || "") ? (payload.senderName || "Recruiter") : null,
      consultancyId: resolvedConsultancyId,
      consultancyName: ["consultancy", "agency"].includes(payload.senderRole || "") ? (payload.senderName || "Consultancy") : null,
      jobId: resolvedJobId,
      userName: payload.senderName || "User",
      role: payload.senderRole || "anonymous",
      lastMessage: displayMessage,
      lastMessageAt: timestamp,
      updatedAt: timestamp,
      status: isThreat ? "suspended_for_review" : "active",
      riskLevel: isThreat ? "high_risk" : "normal",
      riskFlags: isThreat ? ["payment_request_detected"] : []
    }, { merge: true });

    // 2. Save message in subcollection chat_sessions/{sessionId}/messages/{messageId}
    const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
    const messageDoc = {
      id: messageId,
      sessionId: activeSessionId,
      userId: activeUserId,
      senderId: activeUserId,
      senderName: payload.senderName || "User",
      senderType: payload.senderRole || "anonymous",
      role: payload.senderRole || "anonymous",
      candidateId: resolvedCandidateId,
      recruiterId: resolvedRecruiterId,
      consultancyId: resolvedConsultancyId,
      jobId: resolvedJobId,
      message: displayMessage,
      originalMessage: payload.userMessage,
      response: isThreat
        ? "⚠️ AI Security Warning: Message hidden because direct payment demands are strictly prohibited."
        : (payload.response || ""),
      visibleToCandidate: isThreat ? false : true,
      visibleToAdmin: true,
      detectedIntent: isThreat ? "payment_demand" : "chat",
      riskFlags: isThreat ? ["payment_request_detected"] : [],
      groundingSources: payload.groundingSources || null,
      createdAt: timestamp,
      timestamp: timestamp,
      source: payload.source || "gemini"
    };

    await db.collection("chat_sessions").doc(activeSessionId).collection("messages").doc(messageId).set(messageDoc);

    // 3. Backwards-compatibility write to top-level chat_messages
    await db.collection("chat_messages").doc(messageId).set(messageDoc);

    // 4. If a payment threat is detected, suspend account and notify Admin users
    if (isThreat) {
      console.warn(`[Anti-Fraud Threat] Payment threat detected in session ${activeSessionId} from user ${activeUserId}`);

      const freezePayload = {
        accountStatus: "suspended_for_review",
        isApproved: false,
        isActive: false,
        chatPermissions: "frozen",
        updatedAt: timestamp
      };

      await db.collection("users").doc(activeUserId).set(freezePayload, { merge: true }).catch(() => {});
      await db.collection("candidates").doc(activeUserId).set(freezePayload, { merge: true }).catch(() => {});
      await db.collection("recruiters").doc(activeUserId).set(freezePayload, { merge: true }).catch(() => {});
      await db.collection("consultancies").doc(activeUserId).set(freezePayload, { merge: true }).catch(() => {});

      // Create Admin Fraud Alert document in fraud_alerts
      const alertId = `alert_${Math.random().toString(36).substr(2, 9)}`;
      await db.collection("fraud_alerts").doc(alertId).set({
        id: alertId,
        sessionId: activeSessionId,
        chatId: activeSessionId,
        senderId: activeUserId,
        senderName: payload.senderName || "User",
        senderRole: payload.senderRole || "user",
        candidateId: resolvedCandidateId,
        recruiterId: resolvedRecruiterId,
        jobId: resolvedJobId,
        originalMessage: payload.userMessage,
        threatType: "payment_demand",
        keywordsFound: threatAnalysis.keywordsFound,
        createdAt: timestamp,
        status: "pending_review",
        actionRequired: true
      });

      // Create Admin Notification in admin_notifications
      const notifId = `notif_${Math.random().toString(36).substr(2, 9)}`;
      await db.collection("admin_notifications").doc(notifId).set({
        id: notifId,
        type: "FRAUD_SECURITY_ALERT",
        title: "⚠️ High Risk Security Alert: Payment Request Detected",
        message: `User ${payload.senderName || activeUserId} (${payload.senderRole || "User"}) attempted to request fees/payment in session ${activeSessionId}. Account status updated to 'suspended_for_review'.`,
        sessionId: activeSessionId,
        senderId: activeUserId,
        createdAt: timestamp,
        read: false,
        priority: "high"
      });
    }

    return {
      success: true,
      sessionId: activeSessionId,
      messageId,
      isThreat,
      displayMessage,
      visibleToCandidate: !isThreat
    };

  } catch (fsErr: any) {
    const msg = String(fsErr?.message || fsErr);
    console.error("[ChatService] Firestore logging notice:", msg);
    return {
      success: false,
      sessionId: activeSessionId,
      error: msg,
      isThreat,
      displayMessage,
      visibleToCandidate: !isThreat
    };
  }
}
