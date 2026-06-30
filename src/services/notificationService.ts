import { db } from "../firebase";
import { 
  collection, doc, getDoc, setDoc, getDocs, updateDoc, 
  deleteDoc, query, where, orderBy, addDoc 
} from "firebase/firestore";

// Notification Mediums
export type NotificationMedium = "inApp" | "email" | "push" | "sms" | "whatsapp";

// Candidate Events
export type CandidateEvent =
  | "REGISTRATION_SUCCESSFUL"
  | "RESUME_UPLOADED"
  | "RESUME_ANALYSIS_COMPLETED"
  | "AI_INTERVIEW_SCHEDULED"
  | "AI_INTERVIEW_COMPLETED"
  | "NEW_JOB_MATCH"
  | "APPLICATION_SUBMITTED"
  | "INTERVIEW_INVITATION"
  | "OFFER_LETTER_RECEIVED"
  | "PROFILE_INCOMPLETE_REMINDER";

// Consultancy Events
export type ConsultancyEvent =
  | "NEW_CANDIDATE_MATCH"
  | "JOB_APPLICATION_RECEIVED"
  | "INTERVIEW_REMINDER"
  | "SUBSCRIPTION_EXPIRY"
  | "PLAN_UPGRADED"
  | "PAYMENT_SUCCESSFUL"
  | "PLACEMENT_COMPLETED";

// Employer Events
export type EmployerEvent =
  | "NEW_APPLICATION"
  | "SHORTLISTED_CANDIDATE"
  | "INTERVIEW_REMINDER"
  | "OFFER_ACCEPTED"
  | "SUBSCRIPTION_ALERTS";

// Admin Events
export type AdminEvent =
  | "PENDING_APPROVALS"
  | "PAYMENT_FAILURES"
  | "SUPPORT_TICKETS"
  | "SYSTEM_ALERTS"
  | "SECURITY_ALERTS";

export type NotificationEvent = CandidateEvent | ConsultancyEvent | EmployerEvent | AdminEvent | "SYSTEM_BROADCAST";

// Preference Schema
export interface NotificationPreferences {
  userId: string;
  preferences: {
    [key in NotificationEvent]?: {
      inApp: boolean;
      email: boolean;
      push: boolean;
      sms: boolean;
      whatsapp: boolean;
    };
  };
}

// In-App Notification Record
export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  event: NotificationEvent;
  read: boolean;
  archived: boolean;
  createdAt: string;
  link?: string;
  type: "info" | "warning" | "success" | "alert";
}

// Message Log Record
export interface MessageLog {
  id: string;
  userId: string;
  event: NotificationEvent;
  medium: NotificationMedium;
  recipient: string; // Email, phone, FCM token, or user ID
  subject?: string;
  body: string;
  status: "success" | "failed";
  error?: string;
  createdAt: string;
}

// Email Template Model
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "Welcome" | "Password Reset" | "Interview Invite" | "Application Confirmation" | "Offer Letter" | "Payment Receipt" | "Subscription Reminder";
  variables: string[];
}

// Baseline defaults for preferences
const DEFAULT_PREFERENCE_CHANNELS = {
  inApp: true,
  email: true,
  push: true,
  sms: false,
  whatsapp: false,
};

