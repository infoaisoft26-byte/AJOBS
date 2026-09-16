import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { getPublicSiteUrl } from "./siteConfig.js";

const money = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function handlePaymentCheckoutRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/payments/create-order") return false;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Please sign in again before starting payment." });
      return true;
    }

    const decoded = await getFirebaseAuth().verifyIdToken(authHeader.slice(7).trim());
    const body: any = req.body || {};
    const userId = String(body.userId || decoded.uid).trim();
    const agreementId = String(body.agreementId || "").trim();
    if (!agreementId) {
      res.status(400).json({ success: false, error: "AGREEMENT_REQUIRED", message: "Signed agreement is required before payment." });
      return true;
    }
    if (userId !== decoded.uid) {
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

    const plan = agreement.planSummary || {};
    const baseAmount = money(plan.baseAmount ?? agreement.baseAmount, 499);
    const gstPercentage = money(plan.gstPercentage, 18);
    const gstAmount = money(plan.gstAmount ?? agreement.gstAmount, Number((baseAmount * gstPercentage / 100).toFixed(2)));
    const totalAmount = money(plan.totalAmount ?? agreement.totalAmount, Number((baseAmount + gstAmount).toFixed(2)));
    const planName = String(plan.planName || "AIJOBS Database Access Plan");

    const orderId = `order_aijobs_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();
    const user: any = userSnap.exists ? userSnap.data() || {} : {};
    const email = String(decoded.email || user.email || agreement.buyer?.email || "").trim();
    const phone = String(user.phone || user.mobile || agreement.buyer?.phone || "").replace(/[^0-9+]/g, "").trim();
    const customerName = String(user.name || user.displayName || agreement.buyer?.authorizedPerson || agreement.buyer?.legalName || "AIJOBS Partner").trim();

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!keyId || !keySecret) {
      const orderDoc = {
        orderId, userId, agreementId, planName, baseAmount, gstPercentage, gstAmount, totalAmount,
        currency: "INR", gateway: "razorpay", status: "gateway_not_configured", createdAt
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
