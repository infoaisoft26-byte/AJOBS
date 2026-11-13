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

function inferWhatsAppLeadType(message: string, previousType = "") {
  const value = String(message || "").trim().toLowerCase();
  if (/^(1|candidate|job seeker|jobseeker|looking for job|i need a job)$/.test(value) || /\b(candidate|job seeker|looking for a job)\b/.test(value)) return "candidate";
  if (/^(2|recruiter|employer|company|hiring)$/.test(value) || /\b(recruiter|employer|hiring team|post a job|company hiring)\b/.test(value)) return "recruiter_employer";
  if (/^(3|consultancy|agency|recruitment agency)$/.test(value) || /\b(consultancy|recruitment agency|staffing agency)\b/.test(value)) return "consultancy";
  return previousType || "unclassified";
}

async function persistWhatsAppLead(db: any, from: string, message: string, messageId: string) {
  const phone = normalizePhone(from);
  if (!phone) return;
  let flowData: Record<string, any> = {};
  try {
    const parsed = JSON.parse(String(message || ""));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) flowData = parsed;
  } catch {}
  const structuredText = Object.entries(flowData)
    .map(([key, value]) => key + ": " + (Array.isArray(value) ? value.join(", ") : String(value ?? "")))
    .filter((item) => !/:\s*$/.test(item))
    .join("; ");
  const humanMessage = structuredText || String(message || "");
  const lower = humanMessage.trim().toLowerCase();
  const contactRef = db.collection("whatsappAutomationContacts").doc(stableId(phone));
  const contactSnap = await contactRef.get();
  const previous = contactSnap.exists ? contactSnap.data() || {} : {};
  if (/^(stop|unsubscribe|cancel|opt out)$/i.test(lower)) return;
  if (previous.optedOut && !/^(start|unstop)$/i.test(lower)) return;

  const roleValue = [flowData.leadType, flowData.lead_type, flowData.userType, flowData.user_type, flowData.role, flowData.enquiry_type].filter(Boolean).join(" ");
  const leadType = inferWhatsAppLeadType(roleValue + " " + humanMessage, previous.leadType);
  const emailMatch = String(flowData.email || flowData.email_address || humanMessage).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const nameMatch = String(flowData.full_name || flowData.fullName || flowData.name || humanMessage).match(/(?:my name is|name\s*:)\s*([^\n,;]{2,80})/i) || (flowData.full_name || flowData.fullName || flowData.name ? [String(flowData.full_name || flowData.fullName || flowData.name), String(flowData.full_name || flowData.fullName || flowData.name)] as any : null);
  const companyMatch = String(flowData.company_name || flowData.company || flowData.business_name || humanMessage).match(/(?:company|business|agency|consultancy)\s*:\s*([^\n,;]{2,100})/i) || (flowData.company_name || flowData.company || flowData.business_name ? [String(flowData.company_name || flowData.company || flowData.business_name), String(flowData.company_name || flowData.company || flowData.business_name)] as any : null);
  const cityValue = flowData.city || flowData.location || flowData.town || "";
  const now = new Date().toISOString();
  const contactPatch: any = {
    phone,
    leadType,
    lastMessage: humanMessage.slice(0, 1000),
    lastMessageId: messageId,
    lastSeenAt: now,
    updatedAt: now,
    source: "WhatsApp"
  };
  if (emailMatch) contactPatch.email = emailMatch[0].toLowerCase();
  if (nameMatch) contactPatch.name = nameMatch[1].trim();
  if (companyMatch) contactPatch.businessName = companyMatch[1].trim();
  await contactRef.set(contactPatch, { merge: true });

  const leadRef = db.collection("leads").doc("wa_" + stableId(phone));
  const existingLeadSnap = await leadRef.get();
  const existingLead = existingLeadSnap.exists ? existingLeadSnap.data() || {} : {};
  const resolvedName = nameMatch ? nameMatch[1].trim() : (previous.name || existingLead.candidateName || existingLead.fullName || "WhatsApp Lead");
  const resolvedEmail = emailMatch ? emailMatch[0].toLowerCase() : (previous.email || existingLead.email || "");
  const resolvedCompany = companyMatch ? companyMatch[1].trim() : (previous.businessName || existingLead.company || "");
  const preservedStatus = existingLead.status || existingLead.currentStatus || existingLead.pipelineStage || "New";
  const leadPatch: any = {
    source: "WhatsApp",
    sourceType: "whatsapp",
    sourceChannel: "WhatsApp",
    leadType,
    candidateId: "",
    candidateName: resolvedName,
    fullName: resolvedName,
    name: resolvedName,
    email: resolvedEmail,
    candidateEmail: resolvedEmail,
    phone,
    mobile: phone,
    candidatePhone: phone,
    role: leadType === "candidate" ? "Candidate" : leadType === "recruiter_employer" ? "Recruiter/Employer" : leadType === "consultancy" ? "Consultancy" : "Unclassified",
    company: resolvedCompany,
    businessName: resolvedCompany,
    city: String(cityValue || existingLead.city || previous.city || "").slice(0, 120),
    jobTitle: leadType === "candidate" ? String(message || "").slice(0, 160) : (existingLead.jobTitle || "WhatsApp enquiry"),
    currentStatus: preservedStatus,
    status: preservedStatus,
    pipelineStage: preservedStatus,
    latestMessage: humanMessage.slice(0, 1000),
    lastMessageId: messageId,
    createdAt: existingLead.createdAt || now,
    updatedAt: now,
    recruiter: existingLead.recruiter || "Direct",
    consultancy: existingLead.consultancy || "Direct",
    assignedTo: existingLead.assignedTo || ""
  };
  await leadRef.set(leadPatch, { merge: true });
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
        text: { preview_url: true, body: String(body || "").slice(0, 4000) }
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
    if (!terms.length || score > 0) {
      const slug = String(job.slug || "").trim();
      const generatedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const url = String(job.canonicalUrl || "").startsWith(SITE_URL + "/jobs/")
        ? String(job.canonicalUrl)
        : slug ? SITE_URL + "/jobs/" + encodeURIComponent(slug)
        : SITE_URL + "/jobs/" + encodeURIComponent(generatedSlug + "-" + doc.id);
      matches.push({ id: doc.id, title, company, location, salary, url, score });
    }
  });
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}


