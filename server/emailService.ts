import nodemailer from "nodemailer";
import crypto from "crypto";
import { getFirestoreDb } from "./firestoreHelper";
import { EMAIL_TEMPLATES, EmailTemplateData } from "./emailTemplates";

const getSenderAddress = () => {
  const fromName = process.env.EMAIL_FROM_NAME || "AIJobs";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || "aijobs1401@gmail.com";
  return `"${fromName}" <${fromAddress}>`;
};

const REPLY_TO = process.env.EMAIL_FROM_ADDRESS || "aijobs1401@gmail.com";
const APP_URL = process.env.VITE_SITE_URL || process.env.APP_URL || "https://aijobs.in";

let transporter: nodemailer.Transporter | null = null;
const inMemoryEmailLogs: Map<string, any> = new Map();

export function getEmailLogs() {
  return Array.from(inMemoryEmailLogs.values());
}

function getTransporter(): nodemailer.Transporter | null {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const user = process.env.SMTP_USER || process.env.EMAIL_FROM_ADDRESS || "aijobs1401@gmail.com";
    const pass = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (user && pass) {
      try {
        transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false }
        });
        console.log(`[EmailService] Nodemailer SMTP initialized with host: ${host}, user: ${user}`);
      } catch (err) {
        console.error("[EmailService] Failed to initialize Nodemailer transporter:", err);
      }
    } else {
      console.warn("[EmailService] SMTP credentials missing (SMTP_USER/SMTP_APP_PASSWORD not set). Will fallback to Firestore mail queue.");
    }
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  templateName: string;
  data: EmailTemplateData;
  category?: 'transactional' | 'job_alert' | 'marketing' | 'weekly_digest';
  userId?: string;
  jobId?: string;
  campaignId?: string;
}

/**
 * Ensures user email preferences exist at users/{uid}/email_preferences/settings
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

  // Store token mapping in root collection for easy token lookup
  await db.collection("unsubscribe_tokens").doc(unsubscribeToken).set({
    uid,
    email: userEmail,
    createdAt: new Date().toISOString()
  });

  return newPrefs;
}

/**
 * Dispatch Email via Nodemailer (if configured) AND store in Firestore 'mail' collection for Firebase Trigger Email Extension.
 */
export async function dispatchEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, templateName, data, category = 'transactional', userId, jobId, campaignId } = options;

  const templateFn = EMAIL_TEMPLATES[templateName];
  if (!templateFn) {
    return { success: false, error: `Invalid email template name: ${templateName}` };
  }

  // Inject default appUrl and recipient data
  const templateData: EmailTemplateData = {
    ...data,
    email: to,
    appUrl: APP_URL
  };

  const rendered = templateFn(templateData);
  const db = getFirestoreDb();

  let sentViaSmtp = false;
  let messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Try sending via Nodemailer SMTP if transporter exists
  const smtpTransporter = getTransporter();
  if (smtpTransporter) {
    try {
      const mailHeader: any = {
        from: getSenderAddress(),
        to,
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
      messageId = info.messageId || messageId;
      sentViaSmtp = true;
      console.log(`[EmailService] SMTP Email sent successfully to ${to} [Template: ${templateName}]`);
    } catch (smtpErr: any) {
      console.warn(`[EmailService] SMTP send warning (fallback to Firestore trigger):`, smtpErr.message);
    }
  }

  // 2. Always write to Firestore 'mail' collection (Firebase Trigger Email Extension)
  if (db && db.collection) {
    try {
      const mailDoc = {
        to: [to],
        message: {
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          replyTo: REPLY_TO
        },
        template: {
          name: templateName,
          data: templateData
        },
        category,
        userId: userId || "anonymous",
        sentViaSmtp,
        createdAt: new Date().toISOString()
      };

      await db.collection("mail").add(mailDoc);
      console.log(`[EmailService] Document queued in Firestore 'mail' collection for ${to}`);
    } catch (fsErr: any) {
      console.error(`[EmailService] Error writing to Firestore 'mail' collection:`, fsErr.message);
    }

    // 3. Log to message_logs
    try {
      await db.collection("message_logs").add({
        userId: userId || "anonymous",
        event: templateName,
        medium: "email",
        recipient: to,
        subject: rendered.subject,
        category,
        status: sentViaSmtp ? "SENT_SMTP" : "QUEUED_FIRESTORE",
        createdAt: new Date().toISOString()
      });
    } catch (logErr) {
      // Non-blocking log error
    }
  }

  return { success: true, messageId };
}

