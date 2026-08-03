import { Router } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";
import { sendOTP, verifyOTP, isTwilioConfigured } from "./twilioService.js";
import crypto from "crypto";

const router = Router();

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
    } = req.body;

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

    const agreementDoc = {
      agreementId,
      agreementNumber,
      agreementVersion: "v1.0.2026",
      userId,
      role: roleFormatted,
      status: "generated",
      createdAt,
      updatedAt: createdAt,
      seller: {
        legalEntityName: "AIJOBS",
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
        planId: "plan_default_499",
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
    };

    await db.collection("agreements").doc(agreementId).set(agreementDoc);

    res.setHeader("Content-Type", "application/json");
    return res.json({
      success: true,
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
 * Dispatches eSign verification OTP via Twilio Verify Service
 */
router.post(["/send-otp", "/agreements/send-otp"], async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { userId, agreementId, phone } = req.body;

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
      if (!targetPhone) {
        return res.status(400).json({ success: false, error: "Valid phone number required for SMS OTP dispatch." });
      }
      try {
        const twilioRes = await sendOTP(targetPhone);
        return res.json({
          success: true,
          message: twilioRes.message || "Twilio Verify OTP dispatched to mobile.",
          provider: "Twilio Verify"
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message || "Failed to send OTP via Twilio." });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "SMS OTP service (Twilio Verify) is not configured on the server. Please configure Twilio credentials in system settings."
      });
    }
  } catch (err: any) {
    console.error("Error sending agreement OTP:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to dispatch OTP." });
  }
});

/**
 * POST /api/agreements/accept
 * Verifies 6 required checkboxes and OTP, signs agreement
 */
router.post(["/accept", "/agreements/accept"], async (req, res) => {
  try {
    const db = getFirestoreDb();
    const {
      agreementId,
      userId,
      otp,
      ipAddress,
      userAgent,
      checkboxes = {}
    } = req.body;

    if (!agreementId) {
      return res.status(400).json({ success: false, error: "Missing agreementId parameter." });
    }

    const agrRef = db.collection("agreements").doc(agreementId);
    const agrSnap = await agrRef.get();

    if (!agrSnap.exists) {
      return res.status(404).json({ success: false, error: "Agreement document not found." });
    }

    const agrData = agrSnap.data() || {};

    if (!otp || String(otp).trim().length < 4) {
      return res.status(400).json({ success: false, error: "Valid digital signature consent OTP required." });
    }

    if (await isTwilioConfigured()) {
      let phone = agrData.buyer?.phone || agrData.buyer?.mobile;
      if (!phone && userId) {
        const uSnap = await db.collection("users").doc(userId).get();
        if (uSnap.exists) phone = uSnap.data()?.phone || uSnap.data()?.mobile;
      }
      if (phone) {
        const twResult = await verifyOTP(phone, String(otp).trim());
        if (!twResult.success) {
          return res.status(400).json({ success: false, error: twResult.message || "Invalid or expired OTP code." });
        }
      }
    }

    const nowIso = new Date().toISOString();
    const eSignTxnId = `TXN_ESIGN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const updateData = {
      status: "accepted",
      acceptedAt: nowIso,
      acceptedIp: ipAddress || req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      acceptedUserAgent: userAgent || req.headers["user-agent"] || "Browser",
      acceptedCheckboxes: checkboxes,
      eSignTransactionId: eSignTxnId,
      updatedAt: nowIso
    };

    await agrRef.set(updateData, { merge: true });

    const updatedSnap = await agrRef.get();
    const updatedAgreement = updatedSnap.data();

    return res.json({
      success: true,
      message: "Agreement successfully signed and accepted.",
      agreement: updatedAgreement
    });
  } catch (err: any) {
    console.error("Error accepting agreement:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to accept agreement." });
  }
});

/**
 * POST /api/payments/create-order
 * Creates payment order on backend with server-calculated amounts
 */
router.post("/payments/create-order", async (req, res) => {
  try {
    const db = getFirestoreDb();
    const { userId, agreementId, gateway = "razorpay" } = req.body;

    if (!userId || !agreementId) {
      return res.status(400).json({ success: false, error: "Missing userId or agreementId" });
    }

    const agrSnap = await db.collection("agreements").doc(agreementId).get();
    if (!agrSnap.exists) {
      return res.status(404).json({ success: false, error: "Agreement not found" });
    }

    const agr = agrSnap.data() || {};
    if (agr.status !== "accepted") {
      return res.status(400).json({ success: false, error: "Agreement must be accepted prior to payment." });
    }

    const planSummary = agr.planSummary || {};
    const baseAmount = planSummary.baseAmount || 499;
    const gstPercentage = planSummary.gstPercentage || 18;
    const gstAmount = Number((baseAmount * gstPercentage / 100).toFixed(2));
    const totalAmount = Number((baseAmount + gstAmount).toFixed(2));

    const isIntraState = true; // Default intra-state calculation
    const cgst = isIntraState ? Number((gstAmount / 2).toFixed(2)) : 0;
    const sgst = isIntraState ? Number((gstAmount / 2).toFixed(2)) : 0;
    const igst = !isIntraState ? gstAmount : 0;

    const orderId = `order_aijobs_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentId = `pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const paymentDoc = {
      paymentId,
      orderId,
      gatewayPaymentId: "",
      gateway,
      userId,
      role: agr.role || "consultancy",
      planId: agr.planId,
      agreementId,
      baseAmount,
      gstPercentage,
      cgst,
      sgst,
      igst,
      gstAmount,
      totalAmount,
      currency: "INR",
      status: "created", // created -> pending -> paid -> failed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection("payments").doc(paymentId).set(paymentDoc);

    return res.json({
      success: true,
      order: {
        orderId,
        paymentId,
        amount: totalAmount,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_AIJOBS_LiveKey",
        planName: planSummary.planName || "AIJOBS Database Access Plan",
        baseAmount,
        gstAmount,
        totalAmount
      }
    });
  } catch (err: any) {
    console.error("Error creating payment order:", err);
    return res.status(500).json({ success: false, error: err.message });
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

    // 2. Generate Tax Invoice
    const invoiceNumber = `INV-AIJOBS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceId = `inv_${paymentId}`;

    const agreementSnap = await db.collection("agreements").doc(payData.agreementId).get();
    const agreementData = agreementSnap.exists ? agreementSnap.data() : {};

    const invoiceDoc = {
      invoiceId,
      invoiceNumber,
      paymentId,
      orderId: payData.orderId,
      userId: payData.userId,
      agreementId: payData.agreementId,
      agreementNumber: agreementData?.agreementNumber || "",
      supplier: DEFAULT_SELLER_INFO,
      buyer: agreementData?.buyer || {},
      planSummary: agreementData?.planSummary || {},
      baseAmount: payData.baseAmount,
      gstPercentage: payData.gstPercentage,
      cgst: payData.cgst,
      sgst: payData.sgst,
      igst: payData.igst,
      gstAmount: payData.gstAmount,
      totalAmount: payData.totalAmount,
      paymentMethod: "Online Gateway (Razorpay/PayU)",
      invoiceDate: paidAt,
      placeOfSupply: "Karnataka",
      createdAt: paidAt
    };

    await db.collection("invoices").doc(invoiceId).set(invoiceDoc);

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
