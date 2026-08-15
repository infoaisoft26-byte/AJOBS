import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getFirestoreDb } from "./firestoreHelper.js";
import { dispatchEmail } from "./emailService.js";

const router = Router();

// In-memory fallback store for OTP records
interface OtpRecord {
  email: string;
  name?: string;
  otpHash: string;
  expiresAtMs: number;
  expiresAt: string;
  attemptCount: number;
  sendAttempts: number;
  cooldownUntilMs?: number;
  windowStartedAtMs?: number;
  verified: boolean;
  used: boolean;
  createdAt: string;
  purpose: string;
  lastRequestedAtMs: number;
  lastRequestedAt: string;
}

const inMemoryOtpStore = new Map<string, OtpRecord>();

// Helper to hash OTP with salt
function hashOtp(otp: string, email: string): string {
  return crypto
    .createHash("sha256")
    .update(`${otp.trim()}:${email.trim().toLowerCase()}:aijobs_otp_salt_2026`)
    .digest("hex");
}

// ----------------------------------------------------------------------
// 1. POST /api/auth/candidate/send-email-otp
// Server-side rate limiter with 5-minute cooldown stored in Firestore
// ----------------------------------------------------------------------
router.post("/send-email-otp", async (req: Request, res: Response) => {
  const { email, name } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const candidateName = (name || "").trim() || "Candidate";

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: "INVALID_EMAIL",
      message: "Please provide a valid candidate email address."
    });
  }

  const now = Date.now();
  const db = getFirestoreDb();
  const FIVE_MINUTES_MS = 5 * 60 * 1000; // 300,000 ms

  try {
    let existingDoc: OtpRecord | null = inMemoryOtpStore.get(normalizedEmail) || null;

    // Fetch existing record from Firestore metadata if available
    if (db && db.collection) {
      try {
        const snap = await db.collection("candidate_email_otps").doc(normalizedEmail).get();
        if (snap.exists) {
          existingDoc = snap.data() as OtpRecord;
        }
      } catch (dbErr: any) {
        console.warn("[CandidateAuth] Firestore rate limit lookup warning:", dbErr?.message || dbErr);
      }
    }

    // 1. Check Rate-Limiter with 5-Minute Cooldown Period
    if (existingDoc) {
      // If currently under an active cooldown period
      if (existingDoc.cooldownUntilMs && now < existingDoc.cooldownUntilMs) {
        const cooldownRemainingSeconds = Math.ceil((existingDoc.cooldownUntilMs - now) / 1000);
        return res.status(429).json({
          success: false,
          error: "RATE_LIMITED",
          message: `Too many verification requests. Please wait ${cooldownRemainingSeconds} seconds before requesting a new code.`,
          cooldownRemainingSeconds
        });
      }

      // Check consecutive send interval (minimum 30 seconds between requests)
      if (existingDoc.lastRequestedAtMs && (now - existingDoc.lastRequestedAtMs < 30000)) {
        const waitSeconds = Math.ceil((30000 - (now - existingDoc.lastRequestedAtMs)) / 1000);
        return res.status(429).json({
          success: false,
          error: "RATE_LIMITED",
          message: `Please wait ${waitSeconds} seconds before requesting another code.`,
          cooldownRemainingSeconds: waitSeconds
        });
      }

      // Track attempts within a 5-minute rolling window
      const windowStart = existingDoc.windowStartedAtMs || existingDoc.lastRequestedAtMs || now;
      const isWithinWindow = (now - windowStart) < FIVE_MINUTES_MS;
      const currentSendAttempts = isWithinWindow ? (existingDoc.sendAttempts || 0) + 1 : 1;

      // If candidate made more than 4 requests in 5 minutes, enforce 5-minute cooldown lockout
      if (currentSendAttempts > 4) {
        const cooldownUntilMs = now + FIVE_MINUTES_MS;
        const updatedRecord: OtpRecord = {
          ...existingDoc,
          sendAttempts: currentSendAttempts,
          cooldownUntilMs,
          lastRequestedAtMs: now,
          lastRequestedAt: new Date(now).toISOString()
        };

        inMemoryOtpStore.set(normalizedEmail, updatedRecord);

        if (db && db.collection) {
          await db.collection("candidate_email_otps").doc(normalizedEmail).set(updatedRecord, { merge: true }).catch(() => {});
        }

        return res.status(429).json({
          success: false,
          error: "RATE_LIMITED",
          message: "Rate limit exceeded. A 5-minute cooldown period has been applied to prevent unauthorized requests.",
          cooldownRemainingSeconds: 300
        });
      }
    }

    // 2. Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(rawOtp, normalizedEmail);
    const expiresAtMs = now + 10 * 60 * 1000; // 10 minutes validity
    const isoExpiresAt = new Date(expiresAtMs).toISOString();
    const isoCreatedAt = new Date(now).toISOString();

    const previousAttempts = (existingDoc && (now - (existingDoc.windowStartedAtMs || 0) < FIVE_MINUTES_MS))
      ? (existingDoc.sendAttempts || 0) + 1
      : 1;

    const otpDocData: OtpRecord = {
      email: normalizedEmail,
      name: candidateName,
      otpHash,
      expiresAtMs,
      expiresAt: isoExpiresAt,
      attemptCount: 0, // verification guess attempts
      sendAttempts: previousAttempts,
      windowStartedAtMs: existingDoc && (now - (existingDoc.windowStartedAtMs || 0) < FIVE_MINUTES_MS)
        ? existingDoc.windowStartedAtMs
        : now,
      verified: false,
      used: false,
      createdAt: isoCreatedAt,
      purpose: "candidate_registration",
      lastRequestedAtMs: now,
      lastRequestedAt: isoCreatedAt
    };

    // Save to Firestore with metadata
    if (db && db.collection) {
      try {
        await db.collection("candidate_email_otps").doc(normalizedEmail).set(otpDocData);
      } catch (dbErr: any) {
        console.warn("[CandidateAuth] Firestore OTP save warning:", dbErr?.message || dbErr);
      }
    }

    // Also update in-memory record
    inMemoryOtpStore.set(normalizedEmail, otpDocData);

    // 3. Dispatch Email with template
    const emailResult = await dispatchEmail({
      to: normalizedEmail,
      templateName: "candidate_email_otp",
      data: {
        candidateName,
        recipientName: candidateName,
        email: normalizedEmail,
        customMessage: rawOtp
      },
      userId: "pre_registration",
      recipientName: candidateName,
      recipientRole: "candidate",
      createdBy: "candidate_otp_service",
      category: "transactional"
    });

    console.log(`[CandidateAuth] OTP email dispatched to ${normalizedEmail}. Success: ${emailResult.success}`);

    return res.json({
      success: true,
      message: "6-digit verification code sent to your email address.",
      expiresInMinutes: 10
    });
  } catch (err: any) {
    console.error("[CandidateAuth] Error sending email OTP:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Unable to dispatch verification code. Please try again."
    });
  }
});

