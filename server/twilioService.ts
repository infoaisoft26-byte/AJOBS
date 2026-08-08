import twilio from "twilio";
import { getFirestoreDb, getFirebaseAuth } from "./firestoreHelper.js";

// Initialize Firebase DB and Auth
let firestoreDb: any = null;
let firebaseAuth: any = null;

try {
  firestoreDb = getFirestoreDb();
  firebaseAuth = getFirebaseAuth();
  console.log("[TwilioService] Firebase DB and Auth initialized successfully.");
} catch (err) {
  console.error("[TwilioService] Failed to initialize Firebase DB/Auth:", err);
}

// Format phone number to E.164 (India default +91 for 10 digits)
export function formatPhoneNumber(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) {
    throw new Error("Phone number is required.");
  }

  if (raw.startsWith("+")) {
    const cleaned = raw.substring(1).replace(/\D/g, "");
    if (!cleaned) throw new Error("Invalid phone number format.");
    return `+${cleaned}`;
  }

  const cleaned = raw.replace(/\D/g, "");
  if (!cleaned) throw new Error("Invalid phone number format.");

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

export interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  verifyServiceSid?: string;
  messagingServiceSid?: string;
  whatsAppNumber?: string;
}

// Memory cache for sent idempotent keys to prevent duplicate notifications
const sentIdempotencyKeys = new Set<string>();

// Retrieve config from Env or Firestore securely
export async function getTwilioConfig(): Promise<TwilioConfig> {
  let accountSid = process.env.TWILIO_ACCOUNT_SID;
  let authToken = process.env.TWILIO_AUTH_TOKEN;
  let phoneNumber = process.env.TWILIO_PHONE_NUMBER;
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
          phoneNumber = phoneNumber || data.twilio.phoneNumber;
          verifyServiceSid = verifyServiceSid || data.twilio.verifyServiceSid;
          messagingServiceSid = messagingServiceSid || data.twilio.messagingServiceSid;
          whatsAppNumber = whatsAppNumber || data.twilio.whatsAppNumber;
        }
      }
    } catch (err: any) {
      // Resilient fallback to env vars
    }
  }

  let finalAccountSid = (accountSid || "").trim();
  let finalAuthToken = (authToken || "").trim();
  let finalPhoneNumber = (phoneNumber || "").trim();
  let finalMessagingServiceSid = (messagingServiceSid || "").trim();
  let finalVerifyServiceSid = (verifyServiceSid || "").trim();

  // CRITICAL FIX FOR INVALID MESSAGING SERVICE SID:
  // If messagingServiceSid is set but does NOT start with 'MG' (e.g. +16055664993 phone number mistakenly placed here),
  // move it to phoneNumber if phoneNumber is empty, and clear messagingServiceSid.
  if (finalMessagingServiceSid && !finalMessagingServiceSid.toUpperCase().startsWith("MG")) {
    console.warn(`[TwilioService] Warning: TWILIO_MESSAGING_SERVICE_SID ("${finalMessagingServiceSid}") does not start with "MG".`);
    if (!finalPhoneNumber && (finalMessagingServiceSid.startsWith("+") || /^\d+$/.test(finalMessagingServiceSid))) {
      console.warn(`[TwilioService] Reassigning "${finalMessagingServiceSid}" as TWILIO_PHONE_NUMBER.`);
      finalPhoneNumber = finalMessagingServiceSid;
    }
    finalMessagingServiceSid = "";
  }

  // Validate Account SID format
  if (finalAccountSid && !finalAccountSid.toUpperCase().startsWith("AC")) {
    console.warn(`[TwilioService] Warning: TWILIO_ACCOUNT_SID does not start with "AC".`);
  }

  // Validate Verify Service SID format
  if (finalVerifyServiceSid && !finalVerifyServiceSid.toUpperCase().startsWith("VA")) {
    console.warn(`[TwilioService] Warning: TWILIO_VERIFY_SERVICE_SID does not start with "VA".`);
  }

  return {
    accountSid: finalAccountSid,
    authToken: finalAuthToken,
    phoneNumber: finalPhoneNumber,
    verifyServiceSid: finalVerifyServiceSid,
    messagingServiceSid: finalMessagingServiceSid,
    whatsAppNumber: whatsAppNumber
  };
}

