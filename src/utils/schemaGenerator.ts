import { JobPosting } from "../types";
import { getPublicJobUrl } from "../config/site";

function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  const raw = typeof value?.toDate === "function" ? value.toDate() : value;
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isHttpUrl(value: any): boolean {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeEmploymentType(value: any): string | undefined {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!raw) return undefined;
  const aliases: Record<string, string> = {
    CONTRACT: "CONTRACTOR",
    CONTRACTUAL: "CONTRACTOR",
    FULLTIME: "FULL_TIME",
    PARTTIME: "PART_TIME",
    FREELANCE: "OTHER"
  };
  const normalized = aliases[raw] || raw;
  return ["FULL_TIME", "PART_TIME", "CONTRACTOR", "TEMPORARY", "INTERN", "VOLUNTEER", "PER_DIEM", "OTHER"].includes(normalized)
    ? normalized
    : "OTHER";
}

/**
 * Build JobPosting JSON-LD only from facts actually stored on the job.
 * Missing salary, expiry, employer URLs and location fields are deliberately omitted.
 */
export function generateJobPostingSchema(job: JobPosting): Record<string, any> {
  const title = String(job.title || "").trim();
  const description = String(job.description || "").trim();
  const hiringName = String(job.hiringOrganizationName || job.companyName || "").trim();
  const jobUrl = job.canonicalUrl || getPublicJobUrl(job);
  const postedAt = toDate(job.datePosted || job.approvedAt || job.createdAt);
  const expiryDate = toDate(job.validThrough || job.expiryDate || job.applyDeadline);
  const remote = ["remote", "telecommute"].includes(String(job.workMode || "").trim().toLowerCase());
  const employmentType = normalizeEmploymentType(job.employmentType || job.type);

  const schema: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title,
    description,
    url: jobUrl,
    hiringOrganization: {
      "@type": "Organization",
      name: hiringName
    },
    directApply: true
  };

  if (job.id) {
    schema.identifier = {
      "@type": "PropertyValue",
      name: hiringName || "AIJOBS",
      value: job.id
    };
  }
  if (postedAt) schema.datePosted = postedAt.toISOString().slice(0, 10);
  if (expiryDate) schema.validThrough = expiryDate.toISOString();
  if (employmentType) schema.employmentType = employmentType;

  if (isHttpUrl(job.companyWebsite)) schema.hiringOrganization.sameAs = job.companyWebsite;
  if (isHttpUrl(job.companyLogo)) schema.hiringOrganization.logo = job.companyLogo;

  if (remote) {
    const applicantCountry = String(job.country || "").trim();
    if (applicantCountry) {
      schema.jobLocationType = "TELECOMMUTE";
      schema.applicantLocationRequirements = { "@type": "Country", name: applicantCountry };
    }
  } else {
    const city = String(job.city || job.location || "").trim();
    if (city) {
      const address: Record<string, string> = {
        "@type": "PostalAddress",
        addressLocality: city,
        addressCountry: String(job.country || "IN").trim()
      };
      if (job.streetAddress?.trim()) address.streetAddress = job.streetAddress.trim();
      if (job.state?.trim()) address.addressRegion = job.state.trim();
      if (job.postalCode?.trim()) address.postalCode = job.postalCode.trim();
      schema.jobLocation = { "@type": "Place", address };
    }
  }

  const minSalary = Number(job.minimumSalary);
  const maxSalary = Number(job.maximumSalary);
  if ((Number.isFinite(minSalary) && minSalary > 0) || (Number.isFinite(maxSalary) && maxSalary > 0)) {
    const value: Record<string, number | string> = {};
    if (Number.isFinite(minSalary) && minSalary > 0) value.minValue = minSalary;
    if (Number.isFinite(maxSalary) && maxSalary > 0) value.maxValue = maxSalary;
    const rawUnit = String(job.salaryPeriod || "YEAR").trim().toUpperCase().replace(/[\\s-]+/g, "_");
    const unitAliases: Record<string, string> = { HOURLY: "HOUR", DAILY: "DAY", WEEKLY: "WEEK", MONTHLY: "MONTH", YEARLY: "YEAR", ANNUAL: "YEAR", ANNUALLY: "YEAR", PER_ANNUM: "YEAR" };
    const normalizedUnit = unitAliases[rawUnit] || rawUnit;
    value.unitText = ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"].includes(normalizedUnit) ? normalizedUnit : "YEAR";
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: String(job.salaryCurrency || "INR").toUpperCase(),
      value: { "@type": "QuantitativeValue", ...value }
    };
  }

  if (job.skillsRequired?.length) schema.skills = job.skillsRequired.filter(Boolean).join(", ");
  if (job.responsibilities) schema.responsibilities = job.responsibilities;

  // Google JobPosting accepts plain-text requirements or Schema.org requirement objects.
  // Plain text is robust for the free-form values collected by AIJOBS forms.
  const educationRequirement = String(job.qualification || job.education || "").trim();
  if (educationRequirement) schema.educationRequirements = educationRequirement;

  const hasMinExperience = job.minimumExperience !== undefined && job.minimumExperience !== null && String(job.minimumExperience).trim() !== "";
  const hasMaxExperience = job.maximumExperience !== undefined && job.maximumExperience !== null && String(job.maximumExperience).trim() !== "";
  const minExperience = hasMinExperience ? Number(job.minimumExperience) : Number.NaN;
  const maxExperience = hasMaxExperience ? Number(job.maximumExperience) : Number.NaN;
  const experienceLabel = String(job.experience || "").trim();
  const experienceText = [
    Number.isFinite(minExperience) && minExperience >= 0 ? `${minExperience} years` : "",
    Number.isFinite(maxExperience) && maxExperience >= 0 && maxExperience !== minExperience ? `up to ${maxExperience} years` : "",
    experienceLabel
  ].filter(Boolean).join(" ").trim();
  if (experienceText) schema.experienceRequirements = experienceText;

  return schema;
}

export function generateJobPostingSchemaScript(job: JobPosting): string {
  return '<script type="application/ld+json">' +
    JSON.stringify(generateJobPostingSchema(job)).replace(/</g, "\\u003c") +
    '</script>';
}

export function injectJobPostingSchema(job: JobPosting | null): void {
  if (!job) return;
  const schemaId = `job-schema-${job.id}`;
  const existing = document.getElementById(schemaId);
  const script = existing || document.createElement("script");
  script.id = schemaId;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(generateJobPostingSchema(job));
  if (!existing) document.head.appendChild(script);
}