function isWhatsAppJobOpen(job: any) {
  const state = String(job.status || "").trim().toLowerCase();
  if (!["approved", "published", "live", "open", "active"].includes(state) || job.approved === false) return false;
  const expiry = job.validThrough || job.expiryDate || job.applyDeadline;
  if (expiry) {
    const date = typeof expiry?.toDate === "function" ? expiry.toDate() : new Date(expiry);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now()) return false;
  }
  return true;
}

async function handleWhatsAppApplyFlow(db: any, from: string, message: string): Promise<string | null> {
  const phone = normalizePhone(from);
  const contactRef = db.collection("whatsappAutomationContacts").doc(stableId(phone));
  const snap = await contactRef.get();
  const contact = snap.exists ? snap.data() || {} : {};
  const draft = contact.applicationDraft || null;
  const applyMatch = message.match(/^apply\\s+([a-z0-9_-]{4,160})$/i);

  if (applyMatch) {
    const jobId = applyMatch[1];
    const jobSnap = await db.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists || !isWhatsAppJobOpen(jobSnap.data() || {})) {
      return "That job is unavailable or no longer accepting applications. Send JOBS to find current openings.";
    }
    const job = jobSnap.data() || {};
    await contactRef.set({
      applicationDraft: { jobId, jobTitle: String(job.title || job.jobTitle || "Job"), companyName: String(job.companyName || job.company || job.hiringOrganizationName || ""), step: "name", startedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return "Let's apply for " + String(job.title || job.jobTitle || "this job") + ".\\n\\nPlease send your full name:";
  }

  if (!draft || !draft.jobId) return null;
  const value = String(message || "").trim();
  if (/^(cancel|stop apply)$/i.test(value)) {
    await contactRef.set({ applicationDraft: null, updatedAt: new Date().toISOString() }, { merge: true });
    return "Your WhatsApp application draft was cancelled. You can start again by sending APPLY followed by the job ID.";
  }

  if (draft.step === "name") {
    if (value.length < 2 || value.length > 120) return "Please send your full name (2–120 characters), or type CANCEL.";
    await contactRef.set({ applicationDraft: { ...draft, name: value, step: "email" }, updatedAt: new Date().toISOString() }, { merge: true });
    return "Thanks, " + value + ". Now send your email address:";
  }
  if (draft.step === "email") {
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) return "Please send a valid email address, for example name@example.com.";
    await contactRef.set({ applicationDraft: { ...draft, email: value.toLowerCase(), step: "location" }, updatedAt: new Date().toISOString() }, { merge: true });
    return "Which city are you currently located in? You can also reply SKIP.";
  }
  if (draft.step === "location") {
    await contactRef.set({ applicationDraft: { ...draft, location: /^skip$/i.test(value) ? "" : value.slice(0, 120), step: "consent" }, updatedAt: new Date().toISOString() }, { merge: true });
    return "Please confirm: may AIJOBS share your name, WhatsApp number, email and location with the hiring team for this job? Reply YES to submit or CANCEL to stop.";
  }
  if (draft.step === "consent") {
    if (!/^yes$/i.test(value)) return "To submit, reply YES to agree to share your application with this job's hiring team, or CANCEL.";
    const jobRef = db.collection("jobs").doc(String(draft.jobId));
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists || !isWhatsAppJobOpen(jobSnap.data() || {})) {
      await contactRef.set({ applicationDraft: null, updatedAt: new Date().toISOString() }, { merge: true });
      return "Sorry, this job is no longer accepting applications. Send JOBS to see current openings.";
    }
    const job: any = jobSnap.data() || {};
    const email = String(draft.email || "").toLowerCase();
    const name = String(draft.name || "").trim();
    const phoneDigits = phone;
    const leadId = "lead_" + stableId(email + "|" + phoneDigits).slice(0, 28);
    const applicationId = "qapp_" + stableId(String(draft.jobId) + "|" + email + "|" + phoneDigits).slice(0, 28);
    const now = new Date().toISOString();
    const ownerUid = String(job.ownerUid || job.createdBy || job.postedBy || job.recruiterId || job.employerId || job.consultancyId || "");
    const appRef = db.collection("applications").doc(applicationId);
    const leadRef = db.collection("candidate_leads").doc(leadId);
    let duplicate = false;

    await db.runTransaction(async (tx: any) => {
      const [freshJob, existingApp] = await Promise.all([tx.get(jobRef), tx.get(appRef)]);
      if (!freshJob.exists || !isWhatsAppJobOpen(freshJob.data() || {})) throw new Error("JOB_CLOSED");
      if (existingApp.exists) { duplicate = true; return; }
      const currentJob: any = freshJob.data() || {};
      tx.set(leadRef, {
        id: leadId, name, fullName: name, candidateName: name, email, candidateEmail: email,
        phone: phoneDigits, mobile: phoneDigits, candidatePhone: phoneDigits,
        location: String(draft.location || ""), role: "candidate_lead", source: "whatsapp_job_apply",
        sourceType: "whatsapp", sourceChannel: "WhatsApp", sourceJobId: String(draft.jobId),
        sourceJobTitle: String(draft.jobTitle || currentJob.title || currentJob.jobTitle || ""),
        status: "new", consentToShareApplication: true, consentAt: now, firstCapturedAt: now, updatedAt: now
      }, { merge: true });
      tx.set(appRef, {
        id: applicationId, applicationId, jobId: String(draft.jobId),
        jobTitle: String(currentJob.title || currentJob.jobTitle || draft.jobTitle || ""),
        companyName: String(currentJob.companyName || currentJob.hiringOrganizationName || draft.companyName || ""),
        candidateId: null, candidateLeadId: leadId, candidateName: name, name, email, candidateEmail: email,
        phone: phoneDigits, candidatePhone: phoneDigits, location: String(draft.location || ""),
        status: "applied", applicationStatus: "Applied", source: "whatsapp_job_apply",
        registrationRequired: false, candidateAccountExists: false, jobOwnerUid: ownerUid || null,
        ownerUid: ownerUid || null, recruiterId: currentJob.recruiterId || null,
        employerId: currentJob.employerId || null, consultancyId: currentJob.consultancyId || null,
        appliedAt: now, createdAt: now, updatedAt: now,
        consentToShareApplication: true, consentAt: now
      }, { merge: false });
      tx.set(jobRef, {
        applicationCount: Number(currentJob.applicationCount || currentJob.applicants || 0) + 1,
        lastApplicationAt: now, updatedAt: currentJob.updatedAt || now
      }, { merge: true });
      if (ownerUid) tx.set(db.collection("notifications").doc("quick_apply_" + applicationId), {
        userId: ownerUid, title: "New WhatsApp Candidate Application",
        message: name + " applied for " + String(currentJob.title || currentJob.jobTitle || "your job") + " through WhatsApp.",
        type: "application", read: false, jobId: String(draft.jobId), applicationId,
        candidateLeadId: leadId, source: "WhatsApp", createdAt: now
      }, { merge: true });
    });

    await contactRef.set({ applicationDraft: null, lastAppliedAt: now, lastApplicationId: applicationId, updatedAt: now }, { merge: true });
    return duplicate
      ? "We already received your application for this job. Application ID: " + applicationId
      : "Your application has been submitted successfully!\\nApplication ID: " + applicationId + "\\nJob: " + String(draft.jobTitle || job.title || "Job") + "\\nThe hiring team will review it. No website registration was required.";
  }
  return "Please follow the requested step or type CANCEL to stop this application.";
}