// Default Email Templates mapping
export const DEFAULT_EMAIL_TEMPLATES: Record<string, Omit<EmailTemplate, "id">> = {
  Welcome: {
    name: "Welcome",
    category: "Welcome",
    subject: "Welcome to AIJobs, {{userName}}! 🚀",
    body: `Hi {{userName}},\n\nWelcome to AIJobs! We are thrilled to help you scale your recruitment or career journey with next-generation AI interfaces.\n\nBest Regards,\nThe AIJobs Team`,
    variables: ["userName"],
  },
  "Password Reset": {
    name: "Password Reset",
    category: "Password Reset",
    subject: "Reset your AIJobs account password",
    body: `Hi {{userName}},\n\nYou requested a password reset for your AIJobs account. Click the link below to set a new password:\n\n{{resetLink}}\n\nIf you did not request this, please disregard this email safely.\n\nBest,\nAIJobs Security Desk`,
    variables: ["userName", "resetLink"],
  },
  "Interview Invite": {
    name: "Interview Invite",
    category: "Interview Invite",
    subject: "AI Interview Scheduled: {{jobTitle}} at {{companyName}}",
    body: `Hi {{userName}},\n\nCongratulations! You have been invited to participate in an AI-powered automated interview arena for the {{jobTitle}} role with {{companyName}}.\n\nDate & Time: {{interviewTime}}\nAccess Arena Link: {{interviewLink}}\n\nGet ready to put your best foot forward!\n\nBest,\nAIJobs System`,
    variables: ["userName", "jobTitle", "companyName", "interviewTime", "interviewLink"],
  },
  "Application Confirmation": {
    name: "Application Confirmation",
    category: "Application Confirmation",
    subject: "Application Submitted: {{jobTitle}} at {{companyName}}",
    body: `Hi {{userName}},\n\nYour application has been received successfully for the {{jobTitle}} role with {{companyName}}. Your resume was assessed with an ATS compliance rating of {{resumeScore}}%.\n\nWe will notify you immediately if the recruiting team shortlists your profile.\n\nBest,\nAIJobs Logistics`,
    variables: ["userName", "jobTitle", "companyName", "resumeScore"],
  },
  "Offer Letter": {
    name: "Offer Letter",
    category: "Offer Letter",
    subject: "Congratulations! Job Offer from {{companyName}}",
    body: `Dear {{userName}},\n\nWe are ecstatic to offer you the position of {{jobTitle}} with {{companyName}}! \n\nPlease view your official offer letter details and credentials at the link below:\n\n{{offerLink}}\n\nWe look forward to welcoming you onboard.\n\nWarmest regards,\n{{companyName}} HR Services`,
    variables: ["userName", "jobTitle", "companyName", "offerLink"],
  },
  "Payment Receipt": {
    name: "Payment Receipt",
    category: "Payment Receipt",
    subject: "AIJobs Invoice receipt: {{invoiceNumber}}",
    body: `Hi {{userName}},\n\nThank you for upgrading your plan! Here is your payment receipt detail:\n\nInvoice Number: {{invoiceNumber}}\nAmount Paid: {{amount}}\nSubscription Active Status: {{status}}\n\nThank you for choosing AIJobs.\n\nBest regards,\nAIJobs Financial Office`,
    variables: ["userName", "invoiceNumber", "amount", "status"],
  },
  "Subscription Reminder": {
    name: "Subscription Reminder",
    category: "Subscription Reminder",
    subject: "Alert: Your AIJobs subscription expires in {{daysLeft}} days",
    body: `Hi {{userName}},\n\nYour subscription plan '{{planName}}' is expiring shortly. Please renew to keep your CRM pipelines, AI resume matching, and interview assessments active.\n\nDays left: {{daysLeft}}\nRenew Link: {{renewLink}}\n\nBest,\nAIJobs billing division`,
    variables: ["userName", "planName", "daysLeft", "renewLink"],
  },
};

// HELPER: Interpolate simple template variables
export function renderEmailTemplate(body: string, variables: Record<string, string>): string {
  let rendered = body;
  for (const [key, val] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), val || "");
  }
  return rendered;
}

