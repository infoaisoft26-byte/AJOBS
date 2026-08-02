import React from "react";
import { View } from "lucide-react";
import { JobPosting } from "../types";

/**
 * Generates a valid Schema.org JobPosting JSON-LD schema object for Google Jobs search indexing.
 */
export function generateJobPostingSchema(job: JobPosting): Record<string, any> {
  const publishDate = job.datePosted 
    ? new Date(job.datePosted).toISOString().split("T")[0]
    : job.createdAt 
      ? new Date(job.createdAt).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0];

  const expiryDate = job.validThrough 
    ? new Date(job.validThrough).toISOString().split("T")[0]
    : job.expiryDate 
      ? new Date(job.expiryDate).toISOString().split("T")[0] 
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // default 60 days

  // Parse employment types to standard Schema.org values
  let standardEmploymentType = "FULL_TIME";
  const rawType = (job.employmentType || job.type || "").toUpperCase();
  if (rawType.includes("PART")) {
    standardEmploymentType = "PART_TIME";
  } else if (rawType.includes("CONTRACT") || rawType.includes("TEMP")) {
    standardEmploymentType = "CONTRACTOR";
  } else if (rawType.includes("INTERN")) {
    standardEmploymentType = "INTERN";
  } else if (rawType.includes("FREE")) {
    standardEmploymentType = "FREELANCE";
  }

  // Parse salary values
  const minSalary = job.minimumSalary || 300000;
  const maxSalary = job.maximumSalary || 1200000;
  const currency = job.salaryCurrency || "INR";
  let salaryPeriod = (job.salaryPeriod || "YEAR").toUpperCase();
  if (salaryPeriod === "MONTHLY") salaryPeriod = "MONTH";
  if (salaryPeriod === "YEARLY") salaryPeriod = "YEAR";
  if (salaryPeriod === "HOURLY") salaryPeriod = "HOUR";

  // Actual Hiring Organization (Client / Employer)
  const hiringName = job.hiringOrganizationName || job.companyName || "AIJobs Client";
  const companyWebsite = job.companyWebsite || `https://${hiringName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

  // Address components
  let city = job.city || "Bangalore";
  let state = job.state || "Karnataka";
  const country = job.country || "IN";

  if (!job.city && job.location) {
    const parts = job.location.split(",").map(p => p.trim());
    if (parts.length > 0) city = parts[0];
    if (parts.length > 1) state = parts[1];
  }

  const isRemote = job.workMode === "Remote" || (job.location || "").toLowerCase().includes("remote");

  const schemaObj: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "description": (job.description || `Apply for ${job.title} at ${hiringName}. View eligibility, key requirements, salary structure, and job specifications.`).trim(),
    "identifier": {
      "@type": "PropertyValue",
      "name": hiringName,
      "value": job.id || `job_${Date.now()}`
    },
    "datePosted": publishDate,
    "validThrough": expiryDate,
    "employmentType": standardEmploymentType,
    "hiringOrganization": {
      "@type": "Organization",
      "name": hiringName,
      "sameAs": companyWebsite,
      "logo": job.companyLogo || undefined
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": job.streetAddress || undefined,
        "addressLocality": city,
        "addressRegion": state,
        "postalCode": job.postalCode || undefined,
        "addressCountry": country
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": currency,
      "value": {
        "@type": "QuantitativeValue",
        "minValue": minSalary,
        "maxValue": maxSalary,
        "unitText": salaryPeriod
      }
    },
    "directApply": true
  };

  if (isRemote) {
    schemaObj["jobLocationType"] = "TELECOMMUTE";
    schemaObj["applicantLocationRequirements"] = {
      "@type": "Country",
      "name": country
    };
  }

  if (job.minimumExperience || job.experience) {
    const months = job.minimumExperience ? job.minimumExperience * 12 : job.experience?.toLowerCase().includes("senior") ? 60 : job.experience?.toLowerCase().includes("mid") ? 36 : 12;
    schemaObj["experienceRequirements"] = {
      "@type": "OccupationalExperienceRequirements",
      "monthsOfExperience": months
    };
  }

  if (job.qualification || job.education) {
    schemaObj["educationRequirements"] = {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": job.qualification || job.education
    };
  }

  if (job.skillsRequired && job.skillsRequired.length > 0) {
    schemaObj["skills"] = job.skillsRequired.join(", ");
  }

  if (job.responsibilities) {
    schemaObj["responsibilities"] = job.responsibilities;
  }

  return schemaObj;
}

/**
 * Generates and returns the script tag string containing the JobPosting JSON-LD.
 */
export function generateJobPostingSchemaScript(job: JobPosting): string {
  const schemaObj = generateJobPostingSchema(job);
  return `<script type="application/ld+json">${JSON.stringify(schemaObj, null, 2)}</script>`;
}

/**
 * React hook to dynamically inject and clean up JobPosting JSON-LD on a page.
 */
export function injectJobPostingSchema(job: JobPosting | null): void {
  if (!job) return;

  const schemaId = `job-schema-${job.id}`;
  let existingScript = document.getElementById(schemaId);
  if (!existingScript) {
    existingScript = document.createElement("script");
    existingScript.setAttribute("id", schemaId);
    existingScript.setAttribute("type", "application/ld+json");
    document.head.appendChild(existingScript);
  }

  const schemaObj = generateJobPostingSchema(job);
  existingScript.textContent = JSON.stringify(schemaObj, null, 2);
}
