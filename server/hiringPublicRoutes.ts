import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const SITE_URL = "https://aijobs1.in";
const SOCIAL_IMAGE = `${SITE_URL}/images/aijobs-ai-logo.png`;
const BLOCKED = new Set(["draft", "pending", "pending_approval", "pending_review", "pending_admin_verification", "changes_requested", "rejected", "expired", "closed", "deleted"]);

function esc(v: any) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function status(v: any) {
  return String(v || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function asDate(value: any): Date | null {
  if (!value) return null;
  const raw = typeof value?.toDate === "function" ? value.toDate() : value;
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asIsoDate(value: any, fallback = new Date()): string {
  return (asDate(value) || fallback).toISOString().slice(0, 10);
}

function isLive(job: any) {
  const normalized = status(job.status);
  if (normalized !== "approved" || job.approved === false || BLOCKED.has(normalized)) return false;
  const expiry = asDate(job.validThrough || job.expiryDate || job.applyDeadline);
  if (expiry && expiry.getTime() < Date.now()) return false;
  return job.isPublic !== false && job.publicVisibility !== false && job.visibility !== "private";
}

function googleEmploymentType(v: any) {
  const raw = String(v || "FULL_TIME").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    CONTRACT: "CONTRACTOR",
    CONTRACTUAL: "CONTRACTOR",
    INTERNSHIP: "INTERN",
    FULLTIME: "FULL_TIME",
    PARTTIME: "PART_TIME"
  };
  const normalized = aliases[raw] || raw;
  const allowed = ["FULL_TIME", "PART_TIME", "CONTRACTOR", "TEMPORARY", "INTERN", "VOLUNTEER", "PER_DIEM", "OTHER"];
  return allowed.includes(normalized) ? normalized : "OTHER";
}

function googleSalaryUnit(v: any) {
  const raw = String(v || "YEAR").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    ANNUAL: "YEAR",
    ANNUALLY: "YEAR",
    YEARLY: "YEAR",
    PA: "YEAR",
    PER_ANNUM: "YEAR",
    MONTHLY: "MONTH",
    WEEKLY: "WEEK",
    DAILY: "DAY",
    HOURLY: "HOUR"
  };
  const normalized = aliases[raw] || raw;
  return ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"].includes(normalized) ? normalized : "YEAR";
}

function isHttpUrl(value: any): boolean {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function publicUrl(job: any, id: string) {
  const canonical = String(job.canonicalUrl || "").trim();
  if (canonical.startsWith(`${SITE_URL}/jobs/`)) return canonical;
  const slug = job.slug || `${String(job.title || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${id}`;
  return `${SITE_URL}/jobs/${encodeURIComponent(String(slug))}`;
}

function textList(value: any): string[] {
  if (Array.isArray(value)) return value.map(v => String(v || "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\n]/).map(v => v.trim()).filter(Boolean);
  return [];
}

function plainText(value: any): string {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function handleHiringPublicRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (!(path === "/sitemap.xml" || path === "/job-sitemap.xml" || path.startsWith("/jobs/"))) return false;
  const db = getFirestoreDb();

  if ((path === "/sitemap.xml" || path === "/job-sitemap.xml") && req.method === "GET") {
    const snap = await db.collection("jobs").get();
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(isLive);
    const staticUrls = path === "/job-sitemap.xml" ? [] : ["/", "/jobs", "/hire", "/hire/employer", "/hire/recruiter", "/hire/consultancy"];
    const nodes = [
      ...staticUrls.map(p => `<url><loc>${SITE_URL}${p}</loc><changefreq>daily</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`),
      ...jobs.map(j => `<url><loc>${esc(publicUrl(j, j.id))}</loc><lastmod>${asIsoDate(j.updatedAt || j.approvedAt || j.publishedAt || j.createdAt)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`)
    ];
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes.join("")}</urlset>`);
    return true;
  }

  if (path.startsWith("/jobs/") && req.method === "GET") {
    const slug = decodeURIComponent(path.slice("/jobs/".length));
    let jobSnap: any = null;
    const q = await db.collection("jobs").where("slug", "==", slug).limit(1).get().catch(() => null);
    if (q && !q.empty) jobSnap = q.docs[0];
    if (!jobSnap) {
      const match = slug.match(/-(job_[a-z0-9]+)$/i);
      if (match) {
        const direct = await db.collection("jobs").doc(match[1]).get();
        if (direct.exists) jobSnap = direct;
      }
    }
    if (!jobSnap) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send("Job not found");
      return true;
    }

    const job: any = { id: jobSnap.id, ...jobSnap.data() };
    if (!isLive(job)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send("This job is not publicly available.");
      return true;
    }

    const canonical = publicUrl(job, job.id);
    const expiry = asDate(job.validThrough || job.expiryDate || job.applyDeadline) || new Date(Date.now() + 30 * 86400000);
    const remote = status(job.workMode) === "remote" || status(job.jobLocationType) === "telecommute";
    const companyName = String(job.hiringOrganizationName || job.companyName || "AIJOBS Hiring Partner").trim();
    const description = String(job.description || job.jobDescription || "").trim();
    const descriptionPlain = plainText(description);
    const metaDescription = (descriptionPlain || `Apply for ${job.title || "this job"} at ${companyName} on AIJOBS.`).slice(0, 158);
    const skills = textList(job.skillsRequired || job.requiredSkills || job.skills);
    const responsibilities = textList(job.responsibilities || job.keyResponsibilities);
    const qualifications = textList(job.qualifications || job.minimumQualification || job.requirements);
    const benefits = textList(job.benefits);
    const experienceRequirement = String(job.experienceRequirements || job.experienceRequired || [job.minimumExperience, job.maximumExperience].filter(v => v !== undefined && v !== null && v !== "").join("-")).trim();
    const educationRequirement = String(job.educationRequirements || job.minimumQualification || "").trim();

    const organization: any = { "@type": "Organization", name: companyName };
    if (isHttpUrl(job.companyWebsite || job.website)) organization.sameAs = String(job.companyWebsite || job.website);
    if (isHttpUrl(job.companyLogo)) organization.logo = String(job.companyLogo);

    const schema: any = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      url: canonical,
      title: job.title,
      description: description || `Apply for ${job.title || "this position"} at ${companyName}.`,
      datePosted: asIsoDate(job.datePosted || job.approvedAt || job.publishedAt || job.createdAt),
      validThrough: expiry.toISOString(),
      employmentType: googleEmploymentType(job.employmentType || job.type),
      identifier: { "@type": "PropertyValue", name: companyName, value: job.id },
      hiringOrganization: organization,
      directApply: true
    };

    if (job.industry) schema.industry = String(job.industry);
    if (skills.length) schema.skills = skills.join(", ");
    if (responsibilities.length) schema.responsibilities = responsibilities.join("\n");
    if (qualifications.length) schema.qualifications = qualifications.join("\n");
    if (experienceRequirement) schema.experienceRequirements = experienceRequirement;
    if (educationRequirement) schema.educationRequirements = educationRequirement;

    if (remote) {
      schema.jobLocationType = "TELECOMMUTE";
      schema.applicantLocationRequirements = { "@type": "Country", name: job.country || "India" };
    } else {
      schema.jobLocation = {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          streetAddress: job.streetAddress || undefined,
          addressLocality: job.city || job.location || "",
          addressRegion: job.state || "",
          postalCode: job.postalCode || undefined,
          addressCountry: job.countryCode || job.country || "IN"
        }
      };
    }

    const minSalary = Number(job.minimumSalary);
    const maxSalary = Number(job.maximumSalary);
    if (Number.isFinite(minSalary) && minSalary > 0 || Number.isFinite(maxSalary) && maxSalary > 0) {
      schema.baseSalary = {
        "@type": "MonetaryAmount",
        currency: job.salaryCurrency || "INR",
        value: {
          "@type": "QuantitativeValue",
          minValue: Number.isFinite(minSalary) && minSalary > 0 ? minSalary : undefined,
          maxValue: Number.isFinite(maxSalary) && maxSalary > 0 ? maxSalary : undefined,
          unitText: googleSalaryUnit(job.salaryPeriod)
        }
      };
    }

    const applyUrl = `/?jobId=${encodeURIComponent(job.id)}&apply=true&utm_source=google_jobs_apply&utm_medium=organic&utm_campaign=google_jobs_apply`;
    const consultancyName = String(job.consultancyName || job.consultancy || "").trim();
    const jdDownload = isHttpUrl(job.jdFileUrl) ? String(job.jdFileUrl) : "";
    const socialImage = isHttpUrl(job.companyLogo) ? String(job.companyLogo) : SOCIAL_IMAGE;
    const locationText = String(job.location || [job.city, job.state].filter(Boolean).join(", ") || (remote ? "Remote" : "India"));

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300");
    res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large");
    res.status(200).send(`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(job.title)} at ${esc(companyName)} | Jobs in ${esc(locationText)} | AIJOBS</title><meta name="description" content="${esc(metaDescription)}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta property="og:type" content="website"><meta property="og:site_name" content="AIJOBS"><meta property="og:locale" content="en_IN"><meta property="og:title" content="${esc(job.title)} at ${esc(companyName)} | AIJOBS"><meta property="og:description" content="${esc(metaDescription)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(socialImage)}"><meta property="og:image:alt" content="${esc(job.title)} at ${esc(companyName)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(job.title)} at ${esc(companyName)} | AIJOBS"><meta name="twitter:description" content="${esc(metaDescription)}"><meta name="twitter:image" content="${esc(socialImage)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script><style>body{margin:0;background:#07152F;color:#fff;font-family:Inter,system-ui,sans-serif}.w{max-width:900px;margin:auto;padding:28px}.c{background:#0b1c39;border:1px solid #20395f;border-radius:22px;padding:28px}.b{display:inline-block;padding:6px 10px;border-radius:99px;background:#12376b;color:#93c5fd;font-size:12px}.m{color:#94a3b8}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.g div{padding:12px;background:#08162e;border-radius:12px}.a{display:inline-block;text-decoration:none;background:#2563EB;color:#fff;padding:13px 18px;border-radius:12px;font-weight:800;margin-top:18px}.jd{display:inline-block;text-decoration:none;color:#a5b4fc;border:1px solid #4f46e5;padding:10px 14px;border-radius:12px;font-weight:700;margin-top:14px}@media(max-width:700px){.g{grid-template-columns:1fr}}</style></head><body><div class="w"><div style="font-weight:900;font-size:22px;margin-bottom:18px">AIJOBS</div><div class="c"><span class="b">Verified Job</span><h1>${esc(job.title)}</h1><p class="m">${esc(companyName)} · ${esc(locationText)}</p>${consultancyName ? `<p class="m"><strong>Posted through:</strong> ${esc(consultancyName)} on AIJOBS</p>` : `<p class="m"><strong>Published on:</strong> AIJOBS</p>`}<div class="g"><div><b>Salary</b><br><span class="m">${minSalary > 0 || maxSalary > 0 ? `${esc(job.salaryCurrency || "INR")} ${esc(minSalary || "")} - ${esc(maxSalary || "")} ${esc(googleSalaryUnit(job.salaryPeriod))}` : "As per company policy"}</span></div><div><b>Experience</b><br><span class="m">${esc(experienceRequirement || "As per role")}</span></div><div><b>Openings</b><br><span class="m">${esc(job.openings || 1)}</span></div><div><b>Qualification</b><br><span class="m">${esc(educationRequirement || "As per role")}</span></div><div><b>Employment</b><br><span class="m">${esc(job.employmentType || job.type || "")}</span></div><div><b>Work Mode</b><br><span class="m">${esc(job.workMode || (remote ? "Remote" : "On-site"))}</span></div></div>${skills.length ? `<h3>Required Skills</h3><p class="m">${esc(skills.join(", "))}</p>` : ""}<h3>Job Description</h3><div class="m" style="white-space:pre-wrap;line-height:1.7">${esc(description || "See role details and requirements above.")}</div>${jdDownload ? `<a class="jd" href="${esc(jdDownload)}" target="_blank" rel="noopener noreferrer">View / Download Full JD</a>` : ""}${responsibilities.length ? `<h3>Responsibilities</h3><div class="m" style="white-space:pre-wrap">${esc(responsibilities.join("\n"))}</div>` : ""}${qualifications.length ? `<h3>Qualifications</h3><div class="m" style="white-space:pre-wrap">${esc(qualifications.join("\n"))}</div>` : ""}${benefits.length ? `<h3>Benefits</h3><div class="m" style="white-space:pre-wrap">${esc(benefits.join("\n"))}</div>` : ""}<p class="m">Posted: ${esc(asIsoDate(job.datePosted || job.approvedAt || job.publishedAt || job.createdAt))} · Expires: ${esc(expiry.toISOString().slice(0, 10))}</p><a class="a" href="${applyUrl}">Apply on AIJOBS →</a><p class="m" style="font-size:12px;margin-top:16px">AIJOBS does not charge candidates for job applications, interviews, selection or placement.</p></div></div></body></html>`);
    return true;
  }

  return false;
}
