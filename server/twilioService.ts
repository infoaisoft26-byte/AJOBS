import admin from "firebase-admin";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import twilio from "twilio";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin SDK
let firestoreDb: Firestore | null = null;
let firebaseAuth: admin.auth.Auth | null = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  let app;
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (!admin.apps.length) {
      app = admin.initializeApp({
        projectId: config.projectId,
      });
    } else {
      app = admin.apps[0];
    }
  } else {
    if (!admin.apps.length) {
      app = admin.initializeApp();
    } else {
      app = admin.apps[0];
    }
  }
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
  firestoreDb = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
  firebaseAuth = admin.auth();
  console.log("[TwilioService] Firebase Admin SDK initialized successfully.");
} catch (err) {
  console.error("[TwilioService] Failed to initialize Firebase Admin SDK:", err);
}

// Format number to India standard if simple 10 digit, or retain + if formatted
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  // If 10 digits, prepend +91 for India
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  // If 12 digits and starts with 91, prepend +
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }
  // Fallback to original with + if it starts with + or contains full format
  if (phone.startsWith("+")) {
    return phone;
  }
  return `+${cleaned}`;
}

export interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  verifyServiceSid?: string;
  messagingServiceSid?: string;
  whatsAppNumber?: string;
}

// Retrieve config from Env or Firestore securely
export async function getTwilioConfig(): Promise<TwilioConfig> {
  let accountSid = process.env.TWILIO_ACCOUNT_SID;
  let authToken = process.env.TWILIO_AUTH_TOKEN;
  let verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  let messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  let whatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";

  if (firestoreDb) {
    try {
      const docRef = firestoreDb.collection("system_settings").doc("global_config");
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (data?.twilio) {
          accountSid = accountSid || data.twilio.accountSid;
          authToken = authToken || data.twilio.authToken;
          verifyServiceSid = verifyServiceSid || data.twilio.verifyServiceSid;
          messagingServiceSid = messagingServiceSid || data.twilio.messagingServiceSid;
          whatsAppNumber = whatsAppNumber || data.twilio.whatsAppNumber;
        }
      }
    } catch (err) {
      console.warn("[TwilioService] Resilient Config Load: Could not retrieve settings from Firestore, using environment variables:", err);
    }
  }

  return {
    accountSid: accountSid || "",
    authToken: authToken || "",
    verifyServiceSid: verifyServiceSid || "",
    messagingServiceSid: messagingServiceSid || "",
    whatsAppNumber: whatsAppNumber || ""
  };
}

// Log SMS history in Firestore
export async function logSms(
  phone: string,
  message: string,
  status: "SENT" | "DELIVERED" | "FAILED" | "PENDING" | "SIMULATED",
  type: "OTP" | "Welcome" | "Registration" | "JobApplication" | "Interview" | "PasswordReset" | "Test",
  errorMsg?: string
) {
  if (!firestoreDb) return;
  try {
    const logId = "log_sms_" + Math.random().toString(36).substring(2, 11);
    const docData = {
      id: logId,
      phone,
      message,
      status,
      type,
      provider: "Twilio",
      createdAt: new Date().toISOString(),
      ...(errorMsg && { error: errorMsg })
    };
    await firestoreDb.collection("sms_logs").doc(logId).set(docData);
    console.log(`[TwilioService] SMS Log recorded under Firestore document ID: ${logId}`);
  } catch (err) {
    console.error("[TwilioService] Error writing to sms_logs:", err);
  }
}

// Initialize Twilio client dynamically to prevent startup crashes if SID is missing
function getTwilioClient(config: TwilioConfig) {
  if (!config.accountSid || !config.authToken) {
    throw new Error("Twilio Account SID or Auth Token is not configured.");
  }
  return twilio(config.accountSid, config.authToken);
}

// Check if Twilio is configured with accountSid, authToken, and verifyServiceSid as required in production mode
export async function isTwilioConfigured(): Promise<boolean> {
  const config = await getTwilioConfig();
  return !!(config.accountSid && config.authToken && config.verifyServiceSid);
}