// ----------------------------------------------------------------------
// 2. POST /api/auth/candidate/verify-email-otp
// Validates hashed OTP against Firestore, ensures not expired and unused
// ----------------------------------------------------------------------
router.post("/verify-email-otp", async (req: Request, res: Response) => {
  const { email, otp, uid, fullName } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const inputOtp = (otp || "").toString().trim();

  if (!normalizedEmail || !inputOtp || inputOtp.length !== 6) {
    return res.status(400).json({
      success: false,
      error: "INVALID_INPUT",
      message: "Please provide a valid email address and the 6-digit verification code."
    });
  }

  const now = Date.now();
  const db = getFirestoreDb();

  try {
    let storedRecord: OtpRecord | null = inMemoryOtpStore.get(normalizedEmail) || null;

    // Retrieve from Firestore to validate against persistent database
    if (db && db.collection) {
      try {
        const snap = await db.collection("candidate_email_otps").doc(normalizedEmail).get();
        if (snap.exists) {
          storedRecord = snap.data() as OtpRecord;
        }
      } catch (dbErr: any) {
        console.warn("[CandidateAuth] Firestore OTP lookup notice:", dbErr?.message || dbErr);
      }
    }

    // A. Validate existence
    if (!storedRecord) {
      return res.status(400).json({
        success: false,
        error: "OTP_NOT_FOUND",
        message: "No active verification code found for this email. Please request a new verification code."
      });
    }

    // B. Validate email mapping
    if (storedRecord.email.toLowerCase() !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: "EMAIL_MISMATCH",
        message: "Verification code does not match this email address."
      });
    }

    // C. Validate unused state
    if (storedRecord.used || storedRecord.verified) {
      return res.status(400).json({
        success: false,
        error: "OTP_ALREADY_USED",
        message: "This verification code has already been used. Please request a new code."
      });
    }

    // D. Validate expiration
    const expiryTime = storedRecord.expiresAtMs || new Date(storedRecord.expiresAt).getTime();
    if (now > expiryTime) {
      return res.status(400).json({
        success: false,
        error: "EXPIRED_OTP",
        message: "The verification code has expired. Please request a new verification code."
      });
    }

    // E. Validate brute-force attempt limits (max 5 verification guesses)
    if (storedRecord.attemptCount >= 5) {
      return res.status(400).json({
        success: false,
        error: "MAX_ATTEMPTS_EXCEEDED",
        message: "Maximum verification attempts exceeded. Please request a new verification code."
      });
    }

    // F. Validate hashed OTP
    const calculatedHash = hashOtp(inputOtp, normalizedEmail);
    if (calculatedHash !== storedRecord.otpHash) {
      const updatedAttempts = (storedRecord.attemptCount || 0) + 1;
      storedRecord.attemptCount = updatedAttempts;
      inMemoryOtpStore.set(normalizedEmail, storedRecord);

      if (db && db.collection) {
        await db.collection("candidate_email_otps").doc(normalizedEmail).update({
          attemptCount: updatedAttempts
        }).catch(() => {});
      }

      const attemptsRemaining = Math.max(0, 5 - updatedAttempts);
      return res.status(400).json({
        success: false,
        error: "INVALID_OTP",
        message: `Incorrect verification code. ${attemptsRemaining} attempt(s) remaining.`
      });
    }

    // G. Mark code as verified and USED to prevent replay
    const verifiedIso = new Date().toISOString();
    storedRecord.verified = true;
    storedRecord.used = true;
    inMemoryOtpStore.set(normalizedEmail, storedRecord);

    if (db && db.collection) {
      await db.collection("candidate_email_otps").doc(normalizedEmail).update({
        verified: true,
        used: true,
        verifiedAt: verifiedIso,
        usedAt: verifiedIso
      }).catch(() => {});
    }

    // H. If candidate UID is provided, initialize candidateProfiles/{uid} document with profileStatus: 'incomplete'
    if (uid && db && db.collection) {
      const candidateName = fullName || storedRecord.name || "Candidate";
      const candidateProfileDoc = {
        uid,
        fullName: candidateName,
        name: candidateName,
        email: normalizedEmail,
        role: "candidate",
        emailVerified: true,
        verificationStatus: "verified",
        accountStatus: "active",
        profileStatus: "incomplete",
        profileCompletion: 20,
        onboardingStep: "resume_upload",
        targetRole: "Software Engineer",
        preferredLocation: "Remote / India",
        skills: [],
        experience: [],
        education: [],
        resumeUrl: null,
        resumeFileName: null,
        createdAt: verifiedIso,
        updatedAt: verifiedIso
      };

      try {
        await Promise.all([
          db.collection("candidateProfiles").doc(uid).set(candidateProfileDoc, { merge: true }),
          db.collection("candidates").doc(uid).set({
            uid,
            name: candidateName,
            email: normalizedEmail,
            emailVerified: true,
            verificationStatus: "verified",
            accountStatus: "active",
            profileStatus: "incomplete",
            profileCompletion: 20,
            updatedAt: verifiedIso
          }, { merge: true }),
          db.collection("users").doc(uid).set({
            uid,
            name: candidateName,
            email: normalizedEmail,
            emailVerified: true,
            verificationStatus: "verified",
            accountStatus: "active",
            profileStatus: "incomplete",
            updatedAt: verifiedIso
          }, { merge: true })
        ]);
      } catch (profErr: any) {
        console.warn("[CandidateAuth] Profile document bootstrap notice:", profErr?.message || profErr);
      }
    }

    return res.json({
      success: true,
      verified: true,
      email: normalizedEmail,
      message: "Email successfully verified. Onboarding flow initialized."
    });
  } catch (err: any) {
    console.error("[CandidateAuth] Error verifying email OTP:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Verification failed due to a server error. Please try again."
    });
  }
});

export default router;