// Safe diagnostic configuration output
export async function getTwilioConfigDiagnostic() {
  const config = await getTwilioConfig();
  const mask = (str?: string) => {
    if (!str) return "Not Configured";
    if (str.length <= 8) return "Configured (********)";
    return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
  };

  return {
    configured: !!(config.accountSid && config.authToken),
    accountSidConfigured: !!config.accountSid,
    accountSidMasked: mask(config.accountSid),
    accountSidValid: config.accountSid?.toUpperCase().startsWith("AC") || false,
    authTokenConfigured: !!config.authToken,
    phoneNumberConfigured: !!config.phoneNumber,
    phoneNumberValue: config.phoneNumber || "Not Configured",
    messagingServiceConfigured: !!config.messagingServiceSid,
    messagingServiceSidValid: config.messagingServiceSid?.toUpperCase().startsWith("MG") || false,
    verifyServiceConfigured: !!config.verifyServiceSid,
    verifyServiceSidValid: config.verifyServiceSid?.toUpperCase().startsWith("VA") || false
  };
}

// Log SMS history in Firestore
export async function logSms(
  phone: string,
  message: string,
  status: "SENT" | "DELIVERED" | "FAILED" | "PENDING" | "QUEUED",
  type: string,
  errorMsg?: string,
  twilioMessageSid?: string
) {
  if (!firestoreDb) return;
  try {
    const logId = "log_sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const docData = {
      id: logId,
      phone,
      messagePreview: message.length > 200 ? message.substring(0, 200) + "..." : message,
      message,
      status,
      type,
      provider: "Twilio",
      twilioMessageSid: twilioMessageSid || null,
      createdAt: new Date().toISOString(),
      ...(errorMsg && { error: errorMsg, errorMessage: errorMsg })
    };
    await firestoreDb.collection("sms_logs").doc(logId).set(docData);
  } catch (err: any) {
    // Non-blocking log write failure
  }
}

function getTwilioClient(config: TwilioConfig) {
  if (!config.accountSid || !config.authToken) {
    throw new Error("Twilio Account SID or Auth Token is not configured.");
  }
  return twilio(config.accountSid, config.authToken);
}

export async function isTwilioConfigured(): Promise<boolean> {
  const config = await getTwilioConfig();
  return !!(config.accountSid && config.authToken && (config.messagingServiceSid || config.phoneNumber || config.verifyServiceSid));
}

/**
 * Generic send SMS function
 */
