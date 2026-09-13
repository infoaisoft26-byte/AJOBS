import app from "../appServer.js";
import { dispatchEmail } from "../server/emailService.js";
import { getRoleContactEmail } from "../server/siteConfig.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function resolveInquiryRole(type: string): string {
  const normalized = type.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["sales", "employer", "recruiter", "consultancy", "partner", "partnership", "billing", "subscription", "hiring"].includes(normalized)) {
    return "sales";
  }
  if (["compliance", "privacy", "grievance", "fraud", "safety", "legal", "data_deletion", "deletion"].includes(normalized)) {
    return "compliance";
  }
  return "info";
}

async function handleWebsiteInquiry(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  const body = req.body || {};
  const name = clean(body.name, 120);
  const email = clean(body.email, 180).toLowerCase();
  const phone = clean(body.phone, 40);
  const subject = clean(body.subject, 180) || "New website enquiry";
  const message = clean(body.message, 5000);
  const type = clean(body.type || body.role || body.category || "general", 80);
  const pageUrl = clean(body.pageUrl, 500);

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: "Name, email and message are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, error: "Please enter a valid email address." });
  }

  const routingRole = resolveInquiryRole(type);
  const recipient = getRoleContactEmail(routingRole);
  const routingLabel = routingRole === "sales" ? "Sales / Hiring" : routingRole === "compliance" ? "Compliance / Grievance" : "General / Support";

  const customMessage = [
    `New AIJOBS website enquiry`,
    `Routing: ${routingLabel}`,
    `From: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : "",
    `Category: ${type || "general"}`,
    pageUrl ? `Page: ${pageUrl}` : "",
    "",
    "Message:",
    message,
  ].filter(Boolean).join("\n");

  try {
    const result = await dispatchEmail({
      to: recipient,
      templateName: "custom-admin-email",
      data: {
        recipientName: "AIJOBS Team",
        customSubject: `[AIJOBS Website • ${routingLabel}] ${subject}`,
        customMessage,
        replyToEmail: email,
      },
      userId: "public_website_visitor",
      recipientName: "AIJOBS Team",
      recipientRole: routingRole,
      createdBy: "public_website_contact",
      category: "transactional",
    });

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error || "Email delivery failed." });
    }

    return res.json({
      success: true,
      message: "Your message has been sent to the correct AIJOBS team.",
      routedTo: recipient,
      route: routingRole,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("[/api/contact/inquiry]", error?.message || error);
    return res.status(500).json({ success: false, error: "Unable to send your message right now. Please try again." });
  }
}

export default async function handler(req: any, res: any) {
  const path = String(req.url || "").split("?")[0];
  if (path === "/api/contact/inquiry" || path === "/contact/inquiry") {
    return handleWebsiteInquiry(req, res);
  }
  return app(req, res);
}