/**
 * 1. Mobile OTP Login - Send Verification Code
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  console.log(`OTP request started for: ${formattedPhone}`);

  try {
    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      throw new Error("Twilio Verify Service is not configured. Real OTP delivery is currently offline.");
    }

    const client = getTwilioClient(config);
    let attempts = 0;
    const maxRetries = 2;
    let lastError: any = null;

    while (attempts <= maxRetries) {
      try {
        await client.verify.v2.services(config.verifyServiceSid).verifications.create({
          to: formattedPhone,
          channel: "sms"
        });
        console.log(`OTP sent successfully to: ${formattedPhone}`);
        await logSms(formattedPhone, "Verification Code triggered via Twilio Verify API", "SENT", "OTP");
        return { success: true, message: "Verification OTP dispatched to your mobile number." };
      } catch (err: any) {
        lastError = err;
        attempts++;
        console.warn(`[TwilioService] sendOTP attempt ${attempts} failed. Retrying...`, err);
        if (attempts <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }
    throw lastError || new Error("Failed to dispatch OTP after retries.");
  } catch (error: any) {
    console.error("[TwilioService] sendOTP error:", error);
    await logSms(formattedPhone, `Failed: ${error.message}`, "FAILED", "OTP", error.message);
    throw error;
  }
}

/**
 * Helper for resending OTP
 */
export async function resendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  console.log(`Resending OTP started for: ${phone}`);
  return sendOTP(phone);
}

/**
 * 1. Mobile OTP Login - Verify OTP Code & Authenticate / Create Firebase Profile
 */
export async function verifyOTP(
  phone: string,
  code: string,
  preferredRole: "candidate" | "employer" | "consultancy" = "candidate"
): Promise<{ success: boolean; message: string; customToken?: string; isNewUser?: boolean; userId?: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  console.log(`Verifying OTP code for: ${formattedPhone}`);

  try {
    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      throw new Error("Twilio Verify Service is not configured. Real OTP verification is offline.");
    }

    const client = getTwilioClient(config);
    const verificationCheck = await client.verify.v2.services(config.verifyServiceSid).verificationChecks.create({
      to: formattedPhone,
      code: code
    });

    const isValid = verificationCheck.status === "approved";

    if (!isValid) {
      console.log(`OTP verification failed for: ${formattedPhone}`);
      return { success: false, message: "Invalid or expired OTP verification code." };
    }

    console.log(`OTP verification success for: ${formattedPhone}`);
    await logSms(formattedPhone, "OTP verification approved successfully.", "DELIVERED", "OTP");

    // Perform User Creation / Login in Firebase Auth
    if (!firebaseAuth || !firestoreDb) {
      throw new Error("Firebase services are currently un-initialized on the server.");
    }

    let userRecord;
    let isNewUser = false;
    const isoDate = new Date().toISOString();

    try {
      userRecord = await firebaseAuth.getUserByPhoneNumber(formattedPhone);
      console.log(`[TwilioService] Found existing Firebase Auth user for phone ${formattedPhone}, UID: ${userRecord.uid}`);
    } catch (authErr: any) {
      if (authErr.code === "auth/user-not-found") {
        // Create brand new user in Firebase Auth
        isNewUser = true;
        userRecord = await firebaseAuth.createUser({
          phoneNumber: formattedPhone,
          displayName: `User ${formattedPhone.slice(-4)}`
        });
        console.log(`User auto-created in Firebase Auth: ${formattedPhone}, UID: ${userRecord.uid}`);
      } else {
        throw authErr;
      }
    }

    // Double-check or create document in Firestore `users` collection
    const userDocRef = firestoreDb.collection("users").doc(userRecord.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      isNewUser = true;
      const initialProfile = {
        uid: userRecord.uid,
        phone: formattedPhone,
        name: `User ${formattedPhone.slice(-4)}`,
        email: `otp_${userRecord.uid.substring(0, 8)}@aijobs.local`,
        role: preferredRole || "candidate",
        status: "active",
        createdAt: isoDate,
        lastLogin: isoDate,
        profileCompleted: false,
        resumeURL: ""
      };
      await userDocRef.set(initialProfile);
      console.log(`User auto-created in Firestore users collection: ${userRecord.uid}`);

      // Create candidates collection document too if role is candidate
      if (preferredRole === "candidate") {
        await firestoreDb.collection("candidates").doc(userRecord.uid).set({
          userId: userRecord.uid,
          uid: userRecord.uid,
          fullName: initialProfile.name,
          name: initialProfile.name,
          email: initialProfile.email,
          phone: formattedPhone,
          skills: [],
          totalExperience: "",
          currentCompany: "",
          currentDesignation: "",
          education: "",
          city: "",
          state: "",
          linkedin: "",
          github: "",
          resumeUrl: "",
          resumeFileName: "",
          resumeUploadedAt: "",
          profileCompleted: false,
          profileComplete: false,
          profileSource: "phone_otp"
        });
        console.log(`Candidate profile document created for: ${userRecord.uid}`);
      }
    } else {
      // Update lastLogin for existing user
      await userDocRef.update({
        lastLogin: isoDate
      });
    }

    console.log(`User logged in successfully: ${formattedPhone} (UID: ${userRecord.uid})`);

    // Generate Firebase Custom Token
    const customToken = await firebaseAuth.createCustomToken(userRecord.uid);
    return {
      success: true,
      message: "Mobile identity authenticated successfully.",
      customToken,
      isNewUser,
      userId: userRecord.uid
    };

  } catch (error: any) {
    console.error("[TwilioService] verifyOTP error:", error);
    throw error;
  }
}

