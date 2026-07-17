import admin from "firebase-admin";
import twilio from "twilio";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin SDK
let firestoreDb: admin.firestore.Firestore | null = null;
let firebaseAuth: admin.auth.Auth | null = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: config.projectId,
      });
    }
  } else {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  }
  firestoreDb = admin.firestore();
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

// Check if Twilio is ready or if we should run in simulated high-fidelity mock mode (useful for immediate sandbox preview)
export async function isTwilioConfigured(): Promise<boolean> {
  const config = await getTwilioConfig();
  return !!(config.accountSid && config.authToken);
}

/**
 * 1. Mobile OTP Login - Send Verification Code
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string; simulated?: boolean }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  console.log(`[TwilioService] Initiating OTP send to ${formattedPhone}`);

  try {
    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      // High-Fidelity Simulator
      const msg = `Your OTP for AIJobs is 4518. Valid for 5 minutes. Do not share.`;
      console.log(`[TwilioService] TWILIO SIMULATOR: Sending SMS to ${formattedPhone}: "${msg}"`);
      await logSms(formattedPhone, msg, "SIMULATED", "OTP");
      return {
        success: true,
        message: "OTP sent successfully (Simulated sandbox code: 4518)",
        simulated: true
      };
    }

    const client = getTwilioClient(config);
    await client.verify.v2.services(config.verifyServiceSid).verifications.create({
      to: formattedPhone,
      channel: "sms"
    });

    await logSms(formattedPhone, "Verification Code triggered via Twilio Verify API", "SENT", "OTP");
    return { success: true, message: "Verification OTP dispatched to your mobile number." };
  } catch (error: any) {
    console.error("[TwilioService] sendOTP error:", error);
    await logSms(formattedPhone, `Failed: ${error.message}`, "FAILED", "OTP", error.message);
    throw error;
  }
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

  console.log(`[TwilioService] Verifying OTP code for ${formattedPhone}`);

  try {
    let isValid = false;
    let isSimulated = false;

    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      // Mock validation
      if (code === "4518" || code === "123456" || code === "111111") {
        isValid = true;
        isSimulated = true;
      } else {
        return { success: false, message: "Invalid OTP code entered. Please try again." };
      }
    } else {
      const client = getTwilioClient(config);
      const verificationCheck = await client.verify.v2.services(config.verifyServiceSid).verificationChecks.create({
        to: formattedPhone,
        code: code
      });
      isValid = verificationCheck.status === "approved";
    }

    if (!isValid) {
      return { success: false, message: "Invalid or expired OTP verification code." };
    }

    await logSms(formattedPhone, "OTP verification approved successfully.", isSimulated ? "SIMULATED" : "DELIVERED", "OTP");

    // Perform User Creation / Login in Firebase Auth
    if (!firebaseAuth || !firestoreDb) {
      throw new Error("Firebase services are currently un-initialized on the server.");
    }

    let userRecord;
    let isNewUser = false;

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
        console.log(`[TwilioService] Created new Firebase Auth user for phone ${formattedPhone}, UID: ${userRecord.uid}`);
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
        email: `otp_${userRecord.uid.substring(0, 8)}@aijobs.local`,
        name: `User ${formattedPhone.slice(-4)}`,
        role: preferredRole,
        createdAt: new Date().toISOString(),
        isPhoneVerified: true
      };
      await userDocRef.set(initialProfile);

      // Create a specific matching collection record
      if (preferredRole === "candidate") {
        await firestoreDb.collection("candidate_profiles").doc(userRecord.uid).set({
          uid: userRecord.uid,
          name: initialProfile.name,
          phone: formattedPhone,
          email: initialProfile.email,
          resumeScore: 70,
          aiInterviewScore: 0,
          createdAt: new Date().toISOString()
        });
      }
    }

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
      console.log(`[TwilioService] TWILIO SIMULATOR: Dispatch SMS to ${formattedPhone}: "${text}"`);
      await logSms(formattedPhone, text, "SIMULATED", type);
      return true;
    }

    const client = getTwilioClient(config);
    await client.messages.create({
      body: text,
      messagingServiceSid: config.messagingServiceSid,
      to: formattedPhone
    });

    await logSms(formattedPhone, text, "SENT", type);
    return true;
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
export async function sendPasswordResetOTP(phone: string): Promise<{ success: boolean; message: string; simulated?: boolean }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  try {
    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      const msg = `Your Password Reset OTP for AIJobs is 9901. Valid for 5 minutes.`;
      console.log(`[TwilioService] TWILIO SIMULATOR: Sending Password Reset SMS to ${formattedPhone}: "${msg}"`);
      await logSms(formattedPhone, msg, "SIMULATED", "PasswordReset");
      return {
        success: true,
        message: "Password reset OTP sent successfully (Simulated code: 9901)",
        simulated: true
      };
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
    let isValid = false;

    if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
      if (code === "9901" || code === "123456" || code === "111111") {
        isValid = true;
      }
    } else {
      const client = getTwilioClient(config);
      const verificationCheck = await client.verify.v2.services(config.verifyServiceSid).verificationChecks.create({
        to: formattedPhone,
        code: code
      });
      isValid = verificationCheck.status === "approved";
    }

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
