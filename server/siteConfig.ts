/**
 * Server-side Site Configuration
 * Production domain: https://aijobs1.in
 */

export const PRODUCTION_DOMAIN = "https://aijobs1.in";
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@aijobs1.in").trim().toLowerCase();
export const ADMIN_NOTIFICATION_EMAIL = (
  process.env.ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL
).trim().toLowerCase();

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
