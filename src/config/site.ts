/**
 * Central Site Configuration
 * Production domain: https://aijobs1.in
 */

export const APP_NAME = "AIJOBS";

export const PRODUCTION_DOMAIN = "https://aijobs1.in";
// Public identifier only. Admin authorization is always verified from the
// authenticated Firebase user and its Firestore role, never from this value.
export const OFFICIAL_ADMIN_EMAIL = "admin@aijobs1.in";
export const ADMIN_LOGIN_URL = `${PRODUCTION_DOMAIN}/admin/login`;

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

  // If unset or pointing to legacy production domains, enforce official production domain
  if (!raw || raw.includes("aijobs1.vercel.app") || raw.includes("aijobs.vercel.app") || raw.includes("aijobs.app")) {
    return PRODUCTION_DOMAIN;
  }

  return raw;
};

export const SITE_URL = getResolvedSiteUrl();

export const HOME_PAGE_URL = `${PRODUCTION_DOMAIN}/`;
export const PRIVACY_POLICY_URL = `${PRODUCTION_DOMAIN}/privacy-policy`;
export const TERMS_OF_SERVICE_URL = `${PRODUCTION_DOMAIN}/terms`;

/**
 * Generates an SEO-friendly job URL slug from job title, location, and job ID.
 * Example output: "customer-support-executive-mumbai-AJ1024"
 */
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

/**
 * Generates the full canonical public job URL for a job.
 * Example: "https://aijobs1.in/jobs/customer-support-executive-mumbai-AJ1024"
 */
export function getPublicJobUrl(job: { title: string; location?: string; id: string; slug?: string }): string {
  const base = SITE_URL;
  if (job.slug) {
    return `${base}/jobs/${job.slug}`;
  }
  const slug = generateJobSlug(job.title, job.location, job.id);
  return `${base}/jobs/${slug}`;
}
