/**
 * Central Site Configuration
 * Production domain: https://aijobs1.in
 */

export const APP_NAME = "AIJOBS";
export const OFFICIAL_ADMIN_EMAIL = "admin@aijobs1.in";

export const PRODUCTION_DOMAIN = "https://aijobs1.in";

/**
 * Official role-based AIJOBS mailboxes.
 *
 * info@aijobs1.in
 *   General enquiries, candidate support, account help and website contact.
 *
 * salesindia@aijobs1.in
 *   Employer, recruiter and consultancy sales, hiring plans, subscriptions and partnerships.
 *
 * compliant@aijobs1.in
 *   Compliance, privacy, grievance, fraud/safety, legal and data-deletion requests.
 */
export const CONTACT_EMAILS = Object.freeze({
  info: "info@aijobs1.in",
  support: "info@aijobs1.in",
  candidate: "info@aijobs1.in",
  sales: "salesindia@aijobs1.in",
  employer: "salesindia@aijobs1.in",
  recruiter: "salesindia@aijobs1.in",
  consultancy: "salesindia@aijobs1.in",
  compliance: "compliant@aijobs1.in",
  legal: "compliant@aijobs1.in",
  privacy: "compliant@aijobs1.in",
  grievance: "compliant@aijobs1.in",
  fraud: "compliant@aijobs1.in",
  dataDeletion: "compliant@aijobs1.in",
} as const);

export type ContactEmailRole = keyof typeof CONTACT_EMAILS;

export function getContactEmailForRole(role?: string | null): string {
  const normalized = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (["employer", "recruiter", "consultancy", "agency", "corporate", "sales", "partner"].includes(normalized)) {
    return CONTACT_EMAILS.sales;
  }

  if (["compliance", "legal", "privacy", "grievance", "fraud", "safety", "data_deletion", "deletion"].includes(normalized)) {
    return CONTACT_EMAILS.compliance;
  }

  return CONTACT_EMAILS.info;
}

const getResolvedSiteUrl = (): string => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
  }

  const raw = (
    (typeof import.meta !== "undefined" && import.meta.env?.NEXT_PUBLIC_SITE_URL) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_SITE_URL) ||
    (typeof process !== "undefined" && process.env?.SITE_URL) ||
    (typeof process !== "undefined" && process.env?.APP_URL) ||
    ""
  ).trim().replace(/\/+$/, "");

  if (!raw || raw.includes("vercel.app") || raw.includes("aijobs.app")) {
    return PRODUCTION_DOMAIN;
  }

  return raw;
};

export const SITE_URL = getResolvedSiteUrl();

/**
 * Returns an official AIJOBS public URL. Local development stays on localhost,
 * while Vercel preview/deployment hosts are forced onto https://aijobs1.in.
 */
export function getOfficialPublicUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return `${window.location.origin}${normalizedPath}`;
    }
  }

  return `${PRODUCTION_DOMAIN}${normalizedPath}`;
}

export const HOME_PAGE_URL = `${PRODUCTION_DOMAIN}/`;
export const PRIVACY_POLICY_URL = `${PRODUCTION_DOMAIN}/privacy-policy`;
export const TERMS_OF_SERVICE_URL = `${PRODUCTION_DOMAIN}/terms`;

export function generateJobSlug(title: string, location?: string, id?: string): string {
  const cleanTitle = (title || "job")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const cleanLocation = location
    ? location
        .split(",")[0]
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
    : "";

  const cleanId = (id || "").replace(/[^a-zA-Z0-9_-]/g, "");

  const parts = [cleanTitle];
  if (cleanLocation) parts.push(cleanLocation);
  if (cleanId) parts.push(cleanId);

  return parts.join("-");
}

export function getPublicJobUrl(job: { title: string; location?: string; id: string; slug?: string }): string {
  const base = SITE_URL;
  if (job.slug) {
    return `${base}/jobs/${job.slug}`;
  }
  const slug = generateJobSlug(job.title, job.location, job.id);
  return `${base}/jobs/${slug}`;
}
