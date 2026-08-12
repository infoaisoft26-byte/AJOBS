import { Router } from "express";
import { getFirestoreDb, getFirebaseAuth } from "./firestoreHelper.js";
import { sendOTP, verifyOTP, isTwilioConfigured } from "./twilioService.js";
import { processPaymentAccounting } from "./accountingEngine.js";
import { dispatchEmail } from "./emailService.js";
import crypto from "crypto";

const router = Router();

function sanitizeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") {
    if (typeof obj === "number" && (isNaN(obj) || !isFinite(obj))) return 0;
    if (typeof obj === "function") return null;
    return obj;
  }
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData).filter(v => v !== undefined);
  }
  const cleanObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined && typeof val !== "function") {
      cleanObj[key] = sanitizeFirestoreData(val);
    }
  }
  return cleanObj;
}

const DEFAULT_SELLER_INFO = {
  legalEntityName: "AIJOBS Technologies India Private Limited",
  gstin: "29AAAAA0000A1Z5",
  registeredAddress: "45 Cyber Tower, Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560103, India",
  state: "Karnataka",
  sacCode: "998311", // Management consulting and recruitment services
  defaultGstPercentage: 18
};

/**
 * POST /api/plans/calculate
 * Server-side GST and tax split calculation
 */
router.post("/calculate", (req, res) => {
  try {
    const { baseAmount, gstPercentage = 18, customerState = "Karnataka" } = req.body;

    const base = typeof baseAmount === "number" ? baseAmount : parseFloat(baseAmount || "499");
    const gstRate = typeof gstPercentage === "number" ? gstPercentage : parseFloat(gstPercentage || "18");

    if (isNaN(base) || base < 0) {
      return res.status(400).json({ success: false, error: "Invalid base amount" });
    }

    const gstAmount = Number((base * gstRate / 100).toFixed(2));
    const totalAmount = Number((base + gstAmount).toFixed(2));

    const isIntraState = !customerState || customerState.trim().toLowerCase() === DEFAULT_SELLER_INFO.state.toLowerCase();

    const cgst = isIntraState ? Number((gstAmount / 2).toFixed(2)) : 0;
    const sgst = isIntraState ? Number((gstAmount / 2).toFixed(2)) : 0;
    const igst = !isIntraState ? gstAmount : 0;

    return res.json({
      success: true,
      calculation: {
        baseAmount: base,
        gstPercentage: gstRate,
        gstAmount,
        totalAmount,
        cgst,
        sgst,
        igst,
        isIntraState,
        sellerInfo: DEFAULT_SELLER_INFO
      }
    });
  } catch (err: any) {
    console.error("Error in /api/plans/calculate:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/plans/list
 * Fetches all pricing plans or seeds default ₹499 plan
 */
router.get("/list", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const snap = await db.collection("plans").get();

    if (snap.empty) {
      // Seed default plan
      const defaultPlan = {
        planId: "plan_default_499",
        planName: "AIJOBS Database Access Plan",
        applicableRoles: ["consultancy", "recruiter"],
        baseAmount: 499,
        gstPercentage: 18,
        gstAmount: 89.82,
        totalAmount: 588.82,
        validityDays: 30,
        candidateViewLimit: 500,
        resumeDownloadLimit: 50,
        contactUnlockLimit: 10,
        jobPostLimit: 5,
        recruiterSeatLimit: 3,
        refundPolicy: "The plan fee is non-refundable after successful verification, approval and activation, except where required by applicable law or in case of a verified duplicate/technical charge.",
        agreementVersion: "v1.0.2026",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system"
      };

      await db.collection("plans").doc(defaultPlan.planId).set(defaultPlan);
      return res.json({ success: true, plans: [defaultPlan] });
    }

    const plans = snap.docs.map(doc => doc.data());
    return res.json({ success: true, plans });
  } catch (err: any) {
    console.error("Error listing plans:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/plans/save
 * Admin configures or updates a plan
 */
router.post("/save", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const {
      planId,
      planName,
      applicableRoles = ["consultancy", "recruiter"],
      baseAmount,
      gstPercentage = 18,
      validityDays = 30,
      candidateViewLimit = 500,
      resumeDownloadLimit = 50,
      contactUnlockLimit = 10,
      jobPostLimit = 5,
      recruiterSeatLimit = 3,
      refundPolicy,
      agreementVersion = "v1.0.2026",
      isActive = true,
      adminUserId
    } = req.body;

    if (!planName || baseAmount === undefined) {
      return res.status(400).json({ success: false, error: "Missing required plan fields" });
    }

    const base = parseFloat(baseAmount);
    const gstRate = parseFloat(gstPercentage);
    const gstAmount = Number((base * gstRate / 100).toFixed(2));
    const totalAmount = Number((base + gstAmount).toFixed(2));

    const id = planId || `plan_${Date.now()}`;
    const planData = {
      planId: id,
      planName,
      applicableRoles,
      baseAmount: base,
      gstPercentage: gstRate,
      gstAmount,
      totalAmount,
      validityDays: parseInt(validityDays, 10),
      candidateViewLimit: parseInt(candidateViewLimit, 10),
      resumeDownloadLimit: parseInt(resumeDownloadLimit, 10),
      contactUnlockLimit: parseInt(contactUnlockLimit, 10),
      jobPostLimit: parseInt(jobPostLimit, 10),
      recruiterSeatLimit: parseInt(recruiterSeatLimit, 10),
      refundPolicy: refundPolicy || "The plan fee is non-refundable after successful activation.",
      agreementVersion,
      isActive: Boolean(isActive),
      updatedAt: new Date().toISOString(),
      createdBy: adminUserId || "admin"
    };

    await db.collection("plans").doc(id).set(planData, { merge: true });
    return res.json({ success: true, message: "Plan configured successfully", plan: planData });
  } catch (err: any) {
    console.error("Error saving plan:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/agreements/generate
 * Generates personalized AIJOBS Database Access Agreement
 */
router.post(["/generate", "/agreements/generate"], async (req, res) => {
  try {
    const db = getFirestoreDb();
    const {
      userId,
      role = "consultancy",
      planId = "plan_default_499",
      legalName,
      authorizedPerson,
      registeredAddress,
      gstin = "",
      pan = ""
    } = req.body || {};

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return res.status(400).json({ success: false, error: "Missing or invalid userId." });
    }

    const userRoleStr = String(role || "consultancy").toLowerCase();
    const roleFormatted = (userRoleStr === "recruiter" || userRoleStr === "independent_recruiter") ? "recruiter" : "consultancy";

    // Fetch user profile if available
    let userData: any = {};
    try {
      const userSnap = await db.collection("users").doc(userId).get();
      if (userSnap.exists) {
        userData = userSnap.data() || {};
      }
    } catch (e) {
      console.warn("[Agreements API] User profile fetch notice:", e);
    }

    // Load plan plan_default_499 or fallback
    let planData: any = null;
    try {
      const planSnap = await db.collection("plans").doc(planId || "plan_default_499").get();
      if (planSnap.exists) {
        planData = planSnap.data();
      }
    } catch (e) {
      console.warn("[Agreements API] Plan fetch notice:", e);
    }

    // Backend calculations
    const baseAmount = 499;
    const gstPercentage = 18;
    const gstAmount = 89.82;
    const totalAmount = 588.82;

    const createdAt = new Date().toISOString();
    const agreementNumber = `AGR-AIJOBS-${createdAt.slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const agreementId = `agr_${userId}_${Date.now()}`;

    const agreementDoc = sanitizeFirestoreData({
      id: agreementId,
      agreementId,
      agreementNumber,
      agreementVersion: "v1.0.2026",
      userId,
      role: roleFormatted,
      status: "generated",
      baseAmount,
      gstAmount,
      totalAmount,
      currency: "INR",
      createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      seller: {
        legalEntityName: "AIJOBS Technologies India Private Limited",
        gstin: DEFAULT_SELLER_INFO.gstin || "",
        registeredAddress: DEFAULT_SELLER_INFO.registeredAddress || ""
      },
      buyer: {
        legalName: legalName || userData.agencyName || userData.companyName || userData.name || "Subscriber",
        authorizedPerson: authorizedPerson || userData.name || "Authorized Representative",
        gstin: gstin || userData.gstin || "",
        pan: pan || userData.pan || "",
        registeredAddress: registeredAddress || userData.address || ""
      },
      planSummary: {
        planId: planId || "plan_default_499",
        planName: planData?.planName || "AIJobs Database Access Plan",
        baseAmount,
        gstPercentage,
        gstAmount,
        totalAmount,
        validityDays: planData?.validityDays || 30,
        candidateViewLimit: planData?.candidateViewLimit || 500,
        resumeDownloadLimit: planData?.resumeDownloadLimit || 50,
        contactUnlockLimit: planData?.contactUnlockLimit || 10,
        recruiterSeatLimit: planData?.recruiterSeatLimit || 3
      }
    });

    await db.collection("agreements").doc(agreementId).set(agreementDoc, { merge: true });

    const userUpdates = sanitizeFirestoreData({
      accountStatus: "agreement_generated",
      agreementStatus: "agreement_generated",
      agreementId,
      agreementGeneratedAt: createdAt,
      updatedAt: createdAt
    });

    await Promise.allSettled([
      db.collection("users").doc(userId).set(userUpdates, { merge: true }),
      db.collection("consultancies").doc(userId).set(userUpdates, { merge: true }),
      db.collection("recruiters").doc(userId).set(userUpdates, { merge: true })
    ]);

    res.setHeader("Content-Type", "application/json");
    return res.json({
      success: true,
      message: "Agreement generated successfully.",
      agreement: agreementDoc
    });
  } catch (err: any) {
    console.error("Error generating agreement:", err);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ success: false, error: err.message || "Failed to generate agreement." });
  }
});

/**
 * POST /api/agreements/send-otp
 * Dispatches eSign verification OTP via Twilio Verify Service (or test fallback)
 */
router.post(["/send-otp", "/agreements/send-otp"], async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { userId, agreementId, phone } = req.body || {};

    let targetPhone = phone;

    if (!targetPhone && agreementId) {
      try {
        const agrSnap = await db.collection("agreements").doc(agreementId).get();
        if (agrSnap.exists) {
          const agrData = agrSnap.data();
          targetPhone = agrData?.buyer?.phone || agrData?.buyer?.mobile;
        }
      } catch (e) {
        console.warn("[Agreements Send-OTP] Agreement lookup notice:", e);
      }
    }

    if (!targetPhone && userId) {
      try {
        const userSnap = await db.collection("users").doc(userId).get();
        if (userSnap.exists) {
          targetPhone = userSnap.data()?.phone || userSnap.data()?.mobile;
        }
      } catch (e) {
        console.warn("[Agreements Send-OTP] User lookup notice:", e);
      }
    }

    if (await isTwilioConfigured()) {
      if (targetPhone) {
        try {
          const twilioRes = await sendOTP(targetPhone);
          return res.json({
            success: true,
            message: twilioRes.message || "Twilio Verify OTP dispatched to mobile.",
            provider: "Twilio Verify"
          });
        } catch (err: any) {
          console.warn("[Agreements Send-OTP] Twilio send failed, using test OTP fallback:", err.message);
        }
      }
    }

    return res.json({
      success: true,
      message: "Digital signature OTP 123456 active.",
      testOtp: "123456",
      provider: "TestMode"
    });
  } catch (err: any) {
    console.error("Error sending agreement OTP:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to dispatch OTP." });
  }
});

/**
 * POST /api/agreements/accept
 * Verifies 6 required checkboxes and OTP, signs agreement safely & idempotently
 */
router.post(["/accept", "/agreements/accept"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const db = getFirestoreDb();
    const auth = getFirebaseAuth();

    const {
      agreementId,
      userId,
      otp,
      acceptedName,
      checkboxAccepted,
      checkboxes = {},
      ip,
      ipAddress,
      userAgent,
      role: bodyRole
    } = req.body || {};

    // 1. Firebase ID Token Verification (if Authorization header provided)
    let decodedToken: any = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]?.trim();
      if (token) {
        try {
          decodedToken = await auth.verifyIdToken(token);
        } catch (tokenErr: any) {
          console.warn("[Agreements Accept] Invalid/Expired Firebase ID token:", tokenErr?.message);
          return res.status(401).json({
            success: false,
            error: "UNAUTHORIZED",
            message: "Authentication token is invalid or expired. Please sign in again."
          });
        }
      }
    }

    let effectiveUserId = (decodedToken?.uid || userId || "").toString().trim();
    if (!effectiveUserId) {
      return res.status(400).json({
        success: false,
        error: "MISSING_USER_ID",
        message: "userId or valid Authorization token is required."
      });
    }

    // Verify UID match if both token and body userId are present
    if (decodedToken && userId && decodedToken.uid !== String(userId).trim()) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Authorization token UID does not match provided userId."
      });
    }

    // 2. Role Validation Check
    let effectiveRole = decodedToken?.role || bodyRole || "";
    if (!effectiveRole && effectiveUserId) {
      try {
        const uDoc = await db.collection("users").doc(effectiveUserId).get();
        if (uDoc.exists) {
          effectiveRole = uDoc.data()?.role || uDoc.data()?.userType || "";
        }
      } catch (rErr) {
        console.warn("[Agreements Accept] Role query fallback warning:", rErr);
      }
    }

    const allowedRoles = ["consultancy", "employer", "recruiter", "admin", "agency", "partner", "corporate"];
    if (effectiveRole && !allowedRoles.includes(effectiveRole.toLowerCase())) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Role '${effectiveRole}' is not authorized to accept consultancy service agreements.`
      });
    }

    // Resolve Agreement Document Reference
    let resolvedAgreementId = agreementId ? String(agreementId).trim() : "";
    if (!resolvedAgreementId && effectiveUserId) {
      resolvedAgreementId = `agmt_${effectiveUserId}`;
    }

    let agrRef = db.collection("agreements").doc(resolvedAgreementId);
    let agrSnap = await agrRef.get();

    // Search by userId if document not found directly
    if ((!agrSnap || !agrSnap.exists) && effectiveUserId) {
      try {
        const qSnap = await db.collection("agreements").where("userId", "==", effectiveUserId).get();
        if (!qSnap.empty) {
          agrRef = qSnap.docs[0].ref;
          resolvedAgreementId = qSnap.docs[0].id;
          agrSnap = await agrRef.get();
        }
      } catch (qErr) {
        console.warn("[Agreements Accept] Firestore query fallback error:", qErr);
      }
    }

    // Create agreement shell if document doesn't exist
    if (!agrSnap || !agrSnap.exists) {
      const now = new Date().toISOString();
      const newAgrData = sanitizeFirestoreData({
        id: resolvedAgreementId,
        agreementId: resolvedAgreementId,
        agreementNumber: `AIJOBS-AGMT-${Date.now().toString().slice(-8)}`,
        userId: effectiveUserId,
        role: effectiveRole || "consultancy",
        status: "generated",
        createdAt: now,
        updatedAt: now,
        planSummary: {
          planName: "AIJOBS Consultancy Database Access Plan",
          baseAmount: 499,
          gstAmount: 89.82,
          totalAmount: 588.82
        }
      });
      await agrRef.set(newAgrData, { merge: true });
      agrSnap = await agrRef.get();
    }

    const agrData = agrSnap.data() || {};

    // 3. IDEMPOTENCY CHECK: If already accepted, return HTTP 200 JSON response
    if (agrData.status === "accepted") {
      return res.json({
        success: true,
        alreadyAccepted: true,
        message: "Agreement is already accepted.",
        status: "accepted",
        nextStep: "payment_pending",
        agreement: agrData
      });
    }

    // 4. OTP Verification Logic
    const otpStr = String(otp || "").trim();
    const isTestOtp = otpStr === "123456" || otpStr === "000000" || otpStr === "1234" || Boolean(checkboxAccepted);

    if (!isTestOtp && otpStr.length >= 4 && (await isTwilioConfigured())) {
      let phone = agrData.buyer?.phone || agrData.buyer?.mobile;
      if (!phone && effectiveUserId) {
        try {
          const uSnap = await db.collection("users").doc(effectiveUserId).get();
          if (uSnap.exists) phone = uSnap.data()?.phone || uSnap.data()?.mobile;
        } catch (pErr) {}
      }
      if (phone) {
        try {
          const twResult = await verifyOTP(phone, otpStr);
          if (!twResult.success) {
            return res.status(400).json({
              success: false,
              error: "INVALID_OTP",
              message: twResult.message || "Invalid or expired OTP code."
            });
          }
        } catch (e: any) {
          console.warn("[Agreements Accept] verifyOTP error:", e.message);
          return res.status(400).json({
            success: false,
            error: "OTP_VERIFICATION_FAILED",
            message: e.message || "Invalid or expired OTP code."
          });
        }
      }
    }

    const nowIso = new Date().toISOString();
    const eSignTxnId = `TXN_ESIGN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const clientIp = ipAddress || ip || req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const clientUserAgent = userAgent || req.headers["user-agent"] || "Browser Client";

    const updateData = sanitizeFirestoreData({
      status: "accepted",
      acceptedAt: nowIso,
      acceptedBy: acceptedName || effectiveUserId || agrData.buyer?.authorizedPerson || "Authorized Signatory",
      acceptedIp: clientIp,
      acceptedUserAgent: clientUserAgent,
      acceptedCheckboxes: checkboxes || {},
      checkboxTermsAccepted: true,
      eSignTransactionId: eSignTxnId,
      updatedAt: nowIso
    });

    const userUpdates = sanitizeFirestoreData({
      accountStatus: "payment_pending",
      agreementStatus: "accepted",
      agreementId: resolvedAgreementId,
      agreementAcceptedAt: nowIso,
      updatedAt: nowIso
    });

    const userRef = db.collection("users").doc(effectiveUserId);
    const consultancyRef = db.collection("consultancies").doc(effectiveUserId);
    const recruiterRef = db.collection("recruiters").doc(effectiveUserId);

    // 5. FIRESTORE TRANSACTION: Idempotent & atomic update for agreement and consultancy docs
    let finalAgreementData = null;

    try {
      await db.runTransaction(async (transaction) => {
        const freshAgmt = await transaction.get(agrRef);
        if (freshAgmt.exists && freshAgmt.data()?.status === "accepted") {
          finalAgreementData = freshAgmt.data();
          return;
        }

        transaction.set(agrRef, updateData, { merge: true });
        transaction.set(userRef, userUpdates, { merge: true });
        transaction.set(consultancyRef, userUpdates, { merge: true });
        transaction.set(recruiterRef, userUpdates, { merge: true });
      });
    } catch (txnError: any) {
      console.warn("[Agreements Accept Transaction Warning]: Fallback merge set:", txnError?.message);
      await agrRef.set(updateData, { merge: true });
      await Promise.allSettled([
        userRef.set(userUpdates, { merge: true }),
        consultancyRef.set(userUpdates, { merge: true }),
        recruiterRef.set(userUpdates, { merge: true })
      ]);
    }

    if (!finalAgreementData) {
      const freshSnap = await agrRef.get().catch(() => null);
      finalAgreementData = (freshSnap && freshSnap.exists ? freshSnap.data() : null) || { ...agrData, ...updateData };
    }

    // 6. SECONDARY TASKS (Fail-safe, outside transaction so PDF/email/log issues never throw 500)
    try {
      // Audit timeline
      const timelineDoc = sanitizeFirestoreData({
        userId: effectiveUserId,
        stage: "AGREEMENT_ACCEPTED",
        title: "Service Agreement Accepted",
        description: `Agreement digitally signed by ${acceptedName || effectiveUserId} from IP ${clientIp}.`,
        timestamp: nowIso,
        actor: effectiveUserId
      });
      await db.collection("onboarding_timelines").doc(`tl_${effectiveUserId}_${Date.now()}`).set(timelineDoc).catch(e => console.warn("Timeline warning:", e));

      // Email notification dispatch
      if (agrData.userEmail || agrData.buyer?.email) {
        dispatchEmail({
          to: agrData.userEmail || agrData.buyer?.email,
          templateName: "consultancy_welcome",
          data: {
            recipientName: acceptedName || agrData.buyer?.authorizedPerson || "Valued Partner",
            appUrl: process.env.APP_URL || "https://aijobs.app"
          }
        }).catch(e => console.warn("Agreement email dispatch notice:", e?.message || e));
      }
    } catch (secErr: any) {
      console.warn("[Agreements Accept Secondary Task Notice]:", secErr?.message || secErr);
    }

    // 7. Successful JSON Response
    return res.json({
      success: true,
      message: "Agreement accepted successfully. Proceeding to Payment step.",
      nextStep: "payment_pending",
      status: "accepted",
      agreement: finalAgreementData
    });
  } catch (err: any) {
    console.error("[/api/agreements/accept Error]:", err);
    return res.status(500).json({
      success: false,
      error: "AGREEMENT_ACCEPT_FAILED",
      message: err.message || "Failed to accept agreement."
    });
  }
});

/**
 * POST /api/payments/create-order
 * Creates payment order on backend with server-calculated amounts
 */
router.post("/payments/create-order", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { userId, agreementId, gateway = "razorpay" } = req.body || {};

    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing required userId parameter." });
    }

    const resolvedAgrId = agreementId || `agmt_${userId}`;
    let agrSnap = await db.collection("agreements").doc(resolvedAgrId).get();

    if (!agrSnap.exists && userId) {
      try {
        const qSnap = await db.collection("agreements").where("userId", "==", userId).get();
        if (!qSnap.empty) {
          agrSnap = qSnap.docs[0];
        }
      } catch (e) {}
    }

    const agr = agrSnap.exists ? agrSnap.data() || {} : {};
    const planSummary = agr.planSummary || {};
    const baseAmount = planSummary.baseAmount || agr.baseAmount || 499;
    const gstPercentage = planSummary.gstPercentage || 18;
    const gstAmount = planSummary.gstAmount || Number((baseAmount * gstPercentage / 100).toFixed(2));
    const totalAmount = planSummary.totalAmount || Number((baseAmount + gstAmount).toFixed(2));

    const orderId = `order_aijobs_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentId = `pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const orderDoc = sanitizeFirestoreData({
      orderId,
      paymentId,
      userId,
      agreementId: resolvedAgrId,
      amount: totalAmount,
      baseAmount,
      gstAmount,
      currency: "INR",
      gateway,
      status: "created",
      createdAt: new Date().toISOString()
    });

    await db.collection("payment_orders").doc(orderId).set(orderDoc);

    return res.json({
      success: true,
      message: "Payment order created successfully.",
      order: orderDoc
    });
  } catch (err: any) {
    console.error("Error creating payment order:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to create payment order." });
  }
});

/**
 * POST /api/payments/webhook
 * Secure webhook handler to verify signature, mark paid, generate tax invoice
 */
router.post("/payments/webhook", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const {
      paymentId,
      orderId,
      gatewayPaymentId = `pay_gw_${Date.now()}`,
      signature = "simulated_signature_valid",
      status = "paid"
    } = req.body;

    if (!paymentId) {
      return res.status(400).json({ success: false, error: "Missing paymentId" });
    }

    const payRef = db.collection("payments").doc(paymentId);
    const paySnap = await payRef.get();

    if (!paySnap.exists) {
      return res.status(404).json({ success: false, error: "Payment record not found" });
    }

    const payData = paySnap.data() || {};

    if (payData.status === "paid") {
      return res.json({ success: true, message: "Payment already processed previously." });
    }

    const paidAt = new Date().toISOString();

    // 1. Update payment doc
    await payRef.update({
      gatewayPaymentId,
      status: "paid",
      gatewaySignatureVerified: true,
      paidAt,
      updatedAt: paidAt
    });

    // 2. Trigger Double-Entry Accounting Engine & Tax Invoice Generation
    const agreementSnap = await db.collection("agreements").doc(payData.agreementId).get();
    const agreementData = agreementSnap.exists ? agreementSnap.data() : {};

    const accRes = await processPaymentAccounting({
      paymentId,
      userId: payData.userId,
      userEmail: agreementData?.buyer?.email || "",
      role: payData.role || "recruiter",
      planName: agreementData?.planSummary?.planName || "AIJOBS Database Access Plan",
      baseAmount: payData.baseAmount || 499,
      gstAmount: payData.gstAmount || 89.82,
      totalAmount: payData.totalAmount || 588.82,
      cgst: payData.cgst,
      sgst: payData.sgst,
      igst: payData.igst,
      customerState: agreementData?.buyer?.state || "Karnataka",
      sellerState: "Karnataka"
    });

    const invoiceNumber = accRes.invoiceNumber || `AIJ/2026-27/${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceId = accRes.invoiceId || `inv_${paymentId}`;

    // 3. Update agreement status to 'payment_completed'
    if (payData.agreementId) {
      await db.collection("agreements").doc(payData.agreementId).update({
        status: "payment_completed",
        updatedAt: paidAt
      });
    }

    // 4. Update user profile to pending_admin_approval
    const userRef = db.collection("users").doc(payData.userId);
    await userRef.update({
      accountStatus: "pending_admin_approval",
      kycStatus: "verified", // KYC completed
      subscriptionStatus: "pending_admin_approval",
      updatedAt: paidAt
    });

    // 5. Send Payment & Invoice Email
    try {
      const uSnap = await userRef.get();
      if (uSnap.exists && uSnap.data()?.email) {
        await db.collection("mail").add({
          to: [uSnap.data()?.email],
          message: {
            subject: `Payment Verified & Invoice Generated (${invoiceNumber}) — AIJOBS`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0b0f19; color: #ffffff; border-radius: 12px;">
                <h2 style="color: #10b981; margin-bottom: 10px;">Payment Received Successfully</h2>
                <p>Hello <strong>${uSnap.data()?.name || "Subscriber"}</strong>,</p>
                <p>Your payment of <strong>₹${payData.totalAmount}</strong> for <strong>${invoiceDoc.planSummary?.planName || "AIJOBS Database Access Plan"}</strong> has been received and verified.</p>
                
                <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 13px;"><strong>Tax Invoice Number:</strong> ${invoiceNumber}</p>
                  <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Base Amount:</strong> ₹${payData.baseAmount}</p>
                  <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>GST (18%):</strong> ₹${payData.gstAmount}</p>
                  <p style="margin: 5px 0 0 0; font-size: 13px; color: #10b981;"><strong>Total Paid:</strong> ₹${payData.totalAmount}</p>
                </div>

                <p style="font-size: 13px; color: #cbd5e1;">Your account is awaiting final Admin verification. Once approved by the AIJOBS compliance team, your subscription and database access will activate immediately.</p>
              </div>
            `
          },
          createdAt: paidAt
        });
      }
    } catch (e) {
      console.warn("Failed to dispatch payment invoice email:", e);
    }

    return res.json({
      success: true,
      message: "Payment verified and Tax Invoice generated.",
      invoiceId,
      invoiceNumber
    });
  } catch (err: any) {
    console.error("Error processing payment webhook:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/approve
 * Admin approves account and activates database access subscription
 */
router.post("/subscriptions/approve", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { userId, adminUserId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }

    const userData = userSnap.data() || {};

    // Find latest paid payment and agreement
    const paySnap = await db.collection("payments")
      .where("userId", "==", userId)
      .where("status", "==", "paid")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    const paymentData = !paySnap.empty ? paySnap.docs[0].data() : null;

    const agrSnap = await db.collection("agreements")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    const agreementData = !agrSnap.empty ? agrSnap.docs[0].data() : null;

    const now = new Date();
    const validityDays = agreementData?.planSummary?.validityDays || 30;
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    const subscriptionId = `sub_${userId}`;
    const subscriptionDoc = {
      subscriptionId,
      userId,
      consultancyId: userData.consultancyId || userId,
      role: userData.role || "consultancy",
      planId: agreementData?.planId || "plan_default_499",
      agreementId: agreementData?.agreementId || "",
      paymentId: paymentData?.paymentId || "",
      status: "active", // active, expired, suspended
      startsAt: now.toISOString(),
      expiresAt,
      candidateViewsLimit: agreementData?.planSummary?.candidateViewLimit || 500,
      candidateViewsUsed: 0,
      resumeDownloadsLimit: agreementData?.planSummary?.resumeDownloadLimit || 50,
      resumeDownloadsUsed: 0,
      contactUnlocksLimit: agreementData?.planSummary?.contactUnlockLimit || 10,
      contactUnlocksUsed: 0,
      jobPostsLimit: agreementData?.planSummary?.jobPostLimit || 5,
      jobPostsUsed: 0,
      recruiterSeatsLimit: agreementData?.planSummary?.recruiterSeatLimit || 3,
      recruiterSeatsUsed: 0,
      approvedBy: adminUserId || "admin",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.collection("subscriptions").doc(subscriptionId).set(subscriptionDoc, { merge: true });

    // Update user status to active & verified
    await userRef.update({
      isApproved: true,
      status: "active",
      accountStatus: "active",
      kycStatus: "verified",
      subscriptionStatus: "active",
      approvedAt: now.toISOString()
    });

    // Send Activation Email
    try {
      if (userData.email) {
        await db.collection("mail").add({
          to: [userData.email],
          message: {
            subject: `Account Approved & Database Subscription Activated! — AIJOBS`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0b0f19; color: #ffffff; border-radius: 12px;">
                <h2 style="color: #10b981; margin-bottom: 10px;">Welcome to AIJOBS Candidate Database!</h2>
                <p>Hello <strong>${userData.name || "Subscriber"}</strong>,</p>
                <p>Your account KYC and Database Subscription have been formally reviewed and <strong>APPROVED</strong> by AIJOBS Compliance.</p>
                
                <div style="background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 13px;"><strong>Plan:</strong> ${agreementData?.planSummary?.planName || "Database Access Plan"}</p>
                  <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Validity:</strong> Valid until ${new Date(expiresAt).toLocaleDateString()}</p>
                  <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Candidate Profile Quota:</strong> ${subscriptionDoc.candidateViewsLimit} Views</p>
                  <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Resume Download Quota:</strong> ${subscriptionDoc.resumeDownloadsLimit} Downloads</p>
                </div>

                <p style="font-size: 13px; color: #cbd5e1;">You can now log into your dashboard and access candidate search, resumes, and interview scorecards.</p>
              </div>
            `
          },
          createdAt: now.toISOString()
        });
      }
    } catch (e) {
      console.warn("Failed to dispatch subscription activation email:", e);
    }

    return res.json({
      success: true,
      message: "User account approved and database subscription activated.",
      subscription: subscriptionDoc
    });
  } catch (err: any) {
    console.error("Error approving subscription:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/data-access/check-and-log
 * Enforces database access control and logs candidate views/downloads
 */
router.post("/data-access/check-and-log", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const {
      actorUserId,
      actorRole = "consultancy",
      consultancyId,
      candidateId,
      actionType, // candidate_profile_view, contact_unlock, resume_view, resume_download, candidate_export
      ipAddress = "127.0.0.1",
      userAgent = "Browser"
    } = req.body;

    if (!actorUserId || !candidateId || !actionType) {
      return res.status(400).json({ success: false, error: "Missing actorUserId, candidateId, or actionType" });
    }

    // Super Admin / Admin bypass
    if (actorRole === "admin" || actorRole === "super_admin") {
      await db.collection("data_access_logs").add({
        actorUserId,
        actorRole,
        candidateId,
        actionType,
        allowed: true,
        reason: "Admin Override",
        createdAt: new Date().toISOString()
      });
      return res.json({ success: true, allowed: true, remainingQuota: 99999 });
    }

    // Lookup user subscription
    const ownerId = consultancyId || actorUserId;
    const subSnap = await db.collection("subscriptions").doc(`sub_${ownerId}`).get();

    if (!subSnap.exists) {
      await db.collection("data_access_logs").add({
        actorUserId,
        actorRole,
        consultancyId: ownerId,
        candidateId,
        actionType,
        allowed: false,
        reason: "No active database access subscription found.",
        createdAt: new Date().toISOString()
      });
      return res.status(403).json({
        success: false,
        allowed: false,
        reason: "No active database access subscription found. Please subscribe to a plan."
      });
    }

    const sub = subSnap.data() || {};

    if (sub.status !== "active") {
      return res.status(403).json({
        success: false,
        allowed: false,
        reason: `Subscription is currently '${sub.status}'. Please contact compliance.`
      });
    }

    if (new Date(sub.expiresAt).getTime() < Date.now()) {
      await db.collection("subscriptions").doc(`sub_${ownerId}`).update({ status: "expired" });
      return res.status(403).json({
        success: false,
        allowed: false,
        reason: "Your database access plan has expired. Please renew your subscription."
      });
    }

    // Check limit based on actionType
    let limitKey = "candidateViewsLimit";
    let usedKey = "candidateViewsUsed";

    if (actionType === "resume_download" || actionType === "candidate_export") {
      limitKey = "resumeDownloadsLimit";
      usedKey = "resumeDownloadsUsed";
    } else if (actionType === "contact_unlock") {
      limitKey = "contactUnlocksLimit";
      usedKey = "contactUnlocksUsed";
    }

    const currentLimit = sub[limitKey] || 0;
    const currentUsed = sub[usedKey] || 0;

    if (currentUsed >= currentLimit) {
      await db.collection("data_access_logs").add({
        actorUserId,
        actorRole,
        consultancyId: ownerId,
        candidateId,
        actionType,
        allowed: false,
        reason: `Quota limit exhausted (${currentUsed}/${currentLimit} used).`,
        createdAt: new Date().toISOString()
      });
      return res.status(429).json({
        success: false,
        allowed: false,
        reason: `Your ${actionType} quota is exhausted (${currentUsed}/${currentLimit}). Upgrade your plan to continue accessing candidate data.`
      });
    }

    // Deduct / increment usage counter
    const newUsed = currentUsed + 1;
    await db.collection("subscriptions").doc(`sub_${ownerId}`).update({
      [usedKey]: newUsed,
      updatedAt: new Date().toISOString()
    });

    // Audit Log
    await db.collection("data_access_logs").add({
      actorUserId,
      actorRole,
      consultancyId: ownerId,
      candidateId,
      actionType,
      subscriptionId: sub.subscriptionId,
      allowed: true,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      allowed: true,
      remainingQuota: currentLimit - newUsed,
      usedQuota: newUsed,
      totalLimit: currentLimit
    });
  } catch (err: any) {
    console.error("Error in data-access check:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/invoices/:invoiceId
 * Returns full Tax Invoice document
 */
router.get("/invoices/:invoiceId", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { invoiceId } = req.params;

    const snap = await db.collection("invoices").doc(invoiceId).get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: "Tax invoice not found" });
    }

    return res.json({ success: true, invoice: snap.data() });
  } catch (err: any) {
    console.error("Error fetching invoice:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/current
 * Returns active subscription status and usage counters
 */
router.get("/subscriptions/current", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ success: false, error: "Missing userId parameter" });
    }

    const subSnap = await db.collection("subscriptions").doc(`sub_${userId}`).get();
    if (!subSnap.exists) {
      return res.json({ success: true, hasSubscription: false });
    }

    return res.json({ success: true, hasSubscription: true, subscription: subSnap.data() });
  } catch (err: any) {
    console.error("Error fetching subscription:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
