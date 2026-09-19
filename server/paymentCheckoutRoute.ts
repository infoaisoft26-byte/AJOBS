import type { Request, Response } from "express";
import crypto from "crypto";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { getPublicSiteUrl, INVOICE_EMAIL } from "./siteConfig.js";
import { processPaymentAccounting } from "./accountingEngine.js";

const money = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

async function ensurePaymentFinancialArtifacts(params: {
  db: any;
  order: any;
  agreement: any;
  userId: string;
  userEmail?: string;
  userName?: string;
  role?: string;
  paymentId: string;
  paidAt: string;
}) {
  const { db, order, agreement, userId, paymentId, paidAt } = params;
  const userSnap = await db.collection("users").doc(userId).get();
  const user: any = userSnap.exists ? userSnap.data() || {} : {};
  const userEmail = String(params.userEmail || user.email || agreement?.userEmail || agreement?.buyer?.email || "").trim();
  const userName = String(params.userName || user.name || user.displayName || agreement?.buyer?.authorizedPerson || agreement?.buyer?.legalName || "AIJOBS Partner").trim();
  const role = String(params.role || user.role || agreement?.role || "recruiter").trim().toLowerCase();

  const paymentDocId = String(paymentId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseAmount = money(order.baseAmount ?? agreement?.planSummary?.baseAmount ?? agreement?.baseAmount, 0);
  const gstAmount = money(order.gstAmount ?? agreement?.planSummary?.gstAmount ?? agreement?.gstAmount, 0);
  const totalAmount = money(order.totalAmount ?? order.amount ?? agreement?.planSummary?.totalAmount ?? agreement?.totalAmount, baseAmount + gstAmount);
  const planName = String(order.planName || agreement?.planSummary?.planName || "AIJOBS Subscription Plan");
  const customerState = String(agreement?.buyer?.state || user.state || user.billingState || "").trim();
  const sellerState = String(agreement?.seller?.state || process.env.AIJOBS_GST_STATE || "").trim();

  const paymentDoc = {
    paymentId,
    orderId: order.orderId || order.id || "",
    userId,
    userEmail,
    userName,
    role,
    agreementId: order.agreementId || agreement?.agreementId || agreement?.id || "",
    planId: agreement?.planSummary?.planId || agreement?.planId || "",
    planName,
    baseAmount,
    amount: baseAmount,
    gstAmount,
    totalAmount,
    totalPaid: totalAmount,
    currency: order.currency || "INR",
    gateway: String(order.gateway || "razorpay").toLowerCase(),
    gatewayPaymentId: paymentId,
    buyer: agreement?.buyer || { name: userName, email: userEmail, gstin: user.gstin || user.gstNumber || "" },
    seller: agreement?.seller || {
      legalEntityName: process.env.AIJOBS_LEGAL_ENTITY_NAME || "AIJOBS / The Flex Force Services",
      gstin: process.env.AIJOBS_GSTIN || "",
      registeredAddress: process.env.AIJOBS_REGISTERED_ADDRESS || "",
      state: process.env.AIJOBS_GST_STATE || "",
      sacCode: process.env.AIJOBS_SAC_CODE || ""
    },
    status: "paid",
    gatewaySignatureVerified: true,
    accountingStatus: "pending_reconciliation",
    paidAt,
    createdAt: order.createdAt || paidAt,
    updatedAt: paidAt
  };

  await db.collection("payments").doc(paymentDocId).set(paymentDoc, { merge: true });

  let invoice: any = null;
  let accountingError = "";
  const existingInvoiceSnap = await db.collection("invoices").where("paymentId", "==", paymentId).limit(1).get();

  if (!existingInvoiceSnap.empty) {
    invoice = { id: existingInvoiceSnap.docs[0].id, ...existingInvoiceSnap.docs[0].data() };
  } else {
    const accounting = await processPaymentAccounting({
      paymentId,
      userId,
      userEmail,
      role,
      planName,
      baseAmount,
      gstAmount,
      totalAmount,
      cgst: agreement?.cgst ?? agreement?.planSummary?.cgst,
      sgst: agreement?.sgst ?? agreement?.planSummary?.sgst,
      igst: agreement?.igst ?? agreement?.planSummary?.igst,
      customerState: customerState || "Not configured",
      sellerState: sellerState || "Not configured"
    });

    if (accounting.success && accounting.invoiceId) {
      const invoiceRef = db.collection("invoices").doc(accounting.invoiceId);
      await invoiceRef.set({
        buyer: agreement?.buyer || {
          name: userName,
          email: userEmail,
          gstin: user.gstin || user.gstNumber || "",
          state: customerState || ""
        },
        seller: agreement?.seller || {
          legalEntityName: process.env.AIJOBS_LEGAL_ENTITY_NAME || "AIJOBS / The Flex Force Services",
          gstin: process.env.AIJOBS_GSTIN || "",
          registeredAddress: process.env.AIJOBS_REGISTERED_ADDRESS || "",
          state: sellerState || "",
          sacCode: process.env.AIJOBS_SAC_CODE || ""
        },
        orderId: order.orderId || order.id || "",
        gateway: String(order.gateway || "razorpay").toLowerCase(),
        gatewayPaymentId: paymentId,
        status: "generated",
        issuedAt: paidAt,
        updatedAt: paidAt
      }, { merge: true });
      const invSnap = await invoiceRef.get();
      invoice = { id: invoiceRef.id, ...invSnap.data() };
    } else {
      accountingError = accounting.error || "Accounting/invoice generation failed.";
    }
  }

  if (invoice && userEmail) {
    const mailId = `invoice_${String(invoice.invoiceId || invoice.id || paymentId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const mailRef = db.collection("mail").doc(mailId);
    const mailSnap = await mailRef.get();
    if (!mailSnap.exists) {
      const sellerName = invoice?.seller?.legalEntityName || process.env.AIJOBS_LEGAL_ENTITY_NAME || "AIJOBS";
      const invoiceNumber = invoice.invoiceNumber || invoice.id || "AIJOBS Invoice";
      await mailRef.set({
        to: [userEmail],
        replyTo: INVOICE_EMAIL,
        message: {
          subject: `AIJOBS Payment Receipt & Invoice ${invoiceNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:24px;color:#0f172a">
              <h2 style="margin:0 0 8px;color:#07152F">Payment received successfully</h2>
              <p>Hello <strong>${userName}</strong>,</p>
              <p>Your AIJOBS payment has been verified and your invoice has been generated automatically.</p>
              <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0">
                <p><strong>Invoice:</strong> ${invoiceNumber}</p>
                <p><strong>Plan:</strong> ${planName}</p>
                <p><strong>Taxable amount:</strong> ₹${Number(baseAmount).toFixed(2)}</p>
                <p><strong>GST:</strong> ₹${Number(gstAmount).toFixed(2)}</p>
                <p><strong>Total paid:</strong> ₹${Number(totalAmount).toFixed(2)}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Paid at:</strong> ${paidAt}</p>
              </div>
              <p style="font-size:12px;color:#475569">Seller: ${sellerName}</p>
              <p style="font-size:12px;color:#475569">You can also view the invoice and subscription details from your AIJOBS dashboard.</p>
              <a href="${getPublicSiteUrl()}/recruiter/dashboard" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Open AIJOBS Dashboard</a>
            </div>
          `
        },
        category: "Payment Invoice",
        userId,
        invoiceId: invoice.invoiceId || invoice.id || "",
        paymentId,
        status: "queued",
        createdAt: paidAt
      });

      const invoiceRef = db.collection("invoices").doc(invoice.invoiceId || invoice.id);
      await invoiceRef.set({
        emailRecipient: userEmail,
        replyTo: INVOICE_EMAIL,
        emailStatus: "queued",
        emailQueuedAt: paidAt
      }, { merge: true });
    }
  }

  if (accountingError) {
    await db.collection("payments").doc(paymentDocId).set({
      accountingStatus: "pending_reconciliation",
      accountingError,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  return { paymentDocId, invoice, accountingError };
}

export async function handlePaymentCheckoutRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (
    path !== "/api/payments/create-order" &&
    path !== "/api/payments/verify-return" &&
    path !== "/payments/create-order" &&
    path !== "/payments/verify-return"
  ) return false;
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

    if (path === "/api/payments/verify-return" || path === "/payments/verify-return") {
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
        const paymentId = String(order.razorpayPaymentId || razorpayPaymentId || orderId);
        const agreementRefExisting = db.collection("agreements").doc(String(order.agreementId || ""));
        const agreementSnapExisting = order.agreementId ? await agreementRefExisting.get() : null;
        const agreementExisting: any = agreementSnapExisting?.exists ? agreementSnapExisting.data() || {} : {};
        const financials = await ensurePaymentFinancialArtifacts({
          db,
          order: { ...order, orderId },
          agreement: agreementExisting,
          userId: decoded.uid,
          userEmail: decoded.email || "",
          paymentId,
          paidAt: order.paidAt || new Date().toISOString()
        });
        res.json({ success: true, alreadyPaid: true, order: { ...order, orderId }, subscription, invoice: financials.invoice });
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

      const paymentIdForAccounting = razorpayPaymentId || String(verifiedLink?.payments?.[0]?.payment_id || orderId);
      const financials = await ensurePaymentFinancialArtifacts({
        db,
        order: { ...order, orderId, status: "paid", paidAt, razorpayPaymentId: paymentIdForAccounting },
        agreement,
        userId: decoded.uid,
        userEmail: decoded.email || agreement?.buyer?.email || "",
        role: agreement.role || undefined,
        paymentId: paymentIdForAccounting,
        paidAt
      });

      res.json({
        success: true,
        message: financials.accountingError
          ? "Payment verified and plan activated. Invoice/accounting sync is queued for reconciliation."
          : "Payment verified, plan activated, invoice generated and emailed.",
        order: { ...order, orderId, status: "paid", paidAt },
        subscription,
        invoice: financials.invoice,
        accountingPending: Boolean(financials.accountingError)
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
