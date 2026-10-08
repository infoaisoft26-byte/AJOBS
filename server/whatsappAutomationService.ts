import crypto from "crypto";
import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";
const AUTOMATION_API_KEY = process.env.WHATSAPP_AUTOMATION_API_KEY || "";

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function verifyWhatsAppWebhook(req: Request, res: Response) {
  const mode = String(req.query["hub.mode"] || "");
  const token = String(req.query["hub.verify_token"] || "");
  const challenge = String(req.query["hub.challenge"] || "");

  if (mode !== "subscribe" || !VERIFY_TOKEN || !safeEqual(token, VERIFY_TOKEN)) {
    return res.sendStatus(403);
  }
  return res.status(200).send(challenge);
}

export async function receiveWhatsAppWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));

  if (APP_SECRET) {
    const signature = String(req.header("x-hub-signature-256") || "");
    const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
    if (!signature || !safeEqual(signature, expected)) return res.sendStatus(401);
  }

  let payload: any;
  try { payload = JSON.parse(rawBody.toString("utf8")); }
  catch { return res.status(400).json({ success: false, error: "INVALID_JSON" }); }

  const db = getFirestoreDb();
  const eventEntries: any[] = [];

  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      const value = change?.value || {};
      const metadata = value?.metadata || {};
      const phoneNumberId = metadata?.phone_number_id || "";

      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        eventEntries.push({
          type: "message", phoneNumberId, from: message?.from || "",
          messageId: message?.id || "", messageType: message?.type || "",
          timestamp: message?.timestamp || "", text: message?.text?.body || "",
          receivedAt: new Date().toISOString(),
        });
      }
      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        eventEntries.push({
          type: "status", phoneNumberId, recipientId: status?.recipient_id || "",
          messageId: status?.id || "", status: status?.status || "",
          timestamp: status?.timestamp || "", receivedAt: new Date().toISOString(),
        });
      }
    }
  }

  if (db && eventEntries.length) {
    const batch = db.batch();
    for (const event of eventEntries) batch.set(db.collection("whatsappWebhookEvents").doc(), event);
    await batch.commit();
  }

  console.log("[WHATSAPP_WEBHOOK]", JSON.stringify({ object: payload?.object || "", events: eventEntries.length }));
  return res.sendStatus(200);
}

export async function sendWhatsAppTemplate(to: string, templateName: string, languageCode = "en_US", components?: any[]) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) throw new Error("WhatsApp Cloud API credentials are not configured");

  const response = await fetch(
    "https://graph.facebook.com/" + GRAPH_VERSION + "/" + PHONE_NUMBER_ID + "/messages",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + ACCESS_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "template",
        template: { name: templateName, language: { code: languageCode }, ...(components?.length ? { components } : {}) },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "WhatsApp Cloud API request failed");
  return data;
}

export async function handleWhatsAppSendRoute(req: Request, res: Response) {
  if (!AUTOMATION_API_KEY || req.header("x-whatsapp-automation-key") !== AUTOMATION_API_KEY) return res.sendStatus(401);
  if (req.method !== "POST") return res.sendStatus(405);
  const { to, templateName, languageCode, components } = req.body || {};
  if (!to || !templateName) return res.status(400).json({ success: false, error: "to_and_templateName_required" });
  try {
    const result = await sendWhatsAppTemplate(String(to), String(templateName), String(languageCode || "en_US"), components);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[WHATSAPP_SEND]", error?.message || error);
    return res.status(502).json({ success: false, error: error?.message || "WhatsApp send failed" });
  }
}
