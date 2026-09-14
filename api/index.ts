import app from "../appServer.js";
import { getRoleContactEmail } from "../server/siteConfig.js";
import { sendWorkspaceRoleEmail, WorkspaceSenderRole } from "../server/workspaceRoleEmail.js";
import { handleHiringFunnelApi } from "../server/hiringFunnelService.js";
import { handleHiringIndexingRoute } from "../server/hiringIndexingRoute.js";
import { handleHiringPublicRoute } from "../server/hiringPublicRoutes.js";
import { handleHiringAnalyticsRoute } from "../server/hiringAnalyticsRoute.js";
import { handleHiringLandingRoute } from "../server/hiringLandingRoute.js";
import { handleHiringWorkspaceRoute } from "../server/hiringWorkspaceRoute.js";
import { handleAdminJobReviewRoute } from "../server/adminJobReviewRoute.js";
import { handleAgreementOtpRoute } from "../server/agreementOtpRoute.js";
import { handleAdminProfileRepairRoute } from "../server/adminProfileRepairRoute.js";
import { verifyAndInjectAbacIdentity } from "../server/authenticatedAbacGateway.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clean(value: unknown, max: number): string { return String(value ?? "").trim().slice(0, max); }
function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }
function resolveInquiryRole(type: string): WorkspaceSenderRole {
  const normalized = type.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["sales", "employer", "recruiter", "consultancy", "partner", "partnership", "billing", "subscription", "hiring"].includes(normalized)) return "sales";
  if (["compliance", "privacy", "grievance", "fraud", "safety", "legal", "data_deletion", "deletion"].includes(normalized)) return "compliance";
  return "info";
}
async function handleWebsiteInquiry(req: any, res: any) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ success: false, error: "Method not allowed." }); }
  const body = req.body || {};
  const name = clean(body.name, 120), email = clean(body.email, 180).toLowerCase(), phone = clean(body.phone, 40), subject = clean(body.subject, 180) || "New website enquiry", message = clean(body.message, 5000), type = clean(body.type || body.role || body.category || "general", 80), pageUrl = clean(body.pageUrl, 500);
  if (!name || !email || !message) return res.status(400).json({ success: false, error: "Name, email and message are required." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, error: "Please enter a valid email address." });
  const routingRole = resolveInquiryRole(type), recipient = getRoleContactEmail(routingRole), routingLabel = routingRole === "sales" ? "Sales / Hiring" : routingRole === "compliance" ? "Compliance / Grievance" : "General / Support";
  const customMessage = ["New AIJOBS website enquiry", `Routing: ${routingLabel}`, `From: ${name}`, `Email: ${email}`, phone ? `Phone: ${phone}` : "", `Category: ${type || "general"}`, pageUrl ? `Page: ${pageUrl}` : "", "", "Message:", message].filter(Boolean).join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a"><h2>New AIJOBS Website Enquiry</h2><p><strong>Routing:</strong> ${escapeHtml(routingLabel)}</p><p><strong>From:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p>${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}<p><strong>Category:</strong> ${escapeHtml(type || "general")}</p>${pageUrl ? `<p><strong>Page:</strong> ${escapeHtml(pageUrl)}</p>` : ""}<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0"/><p style="white-space:pre-wrap">${escapeHtml(message)}</p></div>`;
  try {
    const result = await sendWorkspaceRoleEmail({ role: routingRole, to: recipient, subject: `[AIJOBS Website • ${routingLabel}] ${subject}`, text: customMessage, html, replyTo: email });
    return res.json({ success: true, message: "Your message has been sent to the correct AIJOBS team.", routedTo: recipient, sentFrom: result.from, route: routingRole, messageId: result.messageId });
  } catch (error: any) {
    console.error("[/api/contact/inquiry]", error?.message || error);
    return res.status(500).json({ success: false, error: "Unable to send your message right now. Please check the Google Workspace SMTP configuration." });
  }
}
export default async function handler(req: any, res: any) {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path === "/api/bootstrap-superadmin") {
    const handled = await handleAdminProfileRepairRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path === "/api/admin-platform-insights" || path === "/api/consultancy-natural-search") {
    const handled = await verifyAndInjectAbacIdentity(req, res, path);
    if (handled || res.headersSent) return;
  }
  if (path === "/api/agreements/send-otp") {
    const handled = await handleAgreementOtpRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path === "/api/applications/admin/jobs/review") {
    const handled = await handleAdminJobReviewRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path === "/hire" || path.startsWith("/hire/")) {
    const handled = await handleHiringLandingRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path === "/sitemap.xml" || path === "/job-sitemap.xml" || path.startsWith("/jobs/")) {
    const handled = await handleHiringPublicRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path === "/api/hire/event" || path === "/api/hire/admin/analytics-v2") {
    const handled = await handleHiringAnalyticsRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path === "/api/hire/admin/index-job") {
    const handled = await handleHiringIndexingRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path.startsWith("/api/hire/workspace")) {
    const handled = await handleHiringWorkspaceRoute(req, res);
    if (handled || res.headersSent) return;
  }
  if (path.startsWith("/api/hire")) {
    const handled = await handleHiringFunnelApi(req, res);
    if (handled || res.headersSent) return;
  }
  if (path === "/api/contact/inquiry" || path === "/contact/inquiry") return handleWebsiteInquiry(req, res);
  return app(req, res);
}
