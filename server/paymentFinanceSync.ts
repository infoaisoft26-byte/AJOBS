import { getFirestoreDb } from "./firestoreHelper.js";
import { processPaymentAccounting } from "./accountingEngine.js";
import { INVOICE_EMAIL } from "./siteConfig.js";

const num = (v: any) => Number(v || 0) || 0;

export async function syncPaidPaymentOrdersToAccounting() {
  const db = getFirestoreDb();
  const ordersSnap = await db.collection("payment_orders").get();
  let ordersSynced = 0;
  let invoicesCreated = 0;
  let emailsQueued = 0;

  for (const orderDocSnap of ordersSnap.docs) {
    const order: any = { id: orderDocSnap.id, ...orderDocSnap.data() };
    if (String(order.status || order.paymentStatus || "").toLowerCase() !== "paid") continue;

    const paymentId = String(order.razorpayPaymentId || order.gatewayPaymentId || order.orderId || order.id || "").trim();
    const userId = String(order.userId || "").trim();
    if (!paymentId || !userId) continue;

    const [userSnap, agreementSnap] = await Promise.all([
      db.collection("users").doc(userId).get(),
      order.agreementId
        ? db.collection("agreements").doc(String(order.agreementId)).get()
        : Promise.resolve(null)
    ]);

    const user: any = userSnap.exists ? userSnap.data() || {} : {};
    const agreement: any = agreementSnap && agreementSnap.exists ? agreementSnap.data() || {} : {};
    const baseAmount = num(order.baseAmount ?? agreement?.planSummary?.baseAmount ?? agreement?.baseAmount);
    const gstAmount = num(order.gstAmount ?? agreement?.planSummary?.gstAmount ?? agreement?.gstAmount);
    const totalAmount = num(order.totalAmount ?? order.amount ?? agreement?.planSummary?.totalAmount ?? agreement?.totalAmount) || (baseAmount + gstAmount);
    const role = String(user.role || agreement.role || "recruiter");
    const userEmail = String(user.email || agreement?.userEmail || agreement?.buyer?.email || "");
    const userName = String(user.name || user.displayName || agreement?.buyer?.authorizedPerson || agreement?.buyer?.legalName || "AIJOBS Partner");
    const planName = String(order.planName || agreement?.planSummary?.planName || "AIJOBS Subscription Plan");
    const paidAt = order.paidAt || order.updatedAt || new Date().toISOString();

    const paymentRef = db.collection("payments").doc(paymentId);
    const paymentSnap = await paymentRef.get();
    await paymentRef.set({
      paymentId,
      orderId: order.orderId || order.id || "",
      userId,
      userEmail,
      userName,
      role,
      agreementId: order.agreementId || "",
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
      gatewaySignatureVerified: Boolean(order.gatewayVerified ?? true),
      paidAt,
      createdAt: order.createdAt || paidAt,
      updatedAt: order.updatedAt || paidAt
    }, { merge: true });
    if (!paymentSnap.exists) ordersSynced++;

    let invoiceSnap = await db.collection("invoices").where("paymentId", "==", paymentId).limit(1).get();

    if (invoiceSnap.empty) {
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
        customerState: String(agreement?.buyer?.state || user.state || user.billingState || "Not configured"),
        sellerState: String(agreement?.seller?.state || process.env.AIJOBS_GST_STATE || "Not configured")
      });

      if (accounting.success && accounting.invoiceId) {
        const invoiceRef = db.collection("invoices").doc(accounting.invoiceId);
        await invoiceRef.set({
          buyer: agreement?.buyer || {
            name: userName,
            email: userEmail,
            gstin: user.gstin || user.gstNumber || ""
          },
          seller: agreement?.seller || {
            legalEntityName: process.env.AIJOBS_LEGAL_ENTITY_NAME || "AIJOBS / The Flex Force Services",
            gstin: process.env.AIJOBS_GSTIN || "",
            registeredAddress: process.env.AIJOBS_REGISTERED_ADDRESS || "",
            state: process.env.AIJOBS_GST_STATE || "",
            sacCode: process.env.AIJOBS_SAC_CODE || ""
          },
          orderId: order.orderId || order.id || "",
          gateway: String(order.gateway || "razorpay").toLowerCase(),
          gatewayPaymentId: paymentId,
          status: "generated",
          issuedAt: paidAt,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        invoicesCreated++;
        invoiceSnap = await db.collection("invoices").where("paymentId", "==", paymentId).limit(1).get();
      }
    }

    if (!invoiceSnap.empty && userEmail) {
      const invoice: any = { id: invoiceSnap.docs[0].id, ...invoiceSnap.docs[0].data() };
      const mailId = "invoice_" + String(invoice.invoiceId || invoice.id || paymentId).replace(/[^a-zA-Z0-9_-]/g, "_");
      const mailRef = db.collection("mail").doc(mailId);
      const mailSnap = await mailRef.get();

      if (!mailSnap.exists) {
        const invoiceNumber = invoice.invoiceNumber || invoice.id;
        await mailRef.set({
          to: [userEmail],
          replyTo: INVOICE_EMAIL,
          message: {
            subject: "AIJOBS Payment Receipt & Invoice " + invoiceNumber,
            html:
              '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:24px;color:#0f172a">' +
              '<h2 style="color:#07152F">Payment received successfully</h2>' +
              '<p>Hello <strong>' + userName + '</strong>,</p>' +
              '<p>Your payment has been verified and your invoice was generated automatically.</p>' +
              '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px">' +
              '<p><strong>Invoice:</strong> ' + invoiceNumber + '</p>' +
              '<p><strong>Plan:</strong> ' + planName + '</p>' +
              '<p><strong>Plan amount:</strong> ₹' + baseAmount.toFixed(2) + '</p>' +
              '<p><strong>Total paid:</strong> ₹' + totalAmount.toFixed(2) + '</p>' +
              '<p><strong>Payment ID:</strong> ' + paymentId + '</p>' +
              '</div><p>You can view billing and subscription details from your AIJOBS dashboard.</p></div>'
          },
          category: "Payment Invoice",
          userId,
          invoiceId: invoice.invoiceId || invoice.id || "",
          paymentId,
          status: "queued",
          createdAt: new Date().toISOString()
        });

        await invoiceSnap.docs[0].ref.set({
          emailRecipient: userEmail,
          replyTo: INVOICE_EMAIL,
          emailStatus: "queued",
          emailQueuedAt: new Date().toISOString()
        }, { merge: true });
        emailsQueued++;
      }
    }
  }

  return { ordersSynced, invoicesCreated, emailsQueued };
}
