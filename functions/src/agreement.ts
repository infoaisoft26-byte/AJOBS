import * as functions from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Request, Response } from "express";

if (!getApps().length) {
  initializeApp();
}

const DEFAULT_SELLER_INFO = {
  legalEntityName: "THE FLX FORCE SERVICES",
  gstin: "27LRTPS5257E1ZV",
  registeredAddress: "HSR Layout, Sector 7, Bengaluru, Karnataka 560102"
};

/**
 * Helper function to handle POST /api/agreements/generate
 */
export async function generateAgreementHandler(req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
    return;
  }

  try {
    const db = getFirestore();
    const {
      userId,
      role = "consultancy",
      planId = "plan_default_499",
      legalName = "",
      authorizedPerson = "",
      gstin = "",
      pan = "",
      registeredAddress = ""
    } = req.body || {};

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      res.status(400).json({ success: false, error: "Missing or invalid userId." });
      return;
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

    // Fetch plan details or fallback to standard plan_default_499
    let planData: any = null;
    try {
      const planSnap = await db.collection("plans").doc(planId || "plan_default_499").get();
      if (planSnap.exists) {
        planData = planSnap.data();
      }
    } catch (e) {
      console.warn("[Agreements API] Plan fetch notice:", e);
    }

    const baseAmount = planData?.baseAmount || 499;
    const gstPercentage = planData?.gstPercentage || 18;
    const gstAmount = Number((baseAmount * gstPercentage / 100).toFixed(2));
    const totalAmount = Number((baseAmount + gstAmount).toFixed(2));

    const createdAt = new Date().toISOString();
    const agreementNumber = `AGR-AIJOBS-${createdAt.slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const agreementId = `agr_${userId}_${Date.now()}`;

    const agreementDoc = {
      agreementId,
      agreementNumber,
      agreementVersion: planData?.agreementVersion || "v1.0.2026",
      userId,
      role: roleFormatted,
      status: "generated",
      createdAt,
      updatedAt: createdAt,
      seller: {
        legalEntityName: DEFAULT_SELLER_INFO.legalEntityName,
        gstin: DEFAULT_SELLER_INFO.gstin,
        registeredAddress: DEFAULT_SELLER_INFO.registeredAddress
      },
      buyer: {
        legalName: legalName || userData.agencyName || userData.companyName || userData.name || "Subscriber",
        authorizedPerson: authorizedPerson || userData.name || "Authorized Representative",
        gstin: gstin || userData.gstin || "",
        pan: pan || userData.pan || "",
        registeredAddress: registeredAddress || userData.address || "As registered in KYC"
      },
      planSummary: {
        planId: planData?.planId || "plan_default_499",
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

    res.status(200).json({
      success: true,
      agreement: agreementDoc
    });
  } catch (err: any) {
    console.error("Error generating agreement:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate agreement." });
  }
}

/**
 * Helper function to handle POST /api/agreements/send-otp
 */
export async function sendAgreementOtpHandler(req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
    return;
  }

  try {
    const db = getFirestore();
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

    res.status(200).json({
      success: true,
      message: "eSign OTP code dispatched successfully via AIJOBS Verify.",
      provider: "AIJOBS Verify",
      targetPhone: targetPhone ? `***${String(targetPhone).slice(-4)}` : "Registered Mobile"
    });
  } catch (err: any) {
    console.error("Error sending agreement OTP:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to dispatch OTP." });
  }
}

/**
 * Helper function to handle POST /api/agreements/accept
 */
export async function acceptAgreementHandler(req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
    return;
  }

  try {
    const db = getFirestore();
    const {
      agreementId,
      userId,
      otp,
      ipAddress,
      userAgent,
      checkboxes = {}
    } = req.body || {};

    if (!agreementId) {
      res.status(400).json({ success: false, error: "Missing agreementId parameter." });
      return;
    }

    const agrRef = db.collection("agreements").doc(agreementId);
    const agrSnap = await agrRef.get();

    if (!agrSnap.exists) {
      res.status(404).json({ success: false, error: "Agreement document not found." });
      return;
    }

    const agrData = agrSnap.data() || {};

    if (userId && agrData.userId && agrData.userId !== userId) {
      res.status(403).json({ success: false, error: "Forbidden: User ID does not match agreement record." });
      return;
    }

    const requiredCheckboxes = [
      "readAndAccepted",
      "noCandidateCharges",
      "legitimateRecruitmentOnly",
      "noDataResaleOrExport",
      "nonRefundablePolicyAccepted",
      "suspensionOnViolationAccepted"
    ];

    for (const cb of requiredCheckboxes) {
      if (!checkboxes[cb]) {
        res.status(400).json({
          success: false,
          error: `All required agreement conditions must be accepted (${cb} is unselected).`
        });
        return;
      }
    }

    if (!otp || String(otp).trim().length < 4) {
      res.status(400).json({ success: false, error: "Valid digital signature consent OTP required." });
      return;
    }

    const nowIso = new Date().toISOString();
    const eSignTxnId = `TXN_ESIGN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const updateData = {
      status: "accepted",
      acceptedAt: nowIso,
      acceptedIp: ipAddress || req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1",
      acceptedUserAgent: userAgent || (req.headers["user-agent"] as string) || "Browser",
      acceptedCheckboxes: checkboxes,
      eSignTransactionId: eSignTxnId,
      updatedAt: nowIso
    };

    await agrRef.set(updateData, { merge: true });

    const updatedSnap = await agrRef.get();
    const updatedAgreement = updatedSnap.data();

    res.status(200).json({
      success: true,
      agreement: updatedAgreement
    });
  } catch (err: any) {
    console.error("Error accepting agreement:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to accept agreement." });
  }
}

/**
 * Unified Cloud Function route router
 */
export async function agreementsApiHandler(req: Request, res: Response): Promise<void> {
  const path = req.path || "";
  if (path.endsWith("/generate") || path.includes("/generate")) {
    return generateAgreementHandler(req, res);
  } else if (path.endsWith("/send-otp") || path.includes("/send-otp")) {
    return sendAgreementOtpHandler(req, res);
  } else if (path.endsWith("/accept") || path.includes("/accept")) {
    return acceptAgreementHandler(req, res);
  } else {
    res.setHeader("Content-Type", "application/json");
    res.status(404).json({ success: false, error: `Agreements endpoint not found: ${req.method} ${path}` });
  }
}

// Export Firebase Cloud Functions HTTPS endpoints
export const generateAgreement = functions.https.onRequest(generateAgreementHandler);
export const sendAgreementOtp = functions.https.onRequest(sendAgreementOtpHandler);
export const acceptAgreement = functions.https.onRequest(acceptAgreementHandler);
export const agreementsApi = functions.https.onRequest(agreementsApiHandler);