export async function sendSMS(
  recipient: string,
  body: string,
  type: string = "Standard",
  idempotencyKey?: string
): Promise<{ success: boolean; sid?: string; status?: string; error?: string }> {
  if (idempotencyKey) {
    if (sentIdempotencyKeys.has(idempotencyKey)) {
      console.log(`[TwilioService] Idempotent key "${idempotencyKey}" already processed. Skipping duplicate SMS.`);
      return { success: true, status: "skipped_duplicate" };
    }
  }

  let formattedPhone: string;
  try {
    formattedPhone = formatPhoneNumber(recipient);
  } catch (err: any) {
    return { success: false, error: err.message || "Invalid phone number." };
  }

  if (!body?.trim()) {
    return { success: false, error: "SMS body cannot be empty." };
  }

  const config = await getTwilioConfig();

  if (!config.accountSid || !config.authToken) {
    const errText = "Twilio credentials (Account SID / Auth Token) are not configured.";
    await logSms(formattedPhone, body, "FAILED", type, errText);
    return { success: false, error: errText };
  }

  try {
    const client = getTwilioClient(config);
    let messageResult: any;

    // MODE A: Messaging Service SID (must start with MG)
    if (config.messagingServiceSid && config.messagingServiceSid.toUpperCase().startsWith("MG")) {
      messageResult = await client.messages.create({
        to: formattedPhone,
        body,
        messagingServiceSid: config.messagingServiceSid
      });
    }
    // MODE B: Direct Sender Phone Number
    else if (config.phoneNumber) {
      messageResult = await client.messages.create({
        to: formattedPhone,
        body,
        from: config.phoneNumber
      });
    }
    else {
      const errText = "Neither a valid Twilio Messaging Service SID (starting with MG) nor a sender phone number (TWILIO_PHONE_NUMBER) is configured.";
      await logSms(formattedPhone, body, "FAILED", type, errText);
      return { success: false, error: errText };
    }

    if (idempotencyKey) {
      sentIdempotencyKeys.add(idempotencyKey);
    }

    const initialStatus = (messageResult.status || "queued").toUpperCase() as any;
    await logSms(formattedPhone, body, initialStatus === "FAILED" ? "FAILED" : "SENT", type, undefined, messageResult.sid);

    return {
      success: true,
      sid: messageResult.sid,
      status: messageResult.status
    };

  } catch (error: any) {
    let errMsg = error?.message || String(error);
    const code = error?.code;

    // Format common Twilio errors clearly
    if (code === 21608 || errMsg.includes("unverified")) {
      errMsg = "Twilio trial account restriction: Recipient phone number is not verified in your Twilio Console.";
    } else if (code === 21211 || errMsg.includes("Invalid 'To' Phone Number")) {
      errMsg = "Invalid recipient phone number format.";
    } else if (code === 21614 || errMsg.includes("Messaging Service")) {
      errMsg = "Twilio Messaging Service error: Please check your Messaging Service SID or Phone Number configuration.";
    } else if (code === 21408 || errMsg.includes("Permission to send an SMS has not been enabled")) {
      errMsg = "Twilio Geo Permissions error: SMS permissions for recipient country are disabled in Twilio Console.";
    }

    console.warn(`[TwilioService] sendSMS error (${type}):`, errMsg);
    await logSms(formattedPhone, body, "FAILED", type, errMsg);
    return { success: false, error: errMsg };
  }
}

// Wrapper alias for sendSMS
async function sendSmsMessage(phone: string, text: string, type: string, idempotencyKey?: string): Promise<boolean> {
  const result = await sendSMS(phone, text, type, idempotencyKey);
  return result.success;
}

/**
 * 1. Mobile OTP Login - Send Verification Code
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  console.log(`[TwilioService] OTP request started for: ${formattedPhone}`);

  if (!config.accountSid || !config.authToken || !config.verifyServiceSid || !config.verifyServiceSid.toUpperCase().startsWith("VA")) {
    return {
      success: false,
      message: "Twilio Verify Service (TWILIO_VERIFY_SERVICE_SID starting with VA) is not configured."
    };
  }

  try {
    const client = getTwilioClient(config);
    await client.verify.v2.services(config.verifyServiceSid).verifications.create({
      to: formattedPhone,
      channel: "sms"
    });

    console.log(`[TwilioService] OTP sent successfully to: ${formattedPhone}`);
    await logSms(formattedPhone, "Verification Code dispatched via Twilio Verify API", "SENT", "OTP");
    return { success: true, message: "Verification OTP dispatched to your mobile number." };
  } catch (error: any) {
    let errMsg = error?.message || String(error);
    if (error?.code === 21608 || errMsg.includes("unverified")) {
      errMsg = "Twilio trial account restriction: This phone number must be verified in Twilio Console.";
    }
    console.warn("[TwilioService] sendOTP error:", errMsg);
    await logSms(formattedPhone, `Failed: ${errMsg}`, "FAILED", "OTP", errMsg);
    throw new Error(errMsg);
  }
}

export async function resendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  return sendOTP(phone);
}

export async function verifyOTP(
  phone: string,
  code: string,
  preferredRole: "candidate" | "employer" | "consultancy" = "candidate"
): Promise<{ success: boolean; message: string; customToken?: string; isNewUser?: boolean; userId?: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  if (!config.accountSid || !config.authToken || !config.verifyServiceSid || !config.verifyServiceSid.toUpperCase().startsWith("VA")) {
    return { success: false, message: "Twilio Verify Service is not configured." };
  }

  try {
    const client = getTwilioClient(config);
    const verificationCheck = await client.verify.v2.services(config.verifyServiceSid).verificationChecks.create({
      to: formattedPhone,
      code: code
    });

    const isValid = verificationCheck.status === "approved";

    if (!isValid) {
      return { success: false, message: "Invalid or expired OTP verification code." };
    }

    await logSms(formattedPhone, "OTP verification approved successfully.", "DELIVERED", "OTP");

    if (!firebaseAuth || !firestoreDb) {
      throw new Error("Firebase services are currently un-initialized on the server.");
    }

    let userRecord;
    let isNewUser = false;
    const isoDate = new Date().toISOString();

    try {
      userRecord = await firebaseAuth.getUserByPhoneNumber(formattedPhone);
    } catch (authErr: any) {
      if (authErr.code === "auth/user-not-found") {
        isNewUser = true;
        userRecord = await firebaseAuth.createUser({
          phoneNumber: formattedPhone,
          displayName: `User ${formattedPhone.slice(-4)}`
        });
      } else {
        throw authErr;
      }
    }

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
      }
    } else {
      await userDocRef.update({
        lastLogin: isoDate
      });
    }

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
 * Candidate Welcome SMS
 */
