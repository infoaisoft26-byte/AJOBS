import crypto from "crypto";
import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";
const AUTOMATION_API_KEY = process.env.WHATSAPP_AUTOMATION_API_KEY || "";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://aijobs1.in").replace(/\/+$/, "");

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function stableId(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "");
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

async function sendWhatsAppText(to: string, body: string) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("WhatsApp Cloud API credentials are not configured");
  }
  const response = await fetch(
    "https://graph.facebook.com/" + GRAPH_VERSION + "/" + PHONE_NUMBER_ID + "/messages",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + ACCESS_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhone(to),
        type: "text",
        text: { preview_url: false, body: String(body || "").slice(0, 4000) }
      })
    }
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "WhatsApp Cloud API text message failed");
  return data;
}

async function getPublicJobs(db: any, query: string) {
  const allowedStatuses = ["approved", "Approved", "published", "Published", "live", "Live", "open", "Open"];
  const stopWords = new Set(["hi", "hello", "hey", "job", "jobs", "search", "find", "show", "me", "latest", "available", "opening", "openings", "vacancy", "vacancies", "please", "for", "in", "at", "the", "a", "an", "and"]);
  const terms = String(query || "").toLowerCase().split(/[^a-z0-9+#.]+/i).filter((term) => term && !stopWords.has(term)).slice(0, 12);
  const snap = await db.collection("jobs").where("status", "in", allowedStatuses).limit(100).get();
  const matches: any[] = [];
  const now = Date.now();
  snap.forEach((doc: any) => {
    const job = doc.data() || {};
    if (job.approved === false) return;
    const status = String(job.status || "").toLowerCase();
    if (!["approved", "published", "live", "open"].includes(status)) return;
    const expiry = job.validThrough || job.expiryDate || job.applyDeadline;
    if (expiry) {
      const expiryDate = typeof expiry?.toDate === "function" ? expiry.toDate() : new Date(expiry);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < now) return;
    }
    const title = String(job.title || job.jobTitle || "").trim();
    const company = String(job.company || job.companyName || "").trim();
    const location = String(job.location || "").trim();
    const salary = String(job.salary || job.salaryRange || "").trim();
    const searchable = [title, company, location, salary, ...(Array.isArray(job.skills) ? job.skills : [])].join(" ").toLowerCase();
    let score = terms.length ? 0 : 1;
    for (const term of terms) if (searchable.includes(term)) score += title.toLowerCase().includes(term) ? 5 : 1;
    if (!terms.length || score > 0) matches.push({ id: doc.id, title, company, location, salary, score });
  });
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

async function buildAutoReply(db: any, from: string, text: string) {
  const message = String(text || "").trim();
  const lower = message.toLowerCase();
  const contactRef = db.collection("whatsappAutomationContacts").doc(stableId(normalizePhone(from)));
  const contactSnap = await contactRef.get();
  const contact = contactSnap.exists ? contactSnap.data() || {} : {};

  if (/^(stop|unsubscribe|cancel|opt out)$/i.test(message)) {
    await contactRef.set({ phone: normalizePhone(from), optedOut: true, optedOutAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    return "AIJOBS WhatsApp updates are now stopped. Reply START any time to opt in again.";
  }
  if (/^(start|unstop)$/i.test(message)) {
    await contactRef.set({ phone: normalizePhone(from), optedOut: false, optedInAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    return "Welcome back to AIJOBS WhatsApp Assistant! Reply JOBS, a job title/skill, APPLY, REGISTER, STATUS, or HELP.";
  }
  if (contact.optedOut) return "";

  if (/^(hi|hello|hey|namaste|menu|help|start)$/i.test(message)) {
    return "Namaste! Welcome to AIJOBS WhatsApp Assistant.\n\nReply with:\n• JOBS — latest approved openings\n• A job title or skill — search openings\n• REGISTER — candidate registration help\n• APPLY — how to apply\n• STATUS — check application/interview updates\n• RECRUITER — employer/recruiter help\n• STOP — stop WhatsApp replies\n\nCandidate applications on AIJOBS are free. " + SITE_URL;
  }

  if (/\b(job|jobs|opening|openings|vacancy|vacancies|hiring|career|developer|engineer|designer|sales|hr|recruiter|marketing|accountant|internship|remote)\b/i.test(message)) {
    try {
      const jobs = await getPublicJobs(db, message);
      if (!jobs.length) return "I couldn't find a matching approved/live opening right now. Try another job title or skill, or browse " + SITE_URL + ". Candidate applications are free.";
      const lines = jobs.map((job: any, index: number) => {
        const parts = [String(index + 1) + ". " + (job.title || "Open position")];
        if (job.company) parts.push("Company: " + job.company);
        if (job.location) parts.push("Location: " + job.location);
        if (job.salary) parts.push("Salary: " + job.salary);
        return parts.join("\n");
      });
      return "AIJOBS approved/live openings matching your message:\n\n" + lines.join("\n\n") + "\n\nOpen " + SITE_URL + " to view details and apply. Candidate applications are free.";
    } catch (error: any) {
      console.warn("[WHATSAPP_JOB_SEARCH]", error?.message || error);
      return "Job search is temporarily unavailable. Please browse current openings at " + SITE_URL + " and try again shortly.";
    }
  }

  if (/\b(register|registration|sign up|signup|create account|candidate account)\b/i.test(lower)) {
    return "To register as a candidate, open " + SITE_URL + " and choose Candidate Registration. Use your own contact details and complete the required fields. AIJOBS does not charge candidates to apply for jobs.";
  }
  if (/\b(apply|application|apply for|apply job)\b/i.test(lower)) {
    return "To apply, open " + SITE_URL + ", sign in to your candidate account, find an approved/live job, and use its Apply option. Candidate applications are free. Never share your password or OTP in WhatsApp.";
  }
  if (/\b(status|interview|shortlist|application status|my application)\b/i.test(lower)) {
    return "For private application or interview status, sign in at " + SITE_URL + " and check your candidate dashboard/notifications. For account privacy, please don't send passwords or OTPs in WhatsApp.";
  }
  if (/\b(recruiter|employer|consultancy|hire|hiring team|post a job)\b/i.test(lower)) {
    return "For recruiter, employer, and consultancy services, visit the AIJOBS hiring page: " + SITE_URL + "/hire. Sign in with your authorized recruiter/employer account to continue.";
  }
  if (/\b(human|agent|support|contact|helpdesk)\b/i.test(lower)) {
    return "For human assistance, visit " + SITE_URL + " and use the available Contact/Support option. Please don't send passwords, OTPs, identity documents, or payment details in WhatsApp.";
  }

  return "I'm the AIJOBS WhatsApp Assistant. I can help with approved/live jobs, registration, applying, application status, and recruiter services. Reply HELP to see options or visit " + SITE_URL + ".";
}

export async function receiveWhatsAppWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));

  // Fail closed: production webhook requests must be authenticated with the Meta App Secret.
  if (!APP_SECRET) {
    console.error("[WHATSAPP_WEBHOOK] WHATSAPP_APP_SECRET is not configured");
    return res.status(503).json({ success: false, error: "WEBHOOK_SIGNATURE_NOT_CONFIGURED" });
  }
  const signature = String(req.header("x-hub-signature-256") || "");
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  if (!signature || !safeEqual(signature, expected)) return res.sendStatus(401);

  let payload: any;
  try { payload = JSON.parse(rawBody.toString("utf8")); }
  catch { return res.status(400).json({ success: false, error: "INVALID_JSON" }); }

  const db = getFirestoreDb();
  if (!db) {
    console.error("[WHATSAPP_WEBHOOK] Firestore is unavailable; refusing to process without deduplication");
    return res.sendStatus(503);
  }

  const eventEntries: any[] = [];
  const incomingMessages: any[] = [];

  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      const value = change?.value || {};
      const metadata = value?.metadata || {};
      const phoneNumberId = String(metadata?.phone_number_id || "");

      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        const item = {
          type: "message", phoneNumberId, from: String(message?.from || ""),
          messageId: String(message?.id || ""), messageType: String(message?.type || ""),
          timestamp: String(message?.timestamp || ""), text: String(message?.text?.body || ""),
          receivedAt: new Date().toISOString()
        };
        eventEntries.push(item);
        if (item.from && item.messageId && item.messageType === "text" && item.text) incomingMessages.push(item);
      }
      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        eventEntries.push({
          type: "status", phoneNumberId, recipientId: String(status?.recipient_id || ""),
          messageId: String(status?.id || ""), status: String(status?.status || ""),
          timestamp: String(status?.timestamp || ""), receivedAt: new Date().toISOString()
        });
      }
    }
  }

  for (const event of eventEntries) {
    const eventKey = stableId([event.type, event.messageId || "", event.status || "", event.timestamp || ""].join(":"));
    await db.collection("whatsappWebhookEvents").doc(eventKey).set(event, { merge: true });
  }

  for (const message of incomingMessages) {
    // This endpoint is dedicated to the configured AIJOBS WhatsApp number.
    if (PHONE_NUMBER_ID && message.phoneNumberId !== PHONE_NUMBER_ID) {
      console.warn("[WHATSAPP_WEBHOOK] Ignored message for an unconfigured phone number ID");
      continue;
    }
    const processedRef = db.collection("whatsappProcessedMessages").doc(stableId(message.messageId));
    const shouldProcess = await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(processedRef);
      const data = snap.exists ? snap.data() || {} : {};
      if (data.state === "sent" || (data.state === "processing" && Date.now() - Number(data.updatedAtMs || 0) < 5 * 60 * 1000)) return false;
      tx.set(processedRef, {
        messageId: message.messageId, from: normalizePhone(message.from),
        state: "processing", updatedAtMs: Date.now(), receivedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    });
    if (!shouldProcess) continue;

    try {
      const reply = await buildAutoReply(db, message.from, message.text);
      if (reply) await sendWhatsAppText(message.from, reply);
      await processedRef.set({ state: "sent", updatedAtMs: Date.now(), repliedAt: new Date().toISOString() }, { merge: true });
    } catch (error: any) {
      await processedRef.set({ state: "failed", updatedAtMs: Date.now(), error: String(error?.message || "send_failed").slice(0, 300) }, { merge: true });
      console.error("[WHATSAPP_AUTO_REPLY]", error?.message || error);
    }
  }

  console.log("[WHATSAPP_WEBHOOK]", JSON.stringify({ object: payload?.object || "", events: eventEntries.length, incoming: incomingMessages.length }));
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
