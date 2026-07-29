/**
 * Central Site Configuration
 * Production domain: https://aijobs1.vercel.app
 */

export const SITE_URL = 
  import.meta.env.VITE_SITE_URL || 
  import.meta.env.NEXT_PUBLIC_SITE_URL || 
  (typeof window !== "undefined" ? window.location.origin : "https://aijobs1.vercel.app");

export const PRODUCTION_DOMAIN = "https://aijobs1.vercel.app";

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
 * Example: "https://aijobs1.vercel.app/jobs/customer-support-executive-mumbai-AJ1024"
 */
export function getPublicJobUrl(job: { title: string; location?: string; id: string; slug?: string }): string {
  if (job.slug) {
    return `${SITE_URL}/jobs/${job.slug}`;
  }
  const slug = generateJobSlug(job.title, job.location, job.id);
  return `${SITE_URL}/jobs/${slug}`;
}
