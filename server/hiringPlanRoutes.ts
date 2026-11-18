import { Router } from "express";
import crypto from "crypto";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { getPublicSiteUrl } from "./siteConfig.js";
import { processPaymentAccounting } from "./accountingEngine.js";

const router = Router();

const PLAN_CATALOG: Record<string, {
  name: string; amount: number; jobCredits: number; databaseCredits: number; validityDays: number;
}> = {
  pack_1: { name: "Single Job Post", amount: 1499, jobCredits: 1, databaseCredits: 0, validityDays: 30 },
  pack_5: { name: "Growth Pack (5 Jobs)", amount: 5999, jobCredits: 5, databaseCredits: 0, validityDays: 90 },
  pack_10: { name: "Scale Pack (10 Jobs)", amount: 9999, jobCredits: 10, databaseCredits: 0, validityDays: 180 },
  pack_25: { name: "Enterprise Pack (25 Jobs)", amount: 19999, jobCredits: 25, databaseCredits: 0, validityDays: 365 },
  db_starter: { name: "Starter DB Pack", amount: 4999, jobCredits: 0, databaseCredits: 100, validityDays: 90 },
  db_pro: { name: "Pro Sourcing Pack", amount: 18999, jobCredits: 0, databaseCredits: 500, validityDays: 180 },
  db_enterprise: { name: "Enterprise DB Pool", amount: 54999, jobCredits: 0, databaseCredits: 2000, validityDays: 365 }
};

async function requireUser(req: any, res: any) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Please sign in before purchasing a plan." });
    return null;
  }
  try {
    return await getFirebaseAuth().verifyIdToken(header.slice(7).trim());
  } catch {
    res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Your login session expired. Please sign in again." });
    return null;
  }
}

async function getVerifiedPaymentLink(linkId: string) {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) throw new Error("PAYMENT_GATEWAY_NOT_CONFIGURED");
  const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`, {
    headers: { Authorization: `Basic ${basic}` }
  });
  const raw = await response.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch { data = null; }
  if (!response.ok) throw new Error(data?.error?.description || "Razorpay payment verification failed.");
  return data;
}

router.get("/history", async (req, res) => {
  const decoded = await requireUser(req, res);
  if (!decoded) return;
  try {
    const db = getFirestoreDb();
    const [creditSnap, subSnap, orderSnap] = await Promise.all([
      db.collection("jobCredits").doc(decoded.uid).get(),
      db.collection("subscriptions").doc(`sub_${decoded.uid}`).get(),
      db.collection("payment_orders").where("userId", "==", decoded.uid).limit(25).get()
    ]);
    const orders = orderSnap.docs
      .map((doc: any) => ({ ...doc.data(), orderId: doc.id }))
      .filter((order: any) => order.purchaseType === "hiring_plan")
      .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return void res.json({
      success: true,
      credits: creditSnap.exists ? creditSnap.data() : {},
      subscription: subSnap.exists ? subSnap.data() : null,
      orders
    });
  } catch (error: any) {
    return void res.status(500).json({ success: false, error: error?.message || "PLAN_HISTORY_FAILED" });
  }
});

router.post("/create-order", async (req, res) => {
  const decoded = await requireUser(req, res);
  if (!decoded) return;
  try {
    const planId = String(req.body?.planId || "");
    const plan = PLAN_CATALOG[planId];
    if (!plan) return void res.status(400).json({ success: false, error: "INVALID_PLAN", message: "Please select a valid AIJOBS plan." });
    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!keyId || !keySecret) return void res.status(503).json({ success: false, error: "PAYMENT_GATEWAY_NOT_CONFIGURED", message: "Razorpay credentials are not configured for production." });

    const db = getFirestoreDb();
    const uid = decoded.uid;
    const userSnap = await db.collection("users").doc(uid).get();
    const user: any = userSnap.exists ? userSnap.data() || {} : {};
    const role = String(user.role || "employer").toLowerCase();
    if (!["employer", "recruiter", "consultancy", "admin", "super_admin"].includes(role)) {
      return void res.status(403).json({ success: false, error: "ROLE_NOT_ALLOWED", message: "This account cannot purchase hiring plans." });
    }

    const orderId = `hplan_${uid.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const createdAt = new Date().toISOString();
    const callbackUrl = `${getPublicSiteUrl()}/?planPayment=return&orderId=${encodeURIComponent(orderId)}`;
    const payload: any = {
      amount: plan.amount * 100,
      currency: "INR",
      accept_partial: false,
      description: `${plan.name} - AIJOBS`,
      reference_id: orderId,
      reminder_enable: true,
      callback_url: callbackUrl,
      callback_method: "get",
      notes: { userId: uid, orderId, planId, planName: plan.name, purchaseType: "hiring_plan" }
    };
    const email = String(decoded.email || user.email || "").trim();
    const phone = String(user.phone || user.mobile || "").replace(/[^0-9+]/g, "");
    const name = String(user.name || user.displayName || "AIJOBS Partner");
    if (email || phone || name) {
      payload.customer = { ...(name ? { name } : {}), ...(email ? { email } : {}), ...(phone ? { contact: phone } : {}) };
      payload.notify = { email: Boolean(email), sms: Boolean(phone) };
    }

    const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify(payload)
    });
    const raw = await response.text();
    let razor: any = null;
    try { razor = JSON.parse(raw); } catch { razor = null; }
    if (!response.ok || !razor?.short_url) {
      return void res.status(502).json({ success: false, error: "RAZORPAY_CREATE_FAILED", message: razor?.error?.description || "Unable to create secure Razorpay checkout." });
    }

    const order = {
      orderId, userId: uid, role, planId, planName: plan.name,
      jobCredits: plan.jobCredits, databaseCredits: plan.databaseCredits,
      validityDays: plan.validityDays, amount: plan.amount, totalAmount: plan.amount,
      currency: "INR", gateway: "razorpay", status: "created",
      razorpayPaymentLinkId: razor.id, checkoutUrl: razor.short_url,
      callbackUrl, createdAt, updatedAt: createdAt, purchaseType: "hiring_plan"
    };
    await db.collection("payment_orders").doc(orderId).set(order);
    return void res.json({ success: true, orderId, checkoutUrl: razor.short_url, planName: plan.name, amount: plan.amount });
  } catch (error: any) {
    console.error("[Hiring plan create-order]", error?.message || error);
    return void res.status(500).json({ success: false, error: error?.message || "PLAN_CHECKOUT_FAILED" });
  }
});