export async function sendWelcomeSMS(phone: string, candidateName: string, userId?: string): Promise<boolean> {
  const key = userId ? `WELCOME:${userId}` : undefined;
  const message = `Welcome to AIJobs, ${candidateName}. Your registration is successful. Complete your profile and upload your resume to improve job matching. AIJobs never charges candidates for job applications or placement.`;
  return sendSmsMessage(phone, message, "Welcome", key);
}

/**
 * Recruiter Confirmation SMS
 */
export async function sendRecruiterConfirmationSMS(
  recruiterPhone: string,
  recruiterName: string,
  adminPhone?: string
): Promise<boolean> {
  const recMsg = `AIJobs: Your Recruiter registration has been received successfully, ${recruiterName}. Complete KYC and required onboarding steps to activate your account.`;
  const recruiterSuccess = await sendSmsMessage(recruiterPhone, recMsg, "Registration");

  if (adminPhone) {
    const adminMsg = `[ADMIN NOTIFY] New Recruiter Registration: ${recruiterName} (${recruiterPhone}). Please review in Admin Dashboard.`;
    await sendSmsMessage(adminPhone, adminMsg, "Registration");
  }

  return recruiterSuccess;
}

/**
 * Consultancy Confirmation SMS
 */
export async function sendConsultancyConfirmationSMS(
  consultancyPhone: string,
  consultancyName: string,
  adminPhone?: string
): Promise<boolean> {
  const consMsg = `AIJobs: Your Consultancy registration has been received, ${consultancyName}. Please complete KYC, agreement and required onboarding steps. Account activation is subject to verification.`;
  const consSuccess = await sendSmsMessage(consultancyPhone, consMsg, "Registration");

  if (adminPhone) {
    const adminMsg = `[ADMIN NOTIFY] New Consultancy Registration: ${consultancyName} (${consultancyPhone}). Please review in Admin Dashboard.`;
    await sendSmsMessage(adminPhone, adminMsg, "Registration");
  }

  return consSuccess;
}

/**
 * Job Application SMS
 */
export async function sendJobApplicationSMS(
  candidatePhone: string,
  candidateName: string,
  recruiterPhone: string,
  recruiterName: string,
  jobTitle: string,
  companyName: string,
  applicationId?: string
): Promise<boolean> {
  const candKey = applicationId ? `APPLICATION_CAND:${applicationId}` : undefined;
  const recKey = applicationId ? `APPLICATION_REC:${applicationId}` : undefined;

  const candMsg = `AIJobs: Your application for ${jobTitle} at ${companyName} has been submitted successfully. Track the latest status from your AIJobs dashboard.`;
  await sendSmsMessage(candidatePhone, candMsg, "JobApplication", candKey);

  const recMsg = `AIJobs: Candidate ${candidateName} has applied for "${jobTitle}". Review their application on your recruiter portal.`;
  await sendSmsMessage(recruiterPhone, recMsg, "JobApplication", recKey);

  return true;
}