/**
 * Helper to dispatch standard SMS
 */
async function sendSmsMessage(phone: string, text: string, type: any): Promise<boolean> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  try {
    if (!config.accountSid || !config.authToken || !config.messagingServiceSid) {
      throw new Error("Twilio SMS messaging service is not fully configured (Account SID, Auth Token, or Messaging Service SID is missing).");
    }

    const client = getTwilioClient(config);
    let attempts = 0;
    const maxRetries = 2;
    let lastError: any = null;

    while (attempts <= maxRetries) {
      try {
        await client.messages.create({
          body: text,
          messagingServiceSid: config.messagingServiceSid,
          to: formattedPhone
        });
        await logSms(formattedPhone, text, "SENT", type);
        return true;
      } catch (err: any) {
        lastError = err;
        attempts++;
        console.warn(`[TwilioService] SMS dispatch attempt ${attempts} failed. Retrying...`, err);
        if (attempts <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts)); // exponential backoff
        }
      }
    }

    throw lastError || new Error("Failed to send SMS message after retries.");
  } catch (error: any) {
    console.error(`[TwilioService] sendSmsMessage error (${type}):`, error);
    await logSms(formattedPhone, `Failed: ${error.message}. Payload: ${text}`, "FAILED", type, error.message);
    return false;
  }
}

/**
 * 2. Candidate Registration - Send Welcome SMS
 */
export async function sendWelcomeSMS(phone: string, candidateName: string): Promise<boolean> {
  const message = `Welcome to AIJobs, ${candidateName}! Your profile has been created successfully. Explore live matches now.`;
  return sendSmsMessage(phone, message, "Welcome");
}

/**
 * 3. Recruiter Registration - Send Confirmation & Notify Admin
 */
export async function sendRecruiterConfirmationSMS(
  recruiterPhone: string,
  recruiterName: string,
  adminPhone?: string
): Promise<boolean> {
  const recMsg = `Hello ${recruiterName}, welcome to AIJobs Recruiters. Your employer profile has been registered and is pending approval.`;
  const recruiterSuccess = await sendSmsMessage(recruiterPhone, recMsg, "Registration");

  if (adminPhone) {
    const adminMsg = `[ADMIN NOTIFY] New Recruiter Registration: ${recruiterName} has registered with phone ${recruiterPhone}. Please review.`;
    await sendSmsMessage(adminPhone, adminMsg, "Registration");
  }

  return recruiterSuccess;
}

