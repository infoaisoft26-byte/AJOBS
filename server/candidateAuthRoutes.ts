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
  role?: string;
  lastRequestedAtMs: number;
  lastRequestedAt: string;
  isLocked?: boolean;
  accountStatus?: string;
  lockedAt?: string;
  lockReason?: string;
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
// Server-side rate limiter with 60-second cooldown stored in Firestore
// ----------------------------------------------------------------------
router.post("/send-email-otp", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");

  const { email, name, role } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedRole = ["candidate", "consultancy", "employer", "recruiter"].includes(String(role || "").toLowerCase())
    ? String(role).toLowerCase()
    : "candidate";
  const candidateName = (name || "").trim() || (normalizedRole === "consultancy" ? "Consultancy" : "Candidate");

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: "INVALID_EMAIL",
      message: "Please provide a valid candidate email address."
    });
  }

  const now = Date.now();
  const db = getFirestoreDb();
  const COOLDOWN_MS = 60 * 1000; // Minimum 60-second cooldown
  const FIVE_MINUTES_MS = 5 * 60 * 1000; // 300,000 ms rolling abuse window

  try {
    let existingDoc: OtpRecord | null = inMemoryOtpStore.get(normalizedEmail) || null;
    let rateLimitDoc: any = null;

    // Fetch existing record & short-lived rate limit from Firestore
    if (db && db.collection) {
      try {
        const [otpSnap, rateSnap] = await Promise.all([
          db.collection("candidate_email_otps").doc(normalizedEmail).get(),
          db.collection("email_rate_limits").doc(normalizedEmail).get()
        ]);
        if (otpSnap.exists) {
          existingDoc = otpSnap.data() as OtpRecord;
        }
        if (rateSnap.exists) {
          rateLimitDoc = rateSnap.data();
        }
      } catch (dbErr: any) {
        console.warn("[CandidateAuth] Firestore rate limit lookup warning:", dbErr?.message || dbErr);
      }
    }

    // 1. Check if account is in locked state
    if (existingDoc && (existingDoc.isLocked || existingDoc.accountStatus === "locked")) {
      return res.status(403).json({
        success: false,
        error: "ACCOUNT_LOCKED",
        isLocked: true,
        message: "Your account is locked due to excessive failed verification attempts. Please contact an administrator or request a password reset to unlock your account."
      });
    }

    // 2. Server-side Rate-Limiting: Minimum 60-second cooldown
    const lastSendTimeMs = rateLimitDoc?.lastSendTimeMs || existingDoc?.lastRequestedAtMs || 0;
    if (lastSendTimeMs && (now - lastSendTimeMs < COOLDOWN_MS)) {
      const cooldownRemainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastSendTimeMs)) / 1000);
      return res.status(429).json({
        success: false,
        error: "RATE_LIMITED",
        message: `Please wait ${cooldownRemainingSeconds} second(s) before requesting a new verification code.`,
        cooldownRemainingSeconds
      });
    }

    // Check rolling abuse window
    if (existingDoc) {
      if (existingDoc.cooldownUntilMs && now < existingDoc.cooldownUntilMs) {
        const cooldownRemainingSeconds = Math.ceil((existingDoc.cooldownUntilMs - now) / 1000);
        return res.status(429).json({
          success: false,
          error: "RATE_LIMITED",
          message: `Too many verification requests. Please wait ${cooldownRemainingSeconds} seconds before requesting a new code.`,
          cooldownRemainingSeconds
        });
      }

      const windowStart = existingDoc.windowStartedAtMs || existingDoc.lastRequestedAtMs || now;
      const isWithinWindow = (now - windowStart) < FIVE_MINUTES_MS;
      const currentSendAttempts = isWithinWindow ? (existingDoc.sendAttempts || 0) + 1 : 1;

      // If candidate makes more than 5 send requests in 5 minutes, apply temporary 5-minute cooldown
      if (currentSendAttempts > 5) {
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
          message: "Rate limit exceeded. A 5-minute cooldown period has been applied to prevent abuse.",
          cooldownRemainingSeconds: 300
        });
      }
    }

    // 3. Generate cryptographically secure 6-digit numeric OTP
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
      attemptCount: 0, // reset verification guess count for new OTP
      sendAttempts: previousAttempts,
      windowStartedAtMs: existingDoc && (now - (existingDoc.windowStartedAtMs || 0) < FIVE_MINUTES_MS)
        ? existingDoc.windowStartedAtMs
        : now,
      verified: false,
      used: false,
      createdAt: isoCreatedAt,
      purpose: `${normalizedRole}_registration`,
      role: normalizedRole,
      lastRequestedAtMs: now,
      lastRequestedAt: isoCreatedAt,
      isLocked: false,
      accountStatus: "active"
    };

    // Save to Firestore with metadata and short-lived rate-limiting record
    if (db && db.collection) {
      try {
        await Promise.all([
          db.collection("candidate_email_otps").doc(normalizedEmail).set(otpDocData),
          db.collection("email_rate_limits").doc(normalizedEmail).set({
            email: normalizedEmail,
            lastSendTimeMs: now,
            lastSendTime: isoCreatedAt,
            expiresAt: new Date(now + COOLDOWN_MS).toISOString()
          })
        ]);
      } catch (dbErr: any) {
        console.warn("[CandidateAuth] Firestore OTP / rate-limit save warning:", dbErr?.message || dbErr);
      }
    }

    // Also update in-memory store
    inMemoryOtpStore.set(normalizedEmail, otpDocData);

    // 4. Dispatch Email with template
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
      recipientRole: normalizedRole,
      createdBy: `${normalizedRole}_otp_service`,
      category: "transactional"
    });

    console.log(`[CandidateAuth] OTP email dispatched to ${normalizedEmail}. Success: ${emailResult.success}`);

    return res.json({
      success: true,
      message: "6-digit verification code sent to your email address.",
      expiresInSeconds: 600,
      expiresAt: isoExpiresAt,
      cooldownSeconds: 60
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
// Validates hashed OTP, enforces 5 failed attempts limit & triggers lockout
// ----------------------------------------------------------------------
router.post("/verify-email-otp", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");

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

    // B. Check if account is in lockout state
    if (storedRecord.isLocked || storedRecord.accountStatus === "locked" || (storedRecord.attemptCount || 0) >= 5) {
      return res.status(403).json({
        success: false,
        error: "ACCOUNT_LOCKED",
        isLocked: true,
        attemptsRemaining: 0,
        message: "Your account is locked due to 5 consecutive failed verification attempts. Please contact an administrator or request a password reset to unlock your account."
      });
    }

    // C. Validate email mapping
    if (storedRecord.email.toLowerCase() !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: "EMAIL_MISMATCH",
        message: "Verification code does not match this email address."
      });
    }

    // D. Validate unused state
    if (storedRecord.used || storedRecord.verified) {
      return res.status(400).json({
        success: false,
        error: "OTP_ALREADY_USED",
        message: "This verification code has already been used. Please request a new code."
      });
    }

    // E. Validate expiration
    const expiryTime = storedRecord.expiresAtMs || new Date(storedRecord.expiresAt).getTime();
    if (now > expiryTime) {
      return res.status(400).json({
        success: false,
        error: "EXPIRED_OTP",
        message: "The verification code has expired. Please request a new verification code."
      });
    }

    // F. Validate hashed OTP and track failed attempts
    const calculatedHash = hashOtp(inputOtp, normalizedEmail);
    if (calculatedHash !== storedRecord.otpHash) {
      const updatedAttempts = (storedRecord.attemptCount || 0) + 1;
      storedRecord.attemptCount = updatedAttempts;

      // 5 Failed Attempts -> TRIGGER LOCKOUT STATE
      if (updatedAttempts >= 5) {
        const lockIso = new Date().toISOString();
        storedRecord.isLocked = true;
        storedRecord.accountStatus = "locked";
        storedRecord.lockedAt = lockIso;
        storedRecord.lockReason = "EXCEEDED_MAX_OTP_ATTEMPTS";

        inMemoryOtpStore.set(normalizedEmail, storedRecord);

        // Update Firestore candidate_email_otps and Candidate records to locked state
        if (db && db.collection) {
          const lockPayload = {
            status: "locked",
            accountStatus: "locked",
            isLocked: true,
            lockedAt: lockIso,
            lockReason: "EXCEEDED_MAX_OTP_ATTEMPTS",
            lockDetails: "Account locked due to 5 failed verification attempts. Requires administrative intervention or password reset.",
            requiresAdminIntervention: true
          };

          try {
            await db.collection("candidate_email_otps").doc(normalizedEmail).set({
              ...storedRecord,
              attemptCount: updatedAttempts,
              isLocked: true,
              accountStatus: "locked",
              lockedAt: lockIso,
              lockReason: "EXCEEDED_MAX_OTP_ATTEMPTS"
            }, { merge: true });

            if (uid) {
              await Promise.all([
                db.collection("users").doc(uid).set(lockPayload, { merge: true }),
                db.collection("candidates").doc(uid).set(lockPayload, { merge: true }),
                db.collection("candidateProfiles").doc(uid).set(lockPayload, { merge: true })
              ]);
            }

            // Also lock any matching records by email across collections
            const [uSnap, cSnap, pSnap] = await Promise.all([
              db.collection("users").where("email", "==", normalizedEmail).get(),
              db.collection("candidates").where("email", "==", normalizedEmail).get(),
              db.collection("candidateProfiles").where("email", "==", normalizedEmail).get()
            ]);

            const updatePromises: Promise<any>[] = [];
            uSnap.forEach((d: any) => updatePromises.push(d.ref.set(lockPayload, { merge: true })));
            cSnap.forEach((d: any) => updatePromises.push(d.ref.set(lockPayload, { merge: true })));
            pSnap.forEach((d: any) => updatePromises.push(d.ref.set(lockPayload, { merge: true })));
            await Promise.all(updatePromises);
          } catch (lockErr: any) {
            console.error("[CandidateAuth] Lockout Firestore update error:", lockErr);
          }
        }

        return res.status(403).json({
          success: false,
          error: "ACCOUNT_LOCKED",
          isLocked: true,
          attemptsRemaining: 0,
          message: "Your account has been locked due to 5 consecutive failed verification attempts. Please contact an administrator or request a password reset to unlock your account."
        });
      }

      // If under 5 attempts
      inMemoryOtpStore.set(normalizedEmail, storedRecord);
      if (db && db.collection) {
        await db.collection("candidate_email_otps").doc(normalizedEmail).update({
          attemptCount: updatedAttempts
        }).catch(() => {});
      }

      const attemptsRemaining = 5 - updatedAttempts;
      return res.status(400).json({
        success: false,
        error: "INVALID_OTP",
        attemptsRemaining,
        message: `Incorrect verification code. ${attemptsRemaining} attempt(s) remaining before account lockout.`
      });
    }

    // G. OTP is valid: Mark code as verified and USED to prevent replay
    const verifiedIso = new Date().toISOString();
    storedRecord.verified = true;
    storedRecord.used = true;
    storedRecord.attemptCount = 0;
    inMemoryOtpStore.set(normalizedEmail, storedRecord);

    if (db && db.collection) {
      await db.collection("candidate_email_otps").doc(normalizedEmail).update({
        verified: true,
        used: true,
        verifiedAt: verifiedIso,
        usedAt: verifiedIso,
        attemptCount: 0
      }).catch(() => {});
    }

    // H. Initialize only the collection that belongs to the verified role.
    if (uid && db && db.collection) {
      const candidateName = fullName || storedRecord.name || "Candidate";
      const verifiedRole = ["candidate", "consultancy", "employer", "recruiter"].includes(String(storedRecord.role || ""))
        ? String(storedRecord.role)
        : String(storedRecord.purpose || "candidate_registration").split("_")[0];
      const commonVerifiedProfile = {
        uid,
        name: candidateName,
        email: normalizedEmail,
        role: verifiedRole,
        emailVerified: true,
        verificationStatus: "verified",
        updatedAt: verifiedIso
      };

      if (verifiedRole !== "candidate") {
        const businessStatus = "pending_kyc";
        const businessProfile = {
          ...commonVerifiedProfile,
          status: businessStatus,
          accountStatus: businessStatus,
          isActive: false,
          isApproved: false
        };
        try {
          await db.collection("users").doc(uid).set(businessProfile, { merge: true });
          if (verifiedRole === "consultancy") {
            await db.collection("consultancies").doc(uid).set({
              ...businessProfile,
              agencyName: candidateName,
              subscriptionStatus: "pending"
            }, { merge: true });
          }
        } catch (businessErr: any) {
          console.warn("[CandidateAuth] Business profile verification notice:", businessErr?.message || businessErr);
        }
        return res.json({
          success: true,
          verified: true,
          email: normalizedEmail,
          role: verifiedRole,
          message: "Email verified. Business account is pending KYC and Admin approval."
        });
      }

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
            ...commonVerifiedProfile,
            accountStatus: "active",
            status: "active",
            isActive: true,
            isApproved: true,
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

// ----------------------------------------------------------------------
// 3. POST /api/auth/resolve-identifier
// Secure server-side resolution of Email, Mobile number, or User ID
// ----------------------------------------------------------------------
router.post("/resolve-identifier", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  const { identifier } = req.body;
  const rawId = (identifier || "").trim();

  if (!rawId) {
    return res.status(400).json({
      success: false,
      error: "MISSING_IDENTIFIER",
      message: "Please enter your email, mobile number, or User ID."
    });
  }

  // 1. Direct email pattern
  if (rawId.includes("@")) {
    return res.json({
      success: true,
      email: rawId.toLowerCase(),
      type: "email"
    });
  }

  const db = getFirestoreDb();
  if (!db || !db.collection) {
    // If db unavailable, assume direct string could be an email or reject
    return res.status(503).json({
      success: false,
      error: "SERVICE_UNAVAILABLE",
      message: "Database service currently unavailable. Please sign in with your email address."
    });
  }

  try {
    // 2. Try phone number resolution
    const cleanDigits = rawId.replace(/\D/g, "");
    if (cleanDigits.length >= 10) {
      const phoneVariants = [
        rawId,
        `+91${cleanDigits.slice(-10)}`,
        cleanDigits.slice(-10),
        `+${cleanDigits}`
      ];

      for (const phoneVal of phoneVariants) {
        // Query users by phone
        const userSnap = await db.collection("users").where("phone", "==", phoneVal).limit(1).get();
        if (!userSnap.empty) {
          const uData = userSnap.docs[0].data();
          if (uData.email) {
            return res.json({
              success: true,
              email: uData.email.toLowerCase(),
              type: "phone",
              uid: userSnap.docs[0].id
            });
          }
        }

        // Query candidates by phone
        const candSnap = await db.collection("candidates").where("phone", "==", phoneVal).limit(1).get();
        if (!candSnap.empty) {
          const cData = candSnap.docs[0].data();
          if (cData.email) {
            return res.json({
              success: true,
              email: cData.email.toLowerCase(),
              type: "phone",
              uid: candSnap.docs[0].id
            });
          }
        }
      }
    }

    // 3. Try User ID / Candidate ID / Agency ID / Custom ID resolution
    const idFields = ["candidateId", "userId", "uid", "companyId", "agencyId", "username", "customId"];
    for (const field of idFields) {
      const snap = await db.collection("users").where(field, "==", rawId).limit(1).get();
      if (!snap.empty) {
        const uData = snap.docs[0].data();
        if (uData.email) {
          return res.json({
            success: true,
            email: uData.email.toLowerCase(),
            type: "userId",
            uid: snap.docs[0].id
          });
        }
      }
    }

    // Also check candidates collection by candidateId
    const candIdSnap = await db.collection("candidates").where("candidateId", "==", rawId).limit(1).get();
    if (!candIdSnap.empty) {
      const cData = candIdSnap.docs[0].data();
      if (cData.email) {
        return res.json({
          success: true,
          email: cData.email.toLowerCase(),
          type: "userId",
          uid: candIdSnap.docs[0].id
        });
      }
    }

    // Direct doc lookup by rawId as UID in users
    const directDoc = await db.collection("users").doc(rawId).get();
    if (directDoc.exists) {
      const dData = directDoc.data();
      if (dData?.email) {
        return res.json({
          success: true,
          email: dData.email.toLowerCase(),
          type: "userId",
          uid: directDoc.id
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: "ACCOUNT_NOT_FOUND",
      message: "No AIJobs account was found with these details."
    });
  } catch (err: any) {
    console.error("[CandidateAuth] Error resolving identifier:", err);
    return res.status(500).json({
      success: false,
      error: "RESOLUTION_ERROR",
      message: "Unable to resolve login identifier. Please enter your registered email address."
    });
  }
});

export default router;