/**
 * Interview Scheduling SMS
 */
export async function sendInterviewSchedulingSMS(
  candidatePhone: string,
  candidateName: string,
  dateStr: string,
  timeStr: string,
  jobTitle: string,
  interviewId?: string
): Promise<boolean> {
  const key = interviewId ? `INTERVIEW_SCHEDULE:${interviewId}` : undefined;
  const message = `AIJobs: Your interview for ${jobTitle} is scheduled on ${dateStr} at ${timeStr}. Please check your dashboard/email for complete details.`;
  return sendSmsMessage(candidatePhone, message, "Interview", key);
}

/**
 * Interview Reminder SMS
 */
export async function sendInterviewReminderSMS(
  candidatePhone: string,
  candidateName: string,
  dateStr: string,
  timeStr: string,
  jobTitle: string,
  interviewId?: string
): Promise<boolean> {
  const key = interviewId ? `INTERVIEW_REMINDER:${interviewId}:${dateStr}` : undefined;
  const message = `AIJobs reminder: Your ${jobTitle} interview is scheduled for ${timeStr} today. Please join on time and review the instructions in your dashboard.`;
  return sendSmsMessage(candidatePhone, message, "Interview", key);
}

/**
 * Password Reset OTP
 */
export async function sendPasswordResetOTP(phone: string): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const config = await getTwilioConfig();

  if (!config.accountSid || !config.authToken || !config.verifyServiceSid || !config.verifyServiceSid.toUpperCase().startsWith("VA")) {
    return { success: false, message: "Twilio Verify Service is not configured." };
  }

  try {
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

  if (!config.accountSid || !config.authToken || !config.verifyServiceSid || !config.verifyServiceSid.toUpperCase().startsWith("VA")) {
    return { success: false, message: "Twilio Verify Service is not configured." };
  }

  try {
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
 * KYC Link SMS
 */
export async function sendKYCLinkSMS(phone: string, name: string, link: string, expiry: string = "24 hours"): Promise<boolean> {
  const message = `AIJobs: Please complete your KYC verification using this secure link: ${link}. Link validity: ${expiry}.`;
  return sendSmsMessage(phone, message, "KYC");
}

export async function sendKYCReminderSMS(phone: string, name: string, link: string): Promise<boolean> {
  const message = `AIJobs Reminder: Hello ${name}, please complete your KYC verification using secure link: ${link}.`;
  return sendSmsMessage(phone, message, "KYC");
}

/**
 * Agreement Reminder SMS
 */
export async function sendAgreementReminderSMS(phone: string, name: string, link: string): Promise<boolean> {
  const message = `AIJobs Reminder: Hello ${name}, please review and accept your service agreement at ${link}.`;
  return sendSmsMessage(phone, message, "Agreement");
}

/**
 * Payment Confirmation SMS
 */
export async function sendPaymentConfirmationSMS(
  phone: string,
  name: string,
  amount: number | string,
  planName: string,
  transactionId: string
): Promise<boolean> {
  const key = `PAYMENT:${transactionId}`;
  const message = `AIJobs: We received your payment of ₹${amount} for ${planName}. Transaction ID: ${transactionId}. View your invoice in the dashboard.`;
  return sendSmsMessage(phone, message, "Payment", key);
}

/**
 * Account Activation SMS
 */
export async function sendAccountActivationSMS(phone: string, name: string, role: string): Promise<boolean> {
  const message = `AIJobs: Your ${role} account has been activated successfully. You can now sign in to access your authorized AIJobs services.`;
  return sendSmsMessage(phone, message, "AccountActivation");
}

/**
 * Test SMS
 */
export async function testSMS(phone: string, message: string): Promise<boolean> {
  return sendSmsMessage(phone, message, "Test");
}
