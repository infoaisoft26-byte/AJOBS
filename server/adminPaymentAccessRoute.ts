import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

function normalizeRole(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function clean(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export async function handleAdminPaymentAccessRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/payment/verify-and-transition") return false;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
    return true;
  }

  try {
    const body: any = req.body || {};
    const targetUserId = clean(body.userId || body.targetUserId, 180);
    const adminUid = clean(body.adminUid || body.reqAdminUid || body.grantedByAdminId, 180);
    const reviewedBy = clean(body.reviewedBy || body.adminUserId || adminUid || "AIJOBS Admin", 180);
    const reason = clean(body.reason || body.adminNotes || "Payment marked complete by Admin and database access manually activated.", 1000);
    const requestedDays = Number(body.accessDays || 30);
    const accessDays = Number.isFinite(requestedDays) ? Math.max(1, Math.min(365, Math.round(requestedDays))) : 30;
    const requestedAmount = Number(body.amountPaid ?? 588.82);
    const amountPaid = Number.isFinite(requestedAmount) && requestedAmount >= 0 ? Number(requestedAmount.toFixed(2)) : 588.82;

    if (!targetUserId) {
      res.status(400).json({ success: false, error: "USER_ID_REQUIRED", message: "Target recruiter/consultancy user ID is required." });
      return true;
    }
    if (!adminUid) {
      // adminUid is injected only after server-side Firebase Admin verification by adminApiGateway.
      res.status(403).json({ success: false, error: "ADMIN_VERIFICATION_REQUIRED", message: "Verified Admin session is required." });
      return true;
    }

    const db = getFirestoreDb();
    const userRef = db.collection("users").doc(targetUserId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      res.status(404).json({ success: false, error: "USER_NOT_FOUND", message: "Recruiter/Consultancy account was not found." });
      return true;
    }

    const user: any = userSnap.data() || {};
    const role = normalizeRole(user.role);
    if (!["recruiter", "consultancy", "agency"].includes(role)) {
      res.status(400).json({ success: false, error: "ROLE_NOT_ELIGIBLE", message: "Manual database access can only be granted to Recruiter or Consultancy accounts." });
      return true;
    }

    const currentStatus = normalizeRole(user.accountStatus || user.status);
    if (["suspended", "blocked", "disabled", "rejected"].includes(currentStatus)) {
      res.status(409).json({ success: false, error: "ACCOUNT_BLOCKED", message: "This account is suspended/rejected. Resolve the account status before granting access." });
      return true;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + accessDays * 24 * 60 * 60 * 1000).toISOString();
    const paymentId = `manual_${targetUserId}_${Date.now()}`;

    const activation = {
      paymentStatus: "paid",
      paymentVerified: true,
      paymentAmount: amountPaid,
      paymentCurrency: "INR",
      paymentGateway: "admin_manual_override",
      paymentMethod: "admin_override",
      paymentTxnId: paymentId,
      paymentVerifiedAt: nowIso,
      paidAt: nowIso,
      paymentVerifiedBy: adminUid,
      paymentBypass: true,
      paymentBypassReason: reason,
      candidateDatabaseAccess: true,
      candidateDatabaseAccessStatus: "active",
      databaseAccessStatus: "active",
      dataAccessEnabled: true,
      dataAccessGrantedAt: nowIso,
      dataAccessGrantedBy: adminUid,
      subscriptionStatus: "active",
      planStatus: "active",
      subscription: user.subscription || "AIJOBS Database Access Plan",
      pricingPlan: user.pricingPlan || "Database Access",
      subscriptionStartAt: nowIso,
      subscriptionExpiresAt: expiresAt,
      planActivatedAt: nowIso,
      planExpiresAt: expiresAt,
      accountStatus: "active",
      status: "active",
      isApproved: true,
      manualAccessOverride: true,
      manualAccessOverrideAt: nowIso,
      manualAccessOverrideBy: adminUid,
      updatedAt: nowIso
    };

    const roleCollection = role === "recruiter" ? "recruiters" : "consultancies";
    const batch = db.batch();
    batch.set(userRef, activation, { merge: true });
    batch.set(db.collection(roleCollection).doc(targetUserId), activation, { merge: true });
    batch.set(db.collection("payments").doc(paymentId), {
      paymentId,
      userId: targetUserId,
      role,
      amount: amountPaid,
      currency: "INR",
      status: "paid",
      source: "admin_manual_override",
      gateway: "admin_manual_override",
      externalGatewayCharge: false,
      manuallyVerified: true,
      verifiedBy: adminUid,
      reviewedBy,
      reason,
      createdAt: nowIso,
      verifiedAt: nowIso
    }, { merge: true });
    batch.set(db.collection("subscriptions").doc(targetUserId), {
      userId: targetUserId,
      role,
      status: "active",
      planName: user.subscription || "AIJOBS Database Access Plan",
      activationSource: "admin_manual_override",
      paymentId,
      startedAt: nowIso,
      expiresAt,
      updatedAt: nowIso,
      activatedBy: adminUid
    }, { merge: true });
    batch.set(db.collection("activity_logs").doc(`manual_access_${Date.now()}_${targetUserId}`), {
      userId: adminUid,
      userName: reviewedBy,
      role: "admin",
      action: "MANUAL_PAYMENT_AND_DATABASE_ACCESS_GRANTED",
      details: `Admin manually marked payment complete and activated candidate database access for ${targetUserId} (${role}). Reason: ${reason}`,
      entityType: "user",
      entityId: targetUserId,
      createdAt: nowIso
    });
    batch.set(db.collection("onboarding_timelines").doc(`tl_${targetUserId}_${Date.now()}`), {
      userId: targetUserId,
      title: "Admin Payment Override & Database Access Activated",
      description: `Payment manually marked paid and candidate database access enabled for ${accessDays} day(s).`,
      actor: reviewedBy,
      actorUid: adminUid,
      source: "admin_manual_override",
      timestamp: nowIso
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: "Payment marked complete and candidate database access activated by Admin.",
      userId: targetUserId,
      role,
      paymentStatus: "paid",
      accountStatus: "active",
      candidateDatabaseAccess: true,
      subscriptionStatus: "active",
      subscriptionExpiresAt: expiresAt,
      paymentId,
      accessDays
    });
    return true;
  } catch (error: any) {
    console.error("[AdminPaymentAccessRoute]", error?.message || error);
    res.status(500).json({ success: false, error: "MANUAL_ACCESS_FAILED", message: error?.message || "Could not activate manual database access." });
    return true;
  }
}
