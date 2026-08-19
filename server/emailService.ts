import nodemailer from "nodemailer";
import crypto from "crypto";
import { getFirestoreDb } from "./firestoreHelper.js";
import { EMAIL_TEMPLATES, EmailTemplateData } from "./emailTemplates.js";

const getSenderAddress = () => {
  const fromName = process.env.EMAIL_FROM_NAME || "AIJobs";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || "aijobs1401@gmail.com";
  return `"${fromName}" <${fromAddress}>`;
};

const REPLY_TO = process.env.EMAIL_FROM_ADDRESS || "aijobs1401@gmail.com";
const APP_URL = process.env.VITE_SITE_URL || process.env.APP_URL || "https://aijobs1.vercel.app";

let transporter: nodemailer.Transporter | null = null;
const inMemoryEmailLogs: Map<string, any> = new Map();

export function getEmailLogsFromMemory() {
  return Array.from(inMemoryEmailLogs.values());
}

/**
 * Initialize Nodemailer transport using SMTP credentials
 */
function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const user = process.env.SMTP_USER || process.env.EMAIL_FROM_ADDRESS || "aijobs1401@gmail.com";
  const pass = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[EmailService] SMTP credentials missing (SMTP_USER / SMTP_APP_PASSWORD not set).");
    return null;
  }

  if (!transporter) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      console.log(`[EmailService] Nodemailer transport initialized for host: ${host}, user: ${user}`);
    } catch (err: any) {
      console.error("[EmailService] Failed to create Nodemailer transport:", err.message);
      return null;
    }
  }

  return transporter;
}

export interface DispatchEmailParams {
  to: string;
  templateName: string;
  data: EmailTemplateData;
  userId?: string;
  recipientName?: string;
  recipientRole?: string;
  createdBy?: string;
  category?: "transactional" | "job_alert" | "marketing" | "weekly_digest";
}

export interface DispatchEmailResult {
  success: boolean;
  messageId?: string;
  emailId?: string;
  alreadySent?: boolean;
  message?: string;
  error?: string;
}

/**
 * Check if a welcome email was already sent to this user / email
 */
export async function checkIfAlreadySent(userId: string, recipientEmail: string, templateName: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !db.collection) {
    // Check in-memory logs
    for (const log of inMemoryEmailLogs.values()) {
      if (
        (log.userId === userId || log.recipient === recipientEmail) &&
        log.template === templateName &&
        log.status === "sent"
      ) {
        return true;
      }
    }
    return false;
  }

  try {
    const snapByUid = await db.collection("email_logs")
      .where("userId", "==", userId || "none")
      .where("template", "==", templateName)
      .where("status", "==", "sent")
      .get();

    if (!snapByUid.empty) return true;

    const snapByEmail = await db.collection("email_logs")
      .where("recipient", "==", recipientEmail)
      .where("template", "==", templateName)
      .where("status", "==", "sent")
      .get();

    if (!snapByEmail.empty) return true;
  } catch (err: any) {
    console.warn(`[EmailService] Duplicate check query notice: ${err.message}`);
  }

  return false;
}

/**
 * Dispatch Email via Nodemailer SMTP and save email log to Firestore email_logs/{emailId}
 */