router.get("/status/:orderId", async (req, res) => {
  const decoded = await requireUser(req, res);
  if (!decoded) return;
  try {
    const orderId = String(req.params.orderId || "").trim();
    const db = getFirestoreDb();
    const orderRef = db.collection("payment_orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return void res.status(404).json({ success: false, error: "ORDER_NOT_FOUND" });
    const order: any = orderSnap.data() || {};
    if (order.userId !== decoded.uid) return void res.status(403).json({ success: false, error: "FORBIDDEN" });
    if (order.purchaseType !== "hiring_plan") return void res.status(400).json({ success: false, error: "INVALID_ORDER_TYPE" });
    if (String(order.status).toLowerCase() === "paid") return void res.json({ success: true, status: "paid", order });

    const linkId = String(order.razorpayPaymentLinkId || "");
    if (!linkId) return void res.status(409).json({ success: false, error: "PAYMENT_LINK_MISSING" });
    const verified = await getVerifiedPaymentLink(linkId);
    if (String(verified?.reference_id || "") !== orderId) {
      return void res.status(409).json({ success: false, error: "PAYMENT_REFERENCE_MISMATCH" });
    }
    if (String(verified?.status || "").toLowerCase() !== "paid") {
      return void res.json({ success: true, status: String(verified?.status || "pending").toLowerCase(), order });
    }

    const paidAt = new Date().toISOString();
    const paymentId = String(verified?.payments?.[0]?.payment_id || `razorpay_${orderId}`);
    const creditRef = db.collection("jobCredits").doc(decoded.uid);
    const subscriptionRef = db.collection("subscriptions").doc(`sub_${decoded.uid}`);
    const userRef = db.collection("users").doc(decoded.uid);
    let alreadyPaid = false;

    await db.runTransaction(async (tx: any) => {
      const [freshOrderSnap, creditSnap, subSnap] = await Promise.all([
        tx.get(orderRef), tx.get(creditRef), tx.get(subscriptionRef)
      ]);
      const freshOrder: any = freshOrderSnap.data() || {};
      if (String(freshOrder.status || "").toLowerCase() === "paid") {
        alreadyPaid = true;
        return;
      }
      const current: any = creditSnap.exists ? creditSnap.data() || {} : {};
      const nextPaid = Math.max(0, Number(current.paidCredits) || 0) + Number(order.jobCredits || 0);
      const nextDb = Math.max(0, Number(current.databaseCredits) || 0) + Number(order.databaseCredits || 0);
      const expiresAt = new Date(Date.now() + Number(order.validityDays || 30) * 86400000).toISOString();
      const maxExpiry = (oldValue: any, nextValue: string) => {
        const oldDate = oldValue ? new Date(oldValue).getTime() : 0;
        const nextDate = new Date(nextValue).getTime();
        return new Date(Math.max(oldDate, nextDate)).toISOString();
      };
      tx.set(creditRef, {
        uid: decoded.uid,
        freeCredits: Number(current.freeCredits) || 0,
        paidCredits: nextPaid,
        usedCredits: Number(current.usedCredits) || 0,
        databaseCredits: nextDb,
        ...(Number(order.jobCredits || 0) > 0 ? { paidCreditsExpiresAt: maxExpiry(current.paidCreditsExpiresAt, expiresAt) } : {}),
        ...(Number(order.databaseCredits || 0) > 0 ? { databaseCreditsExpiresAt: maxExpiry(current.databaseCreditsExpiresAt, expiresAt) } : {}),
        activePlan: order.planName,
        planExpiresAt: maxExpiry(current.planExpiresAt, expiresAt),
        updatedAt: paidAt
      }, { merge: true });
      const subscription = {
        subscriptionId: `sub_${decoded.uid}`, userId: decoded.uid, role: order.role || "employer",
        planId: order.planId, planName: order.planName, status: "active", paymentStatus: "paid",
        startsAt: paidAt, expiresAt, jobCreditsAdded: Number(order.jobCredits || 0),
        databaseCreditsAdded: Number(order.databaseCredits || 0), orderId, razorpayPaymentId: paymentId,
        updatedAt: paidAt
      };
      tx.set(subscriptionRef, subscription, { merge: true });
      tx.set(orderRef, { status: "paid", paymentStatus: "paid", gatewayVerified: true, razorpayPaymentId: paymentId, paidAt, updatedAt: paidAt }, { merge: true });
      tx.set(userRef, {
        activePlanId: order.planId, activePlanName: order.planName, subscriptionId: `sub_${decoded.uid}`,
        subscriptionStatus: "active", paymentStatus: "paid", planExpiresAt: expiresAt, updatedAt: paidAt
      }, { merge: true });
    });

    if (!alreadyPaid) {
      const baseAmount = Number((Number(order.amount || 0) / 1.18).toFixed(2));
      const gstAmount = Number((Number(order.amount || 0) - baseAmount).toFixed(2));
      const accounting = await processPaymentAccounting({
        paymentId, userId: decoded.uid, userEmail: decoded.email || "",
        role: order.role || "employer", planName: order.planName,
        baseAmount, gstAmount, totalAmount: Number(order.amount || 0),
        customerState: "Not configured", sellerState: process.env.AIJOBS_GST_STATE || "Not configured"
      }).catch((e: any) => ({ success: false, error: e?.message || "Accounting pending" }));
      await db.collection("payments").doc(paymentId.replace(/[^a-zA-Z0-9_-]/g, "_")).set({
        paymentId, userId: decoded.uid, role: order.role, planId: order.planId, planName: order.planName,
        amount: order.amount, totalAmount: order.amount, currency: "INR", gateway: "razorpay",
        gatewayPaymentId: paymentId, gatewaySignatureVerified: true, status: "paid", paidAt,
        invoiceId: (accounting as any)?.invoiceId || null,
        accountingStatus: (accounting as any)?.success ? "complete" : "pending_reconciliation",
        createdAt: order.createdAt, updatedAt: paidAt
      }, { merge: true });
    }

    const latestOrder = (await orderRef.get()).data() || {};
    return void res.json({ success: true, status: "paid", alreadyPaid, order: latestOrder });
  } catch (error: any) {
    console.error("[Hiring plan status verification]", error?.message || error);
    const status = error?.message === "PAYMENT_GATEWAY_NOT_CONFIGURED" ? 503 : 500;
    return void res.status(status).json({ success: false, error: error?.message || "PLAN_PAYMENT_VERIFY_FAILED" });
  }
});

export default router;