/**
 * 4. Job Application Notifications
 */
export async function sendJobApplicationSMS(
  candidatePhone: string,
  candidateName: string,
  recruiterPhone: string,
  recruiterName: string,
  jobTitle: string,
  companyName: string
): Promise<boolean> {
  // Notifying Candidate
  const candMsg = `Dear ${candidateName}, your application for "${jobTitle}" at ${companyName} has been received successfully. Best of luck!`;
  await sendSmsMessage(candidatePhone, candMsg, "JobApplication");

  // Notifying Recruiter
  const recMsg = `Hi ${recruiterName}, candidate ${candidateName} has applied for "${jobTitle}". Review their resume profile in AIJobs.`;
  await sendSmsMessage(recruiterPhone, recMsg, "JobApplication");

  return true;
}

/**
 * 5. Interview Scheduling Notifications
 */
export async function sendInterviewSchedulingSMS(
  candidatePhone: string,
  candidateName: string,
  dateStr: string,
  timeStr: string,
  jobTitle: string
): Promise<boolean> {
  const message = `Dear ${candidateName}, your AI Interview for "${jobTitle}" has been scheduled on ${dateStr} at ${timeStr}. Be prepared!`;
  return sendSmsMessage(candidatePhone, message, "Interview");
}

/**
 * 5b. Reminder scheduling simulation
 */
export async function sendInterviewReminderSMS(
  candidatePhone: string,
  candidateName: string,
  dateStr: string,
  timeStr: string,
  jobTitle: string
): Promise<boolean> {
  const message = `[REMINDER] Dear ${candidateName}, your interview for "${jobTitle}" starts in 24 hours (Scheduled: ${dateStr} at ${timeStr}).`;
  return sendSmsMessage(candidatePhone, message, "Interview");
}

/**
 * 6. Password Reset Verification
 */
export async function sendPasswordResetOTP(phone: string): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  try {
    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      throw new Error("Twilio Verify Service is not fully configured (Account SID, Auth Token, or Verify Service SID is missing). Real OTP delivery is offline.");
    }

    const client = getTwilioClient(config);
    await client.verify.v2.services(config.verifyServiceSid).verifications.create({
      to: formattedPhone,
      channel: "sms"
    });

    await logSms(formattedPhone, "Password Reset OTP triggered via Twilio Verify API", "SENT", "PasswordReset");
    return { success: true, message: "Password reset verification code dispatched." };
  } catch (error: any) {
    console.error("[TwilioService] sendPasswordResetOTP error:", error);
    await logSms(formattedPhone, `Failed: ${error.message}`, "FAILED", "PasswordReset", error.message);
    throw error;
  }
}

export async function verifyPasswordResetOTP(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  try {
    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      throw new Error("Twilio Verify Service is not fully configured. Real OTP verification is offline.");
    }

    const client = getTwilioClient(config);
    const verificationCheck = await client.verify.v2.services(config.verifyServiceSid).verificationChecks.create({
      to: formattedPhone,
      code: code
    });
    
    const isValid = verificationCheck.status === "approved";

    if (!isValid) {
      return { success: false, message: "Invalid or expired password reset verification OTP." };
    }

    await logSms(formattedPhone, "Password reset OTP approved.", "DELIVERED", "PasswordReset");
    return { success: true, message: "Password reset code verified successfully." };
  } catch (error: any) {
    console.error("[TwilioService] verifyPasswordResetOTP error:", error);
    throw error;
  }
}

/**
 * 7. Test SMS dispatch
 */
export async function testSMS(phone: string, message: string): Promise<boolean> {
  return sendSmsMessage(phone, message, "Test");
}
