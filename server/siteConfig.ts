/**
 * Server-side Site Configuration
 * Production domain: https://aijobs1.in
 */

export const PRODUCTION_DOMAIN = "https://aijobs1.in";

export const INFO_EMAIL = (process.env.INFO_EMAIL || "info@aijobs1.in").trim().toLowerCase();
export const HELP_EMAIL = (process.env.HELP_EMAIL || "help@aijobs1.in").trim().toLowerCase();
export const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || "support@aijobs1.in").trim().toLowerCase();
export const CAREER_EMAIL = (process.env.CAREER_EMAIL || "career@aijobs1.in").trim().toLowerCase();
export const SALES_EMAIL = (process.env.SALES_EMAIL || "salesindia@aijobs1.in").trim().toLowerCase();
export const COMPLIANCE_EMAIL = (process.env.COMPLIANCE_EMAIL || "compliant@aijobs1.in").trim().toLowerCase();

export const ROLE_EMAILS = Object.freeze({
  info: INFO_EMAIL,
  help: HELP_EMAIL,
  helpdesk: HELP_EMAIL,
  support: SUPPORT_EMAIL,
  candidate: CAREER_EMAIL,
  career: CAREER_EMAIL,
  jobseeker: CAREER_EMAIL,
  employer: SALES_EMAIL,
  recruiter: SALES_EMAIL,
  consultancy: SALES_EMAIL,
  sales: SALES_EMAIL,
  compliance: COMPLIANCE_EMAIL,
  legal: COMPLIANCE_EMAIL,
  privacy: COMPLIANCE_EMAIL,
  grievance: COMPLIANCE_EMAIL,
  fraud: COMPLIANCE_EMAIL,
  dataDeletion: COMPLIANCE_EMAIL,
});

export function getRoleContactEmail(role?: string | null): string {
  const normalized = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (["help", "helpdesk", "faq", "general_help", "general_query"].includes(normalized)) {
    return HELP_EMAIL;
  }

  if (["support", "ticket", "technical_support", "account_support", "kyc_support", "payment_support", "billing_support"].includes(normalized)) {
    return SUPPORT_EMAIL;
  }

  if (["candidate", "career", "jobseeker", "job_seeker", "job_alert", "career_guidance", "resume", "application"].includes(normalized)) {
    return CAREER_EMAIL;
  }

  if (["employer", "recruiter", "consultancy", "agency", "corporate", "sales", "partner", "partnership", "billing", "subscription", "hiring"].includes(normalized)) {
    return SALES_EMAIL;
  }

  if (["compliance", "legal", "privacy", "grievance", "fraud", "safety", "data_deletion", "deletion"].includes(normalized)) {
    return COMPLIANCE_EMAIL;
  }

  return INFO_EMAIL;
}

export function getPublicSiteUrl(): string {
  const envUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VITE_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  if (
    !envUrl ||
    envUrl.includes("aijobs1.vercel.app") ||
    envUrl.includes("aijobs.vercel.app") ||
    envUrl.includes("aijobs.app")
  ) {
    return PRODUCTION_DOMAIN;
  }

  return envUrl;
}

export const SITE_URL = getPublicSiteUrl();
