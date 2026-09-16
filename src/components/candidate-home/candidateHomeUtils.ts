import type { JobPosting } from "../../types";

export const formatPostedDate = (job: JobPosting) => {
  const value = job.createdAt || job.datePosted;
  const raw = typeof (value as any)?.toDate === "function" ? (value as any).toDate() : value;
  const timestamp = raw ? new Date(raw as string | Date).getTime() : 0;
  if (!timestamp || !Number.isFinite(timestamp)) return "Recently posted";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(timestamp));
};

export const getCompanyName = (job: JobPosting) =>
  job.companyName || job.hiringOrganizationName || "Company details on job page";
