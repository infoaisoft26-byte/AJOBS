import type { Request, Response } from "express";
import crypto from "crypto";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { getPublicSiteUrl } from "./siteConfig.js";

const money = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function handlePaymentCheckoutRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/payments/create-order" && path !== "/api/payments/verify-return") return false;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  try {
    const body: any = req.body || {};
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Please sign in again before continuing payment." });
      return true;
    }
    const decoded: any = await getFirebaseAuth().verifyIdToken(authHeader.slice(7).trim());

    if (path === "/api/payments/verify-return") {
      const orderId = String(body.orderId || "").trim();
      const razorpayPaymentId = String(body.razorpay_payment_id || body.razorpayPaymentId || "").trim();
      const razorpayPaymentLinkId = String(body.razorpay_payment_link_id || body.razorpayPaymentLinkId || "").trim();
      const razorpayReferenceId = String(body.razorpay_payment_link_reference_id || body.razorpayReferenceId || orderId).trim();
      const razorpayStatus = String(body.razorpay_payment_link_status || body.razorpayStatus || "").trim().toLowerCase();
      const razorpaySignature = String(body.razorpay_signature || body.razorpaySignature || "").trim();

      if (!orderId) {
        res.status(400).json({ success: false, error: "ORDER_ID_REQUIRED", message: "Payment order ID is missing." });
        return true;
      }

      const db = getFirestoreDb();
      const orderRef = db.collection("payment_orders").doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        res.status(404).json({ success: false, error: "ORDER_NOT_FOUND", message: "AIJOBS payment order was not found." });
        return true;
      }
      const order: any = orderSnap.data() || {};
      if (order.userId !== decoded.uid) {
        res.status(403).json({ success: false, error: "FORBIDDEN", message: "This payment does not belong to your account." });
        return true;
      }

      const existingSubRef = db.collection("subscriptions").doc(`sub_${decoded.uid}`);
      const existingSubSnap = await existingSubRef.get();
      if (String(order.status || "").toLowerCase() === "paid") {
        const subscription = existingSubSnap.exists ? existingSubSnap.data() : null;
        res.json({ success: true, alreadyPaid: true, order: { ...order, orderId }, subscription });
        return true;
      }

      const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
      const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
      if (!keyId || !keySecret) {
        res.status(503).json({ success: false, error: "PAYMENT_GATEWAY_NOT_CONFIGURED", message: "Razorpay server credentials are missing." });
        return true;
      }

      const linkId = razorpayPaymentLinkId || String(order.razorpayPaymentLinkId || "");
      if (!linkId) {
        res.status(400).json({ success: false, error: "PAYMENT_LINK_ID_REQUIRED", message: "Razorpay payment link ID is missing." });
        return true;
      }

      if (razorpaySignature && razorpayPaymentId && razorpayStatus) {
        const signaturePayload = `${linkId}|${razorpayReferenceId}|${razorpayStatus}|${razorpayPaymentId}`;
        const expected = crypto.createHmac("sha256", keySecret).update(signaturePayload).digest("hex");
        const a = Buffer.from(expected, "utf8");
        const b = Buffer.from(razorpaySignature, "utf8");
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          res.status(400).json({ success: false, error: "INVALID_PAYMENT_SIGNATURE", message: "Razorpay payment signature verification failed." });
          return true;
        }
      }

      const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const verifyRes = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`, {
        headers: { Authorization: `Basic ${basic}` }
      });
      const verifyText = await verifyRes.text();
      let verifiedLink: any = null;
      try { verifiedLink = JSON.parse(verifyText); } catch { verifiedLink = null; }
      if (!verifyRes.ok) {
        res.status(502).json({ success: false, error: "RAZORPAY_VERIFY_FAILED", message: verifiedLink?.error?.description || "Unable to verify Razorpay payment." });
        return true;
      }
      if (String(verifiedLink?.reference_id || "") !== orderId || String(verifiedLink?.status || "").toLowerCase() !== "paid") {
        res.status(409).json({ success: false, error: "PAYMENT_NOT_CONFIRMED", message: "Razorpay has not confirmed this payment as paid yet." });
        return true;
      }

      const agreementRef = db.collection("agreements").doc(String(order.agreementId || ""));
      const agreementSnap = order.agreementId ? await agreementRef.get() : null;
      const agreement: any = agreementSnap?.exists ? agreementSnap.data() || {} : {};
      const plan = agreement.planSummary || {};
      const now = new Date();
      const paidAt = now.toISOString();
      const validityDays = Number(plan.validityDays || 30);
      const expiresAt = new Date(now.getTime() + validityDays * 86400000).toISOString();
      const subscriptionId = `sub_${decoded.uid}`;
      const subscription = {
        subscriptionId,
        userId: decoded.uid,
        role: agreement.role || "recruiter",
        planId: plan.planId || "plan_default_499",
        planName: plan.planName || order.planName || "AIJOBS Database Access Plan",
        agreementId: order.agreementId || "",
        orderId,
        razorpayPaymentId: razorpayPaymentId || null,
        status: "active",
        paymentStatus: "paid",
        startsAt: paidAt,
        expiresAt,
        candidateViewsLimit: Number(plan.candidateViewLimit || 500),
        candidateViewsUsed: 0,
        resumeDownloadsLimit: Number(plan.resumeDownloadLimit || 50),
        resumeDownloadsUsed: 0,
        contactUnlocksLimit: Number(plan.contactUnlockLimit || 10),
        contactUnlocksUsed: 0,
        jobPostLimit: Number(plan.jobPostLimit || 5),
        recruiterSeatLimit: Number(plan.recruiterSeatLimit || 3),
        updatedAt: paidAt
      };

      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(orderRef);
        const freshOrder: any = fresh.data() || {};
        if (String(freshOrder.status || "").toLowerCase() === "paid") return;

        tx.set(orderRef, {
          status: "paid",
          paymentStatus: "paid",
          paidAt,
          updatedAt: paidAt,
          razorpayPaymentId: razorpayPaymentId || freshOrder.razorpayPaymentId || null,
          razorpayPaymentLinkId: linkId,
          gatewayVerified: true
        }, { merge: true });

        tx.set(existingSubRef, subscription, { merge: true });

        if (order.agreementId) {
          tx.set(agreementRef, {
            paymentStatus: "paid",
            paymentOrderId: orderId,
            subscriptionStatus: "active",
            paidAt,
            updatedAt: paidAt
          }, { merge: true });
        }

        const accessUpdate = {
          paymentStatus: "paid",
          subscriptionStatus: "active",
          activePlanId: subscription.planId,
          subscriptionId,
          lastPaymentOrderId: orderId,
          accountStatus: "active_limited",
          updatedAt: paidAt
        };
        tx.set(db.collection("users").doc(decoded.uid), accessUpdate, { merge: true });
        tx.set(db.collection("recruiters").doc(decoded.uid), accessUpdate, { merge: true });
        tx.set(db.collection("verification_requests").doc(`verif_${decoded.uid}`), {
          paymentStatus: "paid",
          subscriptionStatus: "active",
          paymentOrderId: orderId,
          paidAt,
          updatedAt: paidAt
        }, { merge: true });
      });

      res.json({
        success: true,
        message: "Payment verified. Your AIJOBS plan is active.",
        order: { ...order, orderId, status: "paid", paidAt },
        subscription
      });
      return true;
    }

    const userId = String(body.userId || decoded?.uid || "").trim();
    const agreementId = String(body.agreementId || "").trim();
    if (!userId || !agreementId) {
      res.status(400).json({ success: false, error: "PAYMENT_CONTEXT_REQUIRED", message: "Signed agreement and account are required before payment." });
      return true;
    }
    if (decoded?.uid && userId !== decoded.uid) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "Payment account mismatch." });
      return true;
    }

    const db = getFirestoreDb();
    const [agreementSnap, userSnap] = await Promise.all([
      db.collection("agreements").doc(agreementId).get(),
      db.collection("users").doc(userId).get()
    ]);
    if (!agreementSnap.exists) {
      res.status(404).json({ success: false, error: "AGREEMENT_NOT_FOUND", message: "Signed agreement was not found." });
      return true;
    }

    const agreement: any = agreementSnap.data() || {};
    if (agreement.userId && agreement.userId !== userId) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "This agreement does not belong to your account." });
      return true;
    }
    if (String(agreement.status || "").toLowerCase() !== "accepted") {
      res.status(409).json({ success: false, error: "AGREEMENT_NOT_ACCEPTED", message: "Please complete OTP agreement signing before payment." });
      return true;
    }

    if (agreement.paymentStatus === "paid" || (userSnap.exists && ["paid", "active"].includes(String((userSnap.data() as any)?.paymentStatus || (userSnap.data() as any)?.subscriptionStatus || "").toLowerCase()))) {
      const subSnap = await db.collection("subscriptions").doc(`sub_${userId}`).get();
      res.json({ success: true, alreadyPaid: true, message: "Plan already paid and activated.", subscription: subSnap.exists ? subSnap.data() : null });
      return true;
    }

    if (agreement.paymentOrderId) {
      const existingOrderSnap = await db.collection("payment_orders").doc(String(agreement.paymentOrderId)).get();
      if (existingOrderSnap.exists) {
        const existingOrder: any = existingOrderSnap.data() || {};
        if (["created", "pending"].includes(String(existingOrder.status || "").toLowerCase()) && existingOrder.checkoutUrl) {
          res.json({ success: true, reusedOrder: true, message: "Existing secure Razorpay checkout reused.", order: existingOrder });
          return true;
        }
      }
    }

    const plan = agreement.planSummary || {};
    const baseAmount = money(plan.baseAmount ?? agreement.baseAmount, 499);
    const gstPercentage = money(plan.gstPercentage, 18);
    const gstAmount = money(plan.gstAmount ?? agreement.gstAmount, Number((baseAmount * gstPercentage / 100).toFixed(2)));
    const totalAmount = money(plan.totalAmount ?? agreement.totalAmount, Number((baseAmount + gstAmount).toFixed(2)));
    const planName = String(plan.planName || "AIJOBS Database Access Plan");

    const orderId = `order_aijobs_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();
    const user: any = userSnap.exists ? userSnap.data() || {} : {};
    const email = String(decoded?.email || user.email || agreement.userEmail || agreement.buyer?.email || "").trim();
    const phone = String(user.phone || user.mobile || agreement.buyer?.phone || "").replace(/[^0-9+]/g, "").trim();
    const customerName = String(user.name || user.displayName || agreement.buyer?.authorizedPerson || agreement.buyer?.legalName || "AIJOBS Partner").trim();

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!keyId || !keySecret) {
      const orderDoc = {
        orderId, userId, agreementId, planName, baseAmount, gstPercentage, gstAmount, totalAmount,
        amount: totalAmount, currency: "INR", gateway: "razorpay", status: "gateway_not_configured", createdAt
      };
      await db.collection("payment_orders").doc(orderId).set(orderDoc, { merge: true });
      res.status(503).json({
        success: false,
        error: "PAYMENT_GATEWAY_NOT_CONFIGURED",
        message: "Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel Environment Variables and redeploy.",
        order: orderDoc
      });
      return true;
    }

    const callbackUrl = `${getPublicSiteUrl()}/recruiter/dashboard?payment=return&orderId=${encodeURIComponent(orderId)}`;
    const paymentLinkPayload: any = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      accept_partial: false,
      description: `${planName} - AIJOBS`,
      reference_id: orderId,
      reminder_enable: true,
      callback_url: callbackUrl,
      callback_method: "get",
      notes: { userId, agreementId, orderId, planName }
    };
    if (email || phone || customerName) {
      paymentLinkPayload.customer = {
        ...(customerName ? { name: customerName } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { contact: phone } : {})
      };
      paymentLinkPayload.notify = { sms: Boolean(phone), email: Boolean(email) };
    }

    const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const razorRes = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify(paymentLinkPayload)
    });
    const razorText = await razorRes.text();
    let razorData: any = null;
    try { razorData = JSON.parse(razorText); } catch { razorData = null; }
    if (!razorRes.ok || !razorData?.short_url) {
      console.error("[Razorpay Payment Link Error]", razorRes.status, razorText.slice(0, 1000));
      res.status(502).json({
        success: false,
        error: "RAZORPAY_CREATE_FAILED",
        message: razorData?.error?.description || "Razorpay checkout could not be created. Please verify Razorpay keys and account activation."
      });
      return true;
    }

    const orderDoc = {
      orderId,
      userId,
      agreementId,
      planName,
      baseAmount,
      gstPercentage,
      gstAmount,
      totalAmount,
      amount: totalAmount,
      currency: "INR",
      gateway: "razorpay",
      status: "created",
      razorpayPaymentLinkId: razorData.id || null,
      paymentLink: razorData.short_url,
      checkoutUrl: razorData.short_url,
      callbackUrl,
      createdAt,
      updatedAt: createdAt
    };
    await db.collection("payment_orders").doc(orderId).set(orderDoc, { merge: true });
    await agreementSnap.ref.set({ paymentOrderId: orderId, paymentStatus: "pending", updatedAt: createdAt }, { merge: true });

    res.json({ success: true, message: "Secure Razorpay checkout created.", order: orderDoc });
    return true;
  } catch (error: any) {
    console.error("[/api/payments/create-order]", error?.message || error);
    const authError = String(error?.code || "").startsWith("auth/");
    res.status(authError ? 401 : 500).json({
      success: false,
      error: authError ? "UNAUTHORIZED" : "PAYMENT_ORDER_FAILED",
      message: authError ? "Your login session expired. Please sign in again." : (error?.message || "Payment checkout could not be created.")
    });
    return true;
  }
}