export const NotificationService = {
  /**
   * Seed default templates if they don't exist
   */
  async ensureEmailTemplates(isAdmin?: boolean) {
    if (!isAdmin) {
      return;
    }
    try {
      const snap = await getDocs(collection(db, "email_templates"));
      if (snap.empty) {
        for (const [key, templ] of Object.entries(DEFAULT_EMAIL_TEMPLATES)) {
          const templId = `tmpl_${key.toLowerCase().replace(/\s+/g, "_")}`;
          await setDoc(doc(db, "email_templates", templId), {
            id: templId,
            ...templ,
          });
        }
        console.log("Seeded default email templates successfully.");
      }
    } catch (err) {
      console.error("Error seeding email templates:", err);
    }
  },

  /**
   * Fetch preferences or generate fallback defaults
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const prefDoc = await getDoc(doc(db, "notification_preferences", userId));
      if (prefDoc.exists()) {
        return prefDoc.data() as NotificationPreferences;
      }
      
      // If doesn't exist, build standard fallback preferences
      const fallback: NotificationPreferences = {
        userId,
        preferences: {},
      };
      return fallback;
    } catch (err) {
      console.error("Error fetching preferences:", err);
      return { userId, preferences: {} };
    }
  },

  /**
   * Update preferences in Firestore
   */
  async saveUserPreferences(userId: string, prefs: NotificationPreferences["preferences"]) {
    await setDoc(doc(db, "notification_preferences", userId), {
      userId,
      preferences: prefs,
    });
  },

  /**
   * Dispatch a multi-channel notification based on user preferences & template keys
   */
  async triggerEvent(params: {
    userId: string;
    event: NotificationEvent;
    title: string;
    message: string;
    recipientEmail?: string;
    recipientPhone?: string;
    templateName?: keyof typeof DEFAULT_EMAIL_TEMPLATES;
    templateVars?: Record<string, string>;
    link?: string;
    type?: NotificationItem["type"];
  }) {
    const {
      userId, event, title, message, recipientEmail, recipientPhone,
      templateName, templateVars = {}, link, type = "info"
    } = params;

    // 1. Get user preferences
    const prefRecord = await this.getUserPreferences(userId);
    const pref = prefRecord.preferences[event] || DEFAULT_PREFERENCE_CHANNELS;

    const timestamp = new Date().toISOString();

    // -- In-App notification
    if (pref.inApp) {
      try {
        const notifId = `notif_${Math.random().toString(36).substr(2, 9)}`;
        const inAppItem: NotificationItem = {
          id: notifId,
          userId,
          title,
          message,
          event,
          read: false,
          archived: false,
          createdAt: timestamp,
          link,
          type
        };
        await setDoc(doc(db, "notifications", notifId), inAppItem);
        
        await this.logMessage({
          userId, event, medium: "inApp", recipient: userId,
          body: message, status: "success"
        });
      } catch (err: any) {
        await this.logMessage({
          userId, event, medium: "inApp", recipient: userId,
          body: message, status: "failed", error: err.message
        });
      }
    }

    // -- Email notification
    if (pref.email && (recipientEmail || templateVars.userEmail)) {
      const email = recipientEmail || templateVars.userEmail || "user@aijobs.global";
      try {
        let subject = title;
        let body = message;

        // If template selected, try to load template
        if (templateName) {
          const templId = `tmpl_${String(templateName).toLowerCase().replace(/\s+/g, "_")}`;
          const tmplDoc = await getDoc(doc(db, "email_templates", templId));
          if (tmplDoc.exists()) {
            const data = tmplDoc.data();
            subject = renderEmailTemplate(data.subject, templateVars);
            body = renderEmailTemplate(data.body, templateVars);
          } else {
            // Fallback to static default mapping
            const fallbackTmpl = DEFAULT_EMAIL_TEMPLATES[templateName];
            if (fallbackTmpl) {
              subject = renderEmailTemplate(fallbackTmpl.subject, templateVars);
              body = renderEmailTemplate(fallbackTmpl.body, templateVars);
            }
          }
        }

        // Email abstraction layer
        console.log(`[SMTP EMAIL ABSTRACTION] Sent mail to ${email}. Subject: ${subject}`);

        await this.logMessage({
          userId, event, medium: "email", recipient: email,
          subject, body, status: "success"
        });
      } catch (err: any) {
        await this.logMessage({
          userId, event, medium: "email", recipient: email,
          body: message, status: "failed", error: err.message
        });
      }
    }

    // -- Push Notification (FCM simulation)
    if (pref.push) {
      try {
        const payload = JSON.stringify({ title, body: message, event, link });
        console.log(`[FCM PUSH NOTIFICATION ABSTRACTION] Dispatched FCM push payload to device token belonging to user ${userId}`);
        
        await this.logMessage({
          userId, event, medium: "push", recipient: `FCM_TOKEN_USER_${userId}`,
          body: payload, status: "success"
        });
      } catch (err: any) {
        await this.logMessage({
          userId, event, medium: "push", recipient: userId,
          body: message, status: "failed", error: err.message
        });
      }
    }

    // -- SMS Notification (abstraction)
    if (pref.sms && recipientPhone) {
      try {
        console.log(`[TWILIO SMS ABSTRACTION] Sending text alert to ${recipientPhone}: ${message}`);
        
        await this.logMessage({
          userId, event, medium: "sms", recipient: recipientPhone,
          body: message, status: "success"
        });
      } catch (err: any) {
        await this.logMessage({
          userId, event, medium: "sms", recipient: recipientPhone,
          body: message, status: "failed", error: err.message
        });
      }
    }

    // -- WhatsApp Notification (abstraction)
    if (pref.whatsapp && recipientPhone) {
      try {
        console.log(`[META WHATSAPP BUSINESS API ABSTRACTION] Sending WhatsApp campaign template to ${recipientPhone}: ${message}`);
        
        await this.logMessage({
          userId, event, medium: "whatsapp", recipient: recipientPhone,
          body: message, status: "success"
        });
      } catch (err: any) {
        await this.logMessage({
          userId, event, medium: "whatsapp", recipient: recipientPhone,
          body: message, status: "failed", error: err.message
        });
      }
    }
  },

  /**
   * Admin-driven broadcast to all matching role segments or globally
   */
  async broadcastNotification(params: {
    title: string;
    message: string;
    targetRole: "all" | "candidate" | "consultancy" | "employer" | "admin";
    sentBy: string;
    type?: NotificationItem["type"];
  }) {
    const { title, message, targetRole, sentBy, type = "info" } = params;
    const timestamp = new Date().toISOString();

    // Retrieve all users matching the role
    const usersSnap = await getDocs(collection(db, "users"));
    const matchingUserIds: string[] = [];
    
    usersSnap.forEach((doc) => {
      const u = doc.data();
      if (targetRole === "all" || u.role === targetRole) {
        matchingUserIds.push(doc.id);
      }
    });

    const triggerPromises = matchingUserIds.map(async (userId) => {
      await this.triggerEvent({
        userId,
        event: "SYSTEM_BROADCAST",
        title,
        message,
        type,
        templateVars: { userName: "User" }
      });
    });

    await Promise.all(triggerPromises);

    // Save broadcast record to "notifications" as a system broadcast log
    const notifId = `broadcast_${Math.random().toString(36).substr(2, 9)}`;
    await setDoc(doc(db, "notifications", notifId), {
      id: notifId,
      title,
      message,
      targetRole,
      type: "announcement",
      sentBy,
      createdAt: timestamp,
      deliveredCount: matchingUserIds.length,
      userId: "broadcast_history_log" // reserved to hide from normal users
    });

    return matchingUserIds.length;
  },

  /**
   * Create a message dispatch log
   */
  async logMessage(log: Omit<MessageLog, "id" | "createdAt">) {
    try {
      const logId = `msg_log_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, "message_logs", logId), {
        id: logId,
        ...log,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error logging message event:", err);
    }
  },

  /**
   * Retrieve notification log list for a user
   */
  async getUserNotifications(userId: string, filters?: { read?: boolean; archived?: boolean }): Promise<NotificationItem[]> {
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      const items: NotificationItem[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        let match = true;
        if (filters) {
          if (filters.read !== undefined && data.read !== filters.read) match = false;
          if (filters.archived !== undefined && data.archived !== filters.archived) match = false;
        }
        if (match) {
          items.push(data as NotificationItem);
        }
      });
      // Sort on client side
      items.sort((a, b) => {
        const t1 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const t2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return t2 - t1;
      });
      return items;
    } catch (err) {
      console.error("Error fetching notifications:", err);
      return [];
    }
  },

  /**
   * Retrieve all message logs (useful for admin overview)
   */
  async getAllMessageLogs(): Promise<MessageLog[]> {
    try {
      const q = query(collection(db, "message_logs"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const logs: MessageLog[] = [];
      snap.forEach((doc) => {
        logs.push(doc.data() as MessageLog);
      });
      return logs;
    } catch (err) {
      console.error("Error fetching message logs:", err);
      return [];
    }
  }
};