export async function dispatchEmail(params: DispatchEmailParams): Promise<DispatchEmailResult> {
  const { to, templateName, data, userId = "anonymous", recipientName, recipientRole = "candidate", createdBy = "system", category = "transactional" } = params;

  const recipient = (to || "").trim();
  if (!recipient) {
    return { success: false, error: "Recipient email address is required." };
  }

  const templateFn = EMAIL_TEMPLATES[templateName];
  if (!templateFn) {
    return { success: false, error: `Invalid email template name: ${templateName}` };
  }

  // Duplicate Welcome Email Check (Requirement 11)
  const isWelcomeTemplate = ["candidate_welcome", "candidate-registration", "recruiter_welcome", "consultancy_welcome"].includes(templateName);
  if (isWelcomeTemplate) {
    const alreadySent = await checkIfAlreadySent(userId, recipient, templateName);
    if (alreadySent) {
      console.log(`[EmailService] Welcome email already sent to ${recipient} [template: ${templateName}]`);
      return {
        success: true,
        alreadySent: true,
        message: "Welcome email was already sent."
      };
    }
  }

  const emailId = `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Inject defaults
  const templateData: EmailTemplateData = {
    ...data,
    email: recipient,
    recipientName: recipientName || data.recipientName || data.candidateName || recipient.split("@")[0],
    appUrl: APP_URL
  };

  const rendered = templateFn(templateData);

  const smtpTransporter = getTransporter();
  if (!smtpTransporter) {
    const errorMsg = "SMTP configuration is incomplete.";
    // Log failed attempt to Firestore
    await recordEmailLog({
      emailId,
      userId,
      recipient,
      recipientName: templateData.recipientName || recipient.split("@")[0],
      recipientRole,
      template: templateName,
      subject: rendered.subject,
      status: "failed",
      provider: "gmail_smtp",
      messageId: null,
      errorMessage: errorMsg,
      createdBy,
      createdAt: now,
      updatedAt: now
    });

    return { success: false, emailId, error: errorMsg };
  }

  let sentStatus: "sent" | "failed" = "failed";
  let messageId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const mailHeader: any = {
      from: getSenderAddress(),
      to: recipient,
      replyTo: REPLY_TO,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    };

    if (templateData.unsubscribeToken) {
      const unsubUrl = `${APP_URL}/unsubscribe?token=${templateData.unsubscribeToken}`;
      mailHeader.headers = {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
    }

    const info = await smtpTransporter.sendMail(mailHeader);
    messageId = info.messageId || `msg_${Date.now()}`;
    sentStatus = "sent";
    console.log(`[EmailService] Email sent successfully to ${recipient} [Subject: "${rendered.subject}"] [MessageID: ${messageId}]`);
  } catch (sendErr: any) {
    sentStatus = "failed";
    errorMessage = sendErr.message || "Failed to send email via SMTP.";

    // Classify provider error to distinguish auth issues, rate limits, invalid recipients, or network faults
    const errorCode = sendErr.code || (sendErr.responseCode ? `HTTP_${sendErr.responseCode}` : "SMTP_ERROR");
    const responseCode = sendErr.responseCode || null;
    const command = sendErr.command || null;
    const providerResponse = sendErr.response || sendErr.message || null;
    const lowerResp = `${providerResponse} ${errorCode} ${errorMessage}`.toLowerCase();

    let errorCategory = "PROVIDER_ERROR";
    if (errorCode === "EAUTH" || responseCode === 535 || lowerResp.includes("535") || lowerResp.includes("username and password") || lowerResp.includes("badcredentials") || lowerResp.includes("invalid_api_key") || lowerResp.includes("authentication failed")) {
      errorCategory = "AUTHENTICATION_ERROR";
    } else if (responseCode === 421 || responseCode === 429 || responseCode === 451 || lowerResp.includes("rate") || lowerResp.includes("limit") || lowerResp.includes("quota") || lowerResp.includes("too many requests") || lowerResp.includes("exceeded")) {
      errorCategory = "RATE_LIMIT_ERROR";
    } else if (errorCode === "EENVELOPE" || responseCode === 550 || responseCode === 551 || responseCode === 553 || responseCode === 501 || lowerResp.includes("does not exist") || lowerResp.includes("unknown user") || lowerResp.includes("invalid recipient") || lowerResp.includes("mailbox unavailable") || lowerResp.includes("unrecognized domain")) {
      errorCategory = "INVALID_RECIPIENT_ERROR";
    } else if (errorCode === "ECONNREFUSED" || errorCode === "ETIMEDOUT" || errorCode === "ESOCKET" || errorCode === "EDNS" || lowerResp.includes("timeout") || lowerResp.includes("connection refused")) {
      errorCategory = "NETWORK_ERROR";
    }

    // Structured logging for operational monitoring and log tracing
    console.error("[EmailService] SMTP delivery failed:", JSON.stringify({
      recipient,
      template: templateName,
      errorCategory,
      errorCode,
      responseCode,
      command,
      providerResponse,
      errorMessage,
      timestamp: now
    }));

    // Record Email Log in Firestore email_logs/{emailId}
    await recordEmailLog({
      emailId,
      userId,
      recipient,
      recipientName: templateData.recipientName || recipient.split("@")[0],
      recipientRole,
      template: templateName,
      subject: rendered.subject,
      status: "failed",
      provider: "gmail_smtp",
      messageId: null,
      errorCategory,
      errorCode,
      responseCode,
      command,
      errorMessage,
      errorDetails: providerResponse,
      createdBy,
      createdAt: now,
      updatedAt: now
    });

    return {
      success: false,
      emailId,
      error: errorMessage || "Email could not be sent."
    };
  }

  // Record Email Log in Firestore email_logs/{emailId} (Requirement 8)
  await recordEmailLog({
    emailId,
    userId,
    recipient,
    recipientName: templateData.recipientName || recipient.split("@")[0],
    recipientRole,
    template: templateName,
    subject: rendered.subject,
    status: sentStatus,
    provider: "gmail_smtp",
    messageId,
    errorMessage: null,
    createdBy,
    createdAt: now,
    updatedAt: now
  });

  return {
    success: true,
    emailId,
    messageId: messageId || undefined,
    message: "Email sent successfully"
  };
}

/**
 * Alias for dispatchEmail for backwards compatibility across routes
 */
export async function sendTemplatedEmail(params: DispatchEmailParams): Promise<DispatchEmailResult> {
  return dispatchEmail(params);
}

/**
 * Record Log Doc in Firestore 'email_logs/{emailId}'
 */
async function recordEmailLog(logRecord: any) {
  inMemoryEmailLogs.set(logRecord.emailId, logRecord);

  const db = getFirestoreDb();
  if (db && db.collection) {
    try {
      await db.collection("email_logs").doc(logRecord.emailId).set(logRecord);
    } catch (fsErr: any) {
      console.warn(`[EmailService] Error writing to email_logs in Firestore:`, fsErr.message);
    }
  }
}

/**
 * Trigger Candidate Welcome Email
 */
export async function sendCandidateWelcomeEmail(
  candidateEmail: string,
  candidateName: string = "Candidate",
  userId?: string
): Promise<DispatchEmailResult> {
  return dispatchEmail({
    to: candidateEmail,
    templateName: "candidate_welcome",
    data: {
      candidateName,
      recipientName: candidateName
    },
    userId: userId || "anonymous",
    recipientName: candidateName,
    recipientRole: "candidate",
    createdBy: "registration_flow",
    category: "transactional"
  });
}

/**
 * Trigger Recruiter Welcome Email
 */
export async function sendRecruiterWelcomeEmail(
  recruiterEmail: string,
  recruiterName: string = "Recruiter",
  userId?: string
): Promise<DispatchEmailResult> {
  return dispatchEmail({
    to: recruiterEmail,
    templateName: "recruiter_welcome",
    data: {
      recipientName: recruiterName,
      candidateName: recruiterName
    },
    userId: userId || "anonymous",
    recipientName: recruiterName,
    recipientRole: "recruiter",
    createdBy: "registration_flow",
    category: "transactional"
  });
}

/**
 * Trigger Consultancy Welcome Email
 */
export async function sendConsultancyWelcomeEmail(
  consultancyEmail: string,
  consultancyName: string = "Consultancy",
  userId?: string
): Promise<DispatchEmailResult> {
  return dispatchEmail({
    to: consultancyEmail,
    templateName: "consultancy_welcome",
    data: {
      recipientName: consultancyName,
      candidateName: consultancyName
    },
    userId: userId || "anonymous",
    recipientName: consultancyName,
    recipientRole: "consultancy",
    createdBy: "registration_flow",
    category: "transactional"
  });
}

/**
 * Helper to get user email preferences
 */
export async function getOrCreateUserEmailPreferences(uid: string, userEmail: string, initialConsent: boolean = false) {
  const db = getFirestoreDb();
  if (!db || !db.collection) return null;

  const prefRef = db.collection("users").doc(uid).collection("email_preferences").doc("settings");
  const snap = await prefRef.get();

  if (snap.exists) {
    return snap.data();
  }

  const unsubscribeToken = crypto.randomBytes(16).toString("hex");
  const newPrefs = {
    transactionalEmails: true,
    jobAlerts: initialConsent,
    promotionalEmails: initialConsent,
    weeklyDigest: initialConsent,
    preferredJobRoles: [],
    preferredLocations: [],
    preferredSkills: [],
    unsubscribeToken,
    updatedAt: new Date().toISOString()
  };

  await prefRef.set(newPrefs, { merge: true });

  await db.collection("unsubscribe_tokens").doc(unsubscribeToken).set({
    uid,
    email: userEmail,
    createdAt: new Date().toISOString()
  });

  return newPrefs;
}

export async function processUnsubscribe(token: string, options: { jobAlerts?: boolean; promotionalEmails?: boolean; weeklyDigest?: boolean; unsubscribeAll?: boolean }) {
  const db = getFirestoreDb();
  if (!db || !db.collection) return { success: false, error: "Database unavailable" };

  try {
    const tokenSnap = await db.collection("unsubscribe_tokens").doc(token).get();
    if (!tokenSnap.exists) {
      return { success: false, error: "Invalid or expired unsubscribe token." };
    }

    const uid = tokenSnap.data()?.uid;
    if (!uid) return { success: false, error: "User ID not associated with token" };

    const prefRef = db.collection("users").doc(uid).collection("email_preferences").doc("settings");
    let updates: any = { updatedAt: new Date().toISOString() };

    if (options.unsubscribeAll) {
      updates.jobAlerts = false;
      updates.promotionalEmails = false;
      updates.weeklyDigest = false;
    } else {
      if (typeof options.jobAlerts === "boolean") updates.jobAlerts = options.jobAlerts;
      if (typeof options.promotionalEmails === "boolean") updates.promotionalEmails = options.promotionalEmails;
      if (typeof options.weeklyDigest === "boolean") updates.weeklyDigest = options.weeklyDigest;
    }

    await prefRef.set(updates, { merge: true });
    return { success: true, message: "Email preferences updated successfully." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