/**
 * Sends Candidate Welcome Email via Gmail Nodemailer SMTP and logs delivery status to Firestore email_logs/{emailId}
 */
export async function sendCandidateWelcomeEmail(
  candidateEmail: string,
  candidateName: string = "Candidate",
  userId?: string
): Promise<{ success: boolean; emailId: string; error?: string }> {
  const recipient = (candidateEmail || "").trim();
  const subject = "Welcome to AIJobs – Registration Successful";
  const emailId = `wel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  if (!recipient) {
    const error = "Missing candidate email address";
    console.error(`[Welcome Email] Failed: empty recipient email`);
    return { success: false, emailId, error };
  }

  // Requirement 11: Server log: [Welcome Email] Sending to:
  console.log(`[Welcome Email] Sending to: ${recipient}`);

  let sentStatus: "sent" | "failed" = "failed";
  let errorMessage: string | null = null;

  try {
    const dispatchRes = await dispatchEmail({
      to: recipient,
      templateName: "candidate-registration",
      data: {
        candidateName: candidateName || "Candidate",
        email: recipient,
        customSubject: subject
      },
      category: "transactional",
      userId: userId || "anonymous"
    });

    if (dispatchRes.success) {
      sentStatus = "sent";
      // Requirement 11: Server log: [Welcome Email] Sent successfully:
      console.log(`[Welcome Email] Sent successfully: ${recipient}`);
    } else {
      sentStatus = "failed";
      errorMessage = dispatchRes.error || "Failed to dispatch email via Nodemailer/SMTP";
      // Requirement 11: Server log: [Welcome Email] Failed:
      console.error(`[Welcome Email] Failed: ${recipient} - ${errorMessage}`);
    }
  } catch (err: any) {
    sentStatus = "failed";
    errorMessage = err?.message || String(err);
    // Requirement 11: Server log: [Welcome Email] Failed:
    console.error(`[Welcome Email] Failed: ${recipient} - ${errorMessage}`);
  }

  const logRecord = {
    emailId,
    userId: userId || "anonymous",
    recipient,
    subject,
    template: "candidate_welcome",
    status: sentStatus,
    errorMessage: errorMessage || null,
    createdAt
  };

  inMemoryEmailLogs.set(emailId, logRecord);

  // Requirement 10: Save email delivery logs in Firestore: email_logs/{emailId}
  const db = getFirestoreDb();
  if (db && db.collection) {
    try {
      await db.collection("email_logs").doc(emailId).set(logRecord);
    } catch (logErr: any) {
      console.warn(`[Welcome Email] Notice: could not record email_logs doc: ${logErr.message}`);
    }
  }

  return {
    success: sentStatus === "sent",
    emailId,
    error: errorMessage || undefined
  };
}

/**
 * Checks if a candidate's email preferences match a target job posting.
 */
export function checkCandidateMatchesJob(prefs: any, job: any, isWeeklyDigest: boolean = false): boolean {
  if (!prefs) return false;

  // 1. Consent Check
  if (isWeeklyDigest) {
    if (!prefs.weeklyDigest) return false;
  } else {
    if (!prefs.jobAlerts) return false;
  }

  // Normalize job fields
  const jobTitle = (job.title || job.role || job.category || "").toLowerCase();
  const jobLocation = (job.location || "").toLowerCase();

  let jobSkills: string[] = [];
  if (Array.isArray(job.skills)) {
    jobSkills = job.skills.map((s: any) => String(s).toLowerCase());
  } else if (typeof job.skills === "string") {
    jobSkills = job.skills.split(",").map((s: string) => s.trim().toLowerCase());
  }
  if (Array.isArray(job.requiredSkills)) {
    const extra = job.requiredSkills.map((s: any) => String(s).toLowerCase());
    jobSkills.push(...extra);
  }

  // 2. Role matching
  const roles: string[] = prefs.preferredJobRoles || [];
  if (roles.length > 0) {
    const roleMatch = roles.some((role) => {
      const r = role.toLowerCase().trim();
      return r && (jobTitle.includes(r) || r.includes(jobTitle));
    });
    if (!roleMatch) return false;
  }

  // 3. Location matching
  const locations: string[] = prefs.preferredLocations || [];
  if (locations.length > 0) {
    const locMatch = locations.some((loc) => {
      const l = loc.toLowerCase().trim();
      if (!l) return false;
      if (jobLocation.includes("remote") || l.includes("remote")) return true;
      return jobLocation.includes(l) || l.includes(jobLocation);
    });
    if (!locMatch) return false;
  }

  // 4. Skills matching
  const skills: string[] = prefs.preferredSkills || [];
  if (skills.length > 0 && jobSkills.length > 0) {
    const skillMatch = skills.some((skill) => {
      const sk = skill.toLowerCase().trim();
      return sk && jobSkills.some((js) => js.includes(sk) || sk.includes(js));
    });
    if (!skillMatch) return false;
  }

  return true;
}

/**
 * Triggers job alerts for candidates who opted into jobAlerts and match job criteria
 */
export async function triggerJobAlertCampaign(jobId: string, jobData: any): Promise<{ queued: number; skipped: number; errors: number }> {
  const db = getFirestoreDb();
  if (!db || !db.collection) return { queued: 0, skipped: 0, errors: 0 };

  let queued = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const campaignId = `campaign_job_${jobId}_${Date.now()}`;
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (userData.role && userData.role !== "candidate" && userData.role !== "user") continue;

      const uid = userDoc.id;
      const userEmail = userData.email;
      if (!userEmail) continue;

      // Check candidate preferences
      const prefs = await getOrCreateUserEmailPreferences(uid, userEmail, false);
      if (!prefs || !prefs.jobAlerts) {
        skipped++;
        continue;
      }

      // Check preference matching
      if (!checkCandidateMatchesJob(prefs, jobData, false)) {
        skipped++;
        continue;
      }

      // Check duplicate delivery
      const existingDelivery = await db.collection("email_campaign_deliveries")
        .where("jobId", "==", jobId)
        .where("candidateId", "==", uid)
        .get();

      if (!existingDelivery.empty) {
        skipped++;
        continue;
      }

      const deliveryId = `del_${jobId}_${uid}`;
      const deliveryRef = db.collection("email_campaign_deliveries").doc(deliveryId);

      await deliveryRef.set({
        id: deliveryId,
        campaignId,
        jobId,
        candidateId: uid,
        email: userEmail,
        status: "PROCESSING",
        queuedAt: new Date().toISOString(),
        unsubscribeStatus: false
      });

      const jobUrl = `${APP_URL}/jobs/${jobData.slug || jobId}`;
      const res = await dispatchEmail({
        to: userEmail,
        templateName: "new-job-alert",
        data: {
          candidateName: userData.name || "Candidate",
          jobTitle: jobData.title || "Job Opportunity",
          companyName: jobData.companyName || jobData.hiringOrganizationName || "Partner Enterprise",
          location: jobData.location || "Remote / Pan-India",
          salary: jobData.salary || "Competitive Salary",
          jobUrl,
          unsubscribeToken: prefs.unsubscribeToken
        },
        category: "job_alert",
        userId: uid,
        jobId,
        campaignId
      });

      if (res.success) {
        queued++;
        await deliveryRef.update({
          status: "SUCCESS",
          sentAt: new Date().toISOString()
        });
      } else {
        errors++;
        await deliveryRef.update({
          status: "ERROR",
          failedAt: new Date().toISOString(),
          error: res.error || "Delivery failed"
        });
      }
    }
  } catch (err: any) {
    console.error("[EmailService] Error running job alert campaign:", err.message);
  }

  return { queued, skipped, errors };
}

/**
 * Triggers Weekly Job Digest for opted-in candidates based on matching preferences
 */
export async function runWeeklyJobDigest(): Promise<{ processed: number; sent: number; skipped: number }> {
  const db = getFirestoreDb();
  if (!db || !db.collection) return { processed: 0, sent: 0, skipped: 0 };

  let processed = 0;
  let sent = 0;
  let skipped = 0;

  try {
    // Fetch live jobs
    const jobsSnap = await db.collection("jobs").limit(20).get();
    const liveJobsData: any[] = [];

    jobsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      data.id = docSnap.id;
      if (["open", "published", "approved", "live"].includes((data.status || "").toLowerCase())) {
        liveJobsData.push(data);
      }
    });

    if (liveJobsData.length === 0) {
      console.log("[EmailService] Weekly digest skipped: No active live jobs available.");
      return { processed: 0, sent: 0, skipped: 0 };
    }

    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      processed++;
      const userData = userDoc.data();
      if (userData.role && userData.role !== "candidate" && userData.role !== "user") continue;

      const uid = userDoc.id;
      const userEmail = userData.email;

      if (!userEmail) continue;

      const prefs = await getOrCreateUserEmailPreferences(uid, userEmail, false);
      if (!prefs || !prefs.weeklyDigest) {
        skipped++;
        continue;
      }

      // Filter live jobs for candidate matching preferences
      const candidateMatchingJobs = liveJobsData
        .filter((j) => checkCandidateMatchesJob(prefs, j, true))
        .slice(0, 10);

      if (candidateMatchingJobs.length === 0) {
        skipped++;
        continue;
      }

      const formattedJobs = candidateMatchingJobs.map((j) => ({
        title: j.title || "Software Opportunity",
        company: j.companyName || j.hiringOrganizationName || "AIJobs Partner",
        location: j.location || "Remote / India",
        salary: j.salary || "As per industry standards",
        url: `${APP_URL}/jobs/${j.slug || j.id}`
      }));

      const res = await dispatchEmail({
        to: userEmail,
        templateName: "weekly-job-digest",
        data: {
          candidateName: userData.name || "Candidate",
          jobsList: formattedJobs,
          unsubscribeToken: prefs.unsubscribeToken
        },
        category: "weekly_digest",
        userId: uid
      });

      if (res.success) {
        sent++;
      }
    }
  } catch (err: any) {
    console.error("[EmailService] Error running weekly job digest:", err.message);
  }

  return { processed, sent, skipped };
}

/**
 * Handles Candidate Unsubscribe Action
 */
export async function processUnsubscribe(token: string, options: { jobAlerts?: boolean; promotionalEmails?: boolean; weeklyDigest?: boolean; unsubscribeAll?: boolean }) {
  const db = getFirestoreDb();
  if (!db || !db.collection) return { success: false, error: "Database unavailable" };

  try {
    // Look up token
    const tokenSnap = await db.collection("unsubscribe_tokens").doc(token).get();
    if (!tokenSnap.exists) {
      // Fallback: search preferences by token
      const usersSnap = await db.collection("users").get();
      let targetUid: string | null = null;

      for (const userDoc of usersSnap.docs) {
        const prefRef = db.collection("users").doc(userDoc.id).collection("email_preferences").doc("settings");
        const prefSnap = await prefRef.get();
        if (prefSnap.exists && prefSnap.data()?.unsubscribeToken === token) {
          targetUid = userDoc.id;
          break;
        }
      }

      if (!targetUid) {
        return { success: false, error: "Invalid or expired unsubscribe link token." };
      }

      return updatePreferencesDoc(targetUid, options);
    }

    const uid = tokenSnap.data()?.uid;
    if (!uid) return { success: false, error: "User ID not associated with token" };

    return updatePreferencesDoc(uid, options);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function updatePreferencesDoc(uid: string, options: { jobAlerts?: boolean; promotionalEmails?: boolean; weeklyDigest?: boolean; unsubscribeAll?: boolean }) {
  const db = getFirestoreDb();
  const prefRef = db.collection("users").doc(uid).collection("email_preferences").doc("settings");

  let updates: any = {
    updatedAt: new Date().toISOString()
  };

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
}
