import crypto from "crypto";
import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";
import { dispatchEmail } from "./emailService.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashOtp = (otp: string, userId: string, agreementId: string) =>
  crypto.createHash("sha256").update(`${otp}:${userId}:${agreementId}:aijobs_agreement_esign_2026`).digest("hex");

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("EMAIL_SEND_TIMEOUT")), ms))
  ]);
}

export async function handleAgreementOtpRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/agreements/send-otp") return false;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Please sign in again to continue." });
      return true;
    }

    const decoded = await getFirebaseAuth().verifyIdToken(header.slice(7).trim(), true);
    const db = getFirestoreDb();
    const body: any = req.body || {};
    if (body.userId && String(body.userId) !== decoded.uid) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "Account mismatch." });
      return true;
    }

    const agreementId = String(body.agreementId || "").trim();
    if (!agreementId) {
      res.status(400).json({ success: false, error: "AGREEMENT_REQUIRED", message: "Generate the agreement before requesting OTP." });
      return true;
    }

    const [agreementSnap, userSnap] = await Promise.all([
      db.collection("agreements").doc(agreementId).get(),
      db.collection("users").doc(decoded.uid).get()
    ]);
    if (!agreementSnap.exists) {
      res.status(404).json({ success: false, error: "AGREEMENT_NOT_FOUND", message: "Generate the agreement before requesting a verification code." });
      return true;
    }

    const agreement: any = agreementSnap.data() || {};
    if (agreement.userId && agreement.userId !== decoded.uid) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "This agreement does not belong to your account." });
      return true;
    }
    const user: any = userSnap.data() || {};
    const email = String(decoded.email || user.email || agreement.buyer?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ success: false, error: "EMAIL_REQUIRED", message: "A valid account email is required for agreement signing." });
      return true;
    }

    const otpKey = `${decoded.uid}_${agreementId}`;
    const otpRef = db.collection("agreement_esign_otps").doc(otpKey);
    const previous = await otpRef.get();
    const previousData: any = previous.exists ? previous.data() : null;
    const now = Date.now();
    if (previousData?.lastSentAtMs && now - previousData.lastSentAtMs < 60_000) {
      const retryAfter = Math.ceil((60_000 - (now - previousData.lastSentAtMs)) / 1000);
      res.status(429).json({ success: false, error: "RATE_LIMITED", message: `Please wait ${retryAfter} seconds before requesting another code.`, retryAfter });
      return true;
    }

    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const record = {
      userId: decoded.uid,
      agreementId,
      email,
      otpHash: hashOtp(rawOtp, decoded.uid, agreementId),
      expiresAtMs: now + 10 * 60_000,
      attempts: 0,
      used: false,
      lastSentAtMs: now,
      createdAt: new Date(now).toISOString()
    };
    await otpRef.set(record, { merge: true });

    const name = user.name || user.displayName || agreement.buyer?.authorizedPerson || "AIJOBS Partner";
    const subject = "AIJOBS agreement eSign verification code";
    const text = `Hello ${name},\n\nYour AIJOBS agreement verification code is ${rawOtp}. It expires in 10 minutes.\n\nDo not share this code with anyone.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>AIJOBS Agreement Verification</h2><p>Hello <strong>${String(name).replace(/[<>&]/g, "")}</strong>,</p><p>Your 6-digit eSign verification code is:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px;background:#f1f5f9;border-radius:10px;text-align:center">${rawOtp}</div><p>This code expires in 10 minutes. Do not share it with anyone.</p></div>`;

    let provider = "smtp";
    try {
      const delivery: any = await timeout(dispatchEmail({
        to: email,
        subject,
        template: "custom-admin-email",
        data: { subject, customMessage: text, html, recipientName: name },
        category: "transactional",
        createdBy: "agreement_esign"
      } as any), 8000);
      if (!delivery?.success && !delivery?.queued) throw new Error(delivery?.error || "SMTP_DELIVERY_FAILED");
      provider = delivery?.queued ? "email_queue" : "smtp";
    } catch (mailError: any) {
      console.warn("[AgreementOTP] SMTP unavailable, queueing via Firestore mail collection:", mailError?.message || mailError);
      await db.collection("mail").add({
        to: [email],
        message: { subject, text, html },
        metadata: { type: "agreement_esign_otp", userId: decoded.uid, agreementId },
        createdAt: new Date().toISOString()
      });
      provider = "firestore_mail_queue";
    }

    res.json({
      success: true,
      message: `6-digit agreement verification code sent to ${email.replace(/^(.{2}).*(@.*)$/, "$1***$2")}.`,
      provider,
      expiresInSeconds: 600
    });
    return true;
  } catch (err: any) {
    console.error("[/api/agreements/send-otp fast path]", err?.message || err);
    const message = err?.code === "auth/id-token-revoked" || err?.code === "auth/id-token-expired"
      ? "Your login session expired. Please sign in again."
      : "Could not send the agreement verification code. Please retry.";
    res.status(err?.code?.startsWith?.("auth/") ? 401 : 500).json({ success: false, error: "AGREEMENT_OTP_FAILED", message });
    return true;
  }
}