async function buildAutoReply(db: any, from: string, text: string) {
  const message = String(text || "").trim();
  const lower = message.toLowerCase();
  const contactRef = db.collection("whatsappAutomationContacts").doc(stableId(normalizePhone(from)));
  const contactSnap = await contactRef.get();
  const contact = contactSnap.exists ? contactSnap.data() || {} : {};

  try {
    const flowData = JSON.parse(message);
    if (flowData && typeof flowData === "object" && !Array.isArray(flowData)) {
      const role = String(flowData.leadType || flowData.lead_type || flowData.userType || flowData.user_type || flowData.role || flowData.enquiry_type || "").toLowerCase();
      const isEnquiry = Object.keys(flowData).length > 0;
      if (isEnquiry) {
        const roleLabel = role.includes("consult") || role.includes("agency") ? "consultancy" : role.includes("recruit") || role.includes("employer") || role.includes("hir") ? "recruiter/employer" : "candidate";
        return "Thank you for submitting your AIJOBS " + roleLabel + " enquiry. Your details have been received. Our team can follow up if contact details were provided. Visit " + SITE_URL + ".";
      }
    }
  } catch {}

  if (/^(stop|unsubscribe|cancel|opt out)$/i.test(message)) {
    await contactRef.set({ phone: normalizePhone(from), optedOut: true, optedOutAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    return "AIJOBS WhatsApp updates are now stopped. Reply START any time to opt in again.";
  }
  if (/^(start|unstop)$/i.test(message)) {
    await contactRef.set({ phone: normalizePhone(from), optedOut: false, optedInAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    return "Welcome back to AIJOBS WhatsApp Assistant! Reply JOBS, a job title/skill, APPLY, REGISTER, STATUS, or HELP.";
  }
  if (contact.optedOut) return "";

  const applyFlowReply = await handleWhatsAppApplyFlow(db, from, message);
  if (applyFlowReply) return applyFlowReply;


  if (/^(1|candidate|job seeker|jobseeker)$/i.test(message)) {
    await contactRef.set({ leadType: "candidate", updatedAt: new Date().toISOString() }, { merge: true });
    return "Thanks for contacting AIJOBS as a candidate. Please send your name, city, and the job title or skill you are looking for. Example: NAME: Rahul; CITY: Mumbai; SKILL: Sales. You can browse approved openings at " + SITE_URL + ". Candidate applications are free.";
  }
  if (/^(2|recruiter|employer|hiring)$/i.test(message)) {
    await contactRef.set({ leadType: "recruiter_employer", updatedAt: new Date().toISOString() }, { merge: true });
    return "Thanks for contacting AIJOBS for hiring. Please send your name, company name, hiring role, and location. Example: NAME: Rahul; COMPANY: ABC Ltd; ROLE: Sales Manager; CITY: Mumbai. Our team can follow up on your enquiry. Visit " + SITE_URL + "/hire.";
  }
  if (/^(3|consultancy|agency|recruitment agency)$/i.test(message)) {
    await contactRef.set({ leadType: "consultancy", updatedAt: new Date().toISOString() }, { merge: true });
    return "Thanks for contacting AIJOBS as a recruitment consultancy. Please send your name, agency name, hiring specialties, and city. Example: NAME: Rahul; COMPANY: ABC Consultancy; ROLE: IT hiring; CITY: Mumbai. Our team can follow up on your enquiry. Visit " + SITE_URL + "/hire.";
  }

  if (/^(hi|hello|hey|namaste|menu|help|start)$/i.test(message)) {
    return "Namaste! Welcome to AIJOBS WhatsApp Assistant.\n\nPlease choose your enquiry:\n1 — Candidate / looking for a job\n2 — Recruiter / Employer / hiring\n3 — Consultancy / recruitment agency\n\nYou can also type JOBS, a job title or skill, REGISTER, APPLY, STATUS, or HELP.\nReply STOP to stop WhatsApp replies.\n\nCandidate applications on AIJOBS are free. " + SITE_URL;
  }

  if (/\b(job|jobs|opening|openings|vacancy|vacancies|hiring|career|developer|engineer|designer|accountant|internship|remote)\b/i.test(message)) {
    try {
      const jobs = await getPublicJobs(db, message);
      if (!jobs.length) return "I couldn't find a matching approved/live opening right now. Try another job title or skill, or browse " + SITE_URL + ". Candidate applications are free.";
      const lines = jobs.map((job: any, index: number) => {
        const parts = [String(index + 1) + ". " + (job.title || "Open position") + " (Job ID: " + job.id + ")"];
        if (job.company) parts.push("Company: " + job.company);
        if (job.location) parts.push("Location: " + job.location);
        if (job.salary) parts.push("Salary: " + job.salary);
        parts.push("View job and quick-apply: " + job.url);
        parts.push("To apply here in WhatsApp, reply: APPLY " + job.id);
        return parts.join("\n");
      });
      return "AIJOBS approved/live openings matching your message:\n\n" + lines.join("\n\n") + "\n\nYou can apply directly in this chat without creating an account. Candidate applications are free.";
    } catch (error: any) {
      console.warn("[WHATSAPP_JOB_SEARCH]", error?.message || error);
      return "Job search is temporarily unavailable. Please browse current openings at " + SITE_URL + " and try again shortly.";
    }
  }

  if (/\b(register|registration|sign up|signup|create account|candidate account)\b/i.test(lower)) {
    return "To register as a candidate, open " + SITE_URL + " and choose Candidate Registration. Use your own contact details and complete the required fields. AIJOBS does not charge candidates to apply for jobs.";
  }
  if (/^apply$/i.test(message)) {
    return "To apply directly in WhatsApp, first send JOBS or a job title/skill. I will show matching openings. Then reply APPLY followed by the Job ID shown in the message. Candidate applications are free.";
  }
  if (/\\b(apply|application|apply for|apply job)\\b/i.test(lower)) {
    return "To apply directly in WhatsApp, send JOBS or a job title/skill, then reply APPLY followed by the Job ID. You can also open a job link and use Quick Apply without registration. Candidate applications are free.";
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
          timestamp: String(message?.timestamp || ""),
          text: String(message?.text?.body || message?.interactive?.nfm_reply?.response_json || ""),
          receivedAt: new Date().toISOString()
        };
        eventEntries.push(item);
        const isFlowReply = item.messageType === "interactive" && String(message?.interactive?.type || "") === "nfm_reply";
        if (item.from && item.messageId && item.text && (item.messageType === "text" || isFlowReply)) incomingMessages.push(item);
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
      await persistWhatsAppLead(db, message.from, message.text, message.messageId);
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
