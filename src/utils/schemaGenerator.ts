import { JobPosting } from "../types";

/**
 * Generates a valid Schema.org JobPosting JSON-LD schema object for search engines.
 * This structured data improves SEO, Google Jobs indexing, and candidate discoverability.
 */
export function generateJobPostingSchema(job: JobPosting): Record<string, any> {
  const publishDate = job.createdAt ? new Date(job.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  const expiryDate = job.expiryDate ? new Date(job.expiryDate).toISOString().split("T")[0] : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // default 60 days from now

  // Parse employment types to standard Schema.org values (e.g., FULL_TIME, PART_TIME, CONTRACTOR)
  let standardEmploymentType = "FULL_TIME";
  const rawType = (job.type || "").toUpperCase();
  if (rawType.includes("PART")) {
    standardEmploymentType = "PART_TIME";
  } else if (rawType.includes("CONTRACT") || rawType.includes("TEMP")) {
    standardEmploymentType = "CONTRACTOR";
  } else if (rawType.includes("INTERN")) {
    standardEmploymentType = "INTERN";
  } else if (rawType.includes("FREE")) {
    standardEmploymentType = "FREELANCE";
  }

  // Parse salary values to integers
  let salaryAmount = 1200000; // sensible fallback (INR per year)
  if (job.salary) {
    const numbersOnly = job.salary.replace(/[^0-9]/g, "");
    if (numbersOnly) {
      salaryAmount = parseInt(numbersOnly, 10);
      // If the salary represents a monthly figure (e.g. 80,000 or 1,50,000, usually less than 4,000,000), keep as annual if specified or convert
      if (salaryAmount < 500000 && (job.salary.toLowerCase().includes("month") || job.salary.toLowerCase().includes("/pm"))) {
        salaryAmount = salaryAmount * 12;
      }
    }
  }

  // Determine city / country country code
  let city = "Bangalore";
  let state = "Karnataka";
  const country = "IN";
  if (job.location) {
    const parts = job.location.split(",").map(p => p.trim());
    if (parts.length > 0) city = parts[0];
    if (parts.length > 1) state = parts[1];
  }

  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description || `Explore this exciting role of ${job.title} at ${job.companyName}.`,
    "datePosted": publishDate,
    "validThrough": expiryDate,
    "employmentType": standardEmploymentType,
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.companyName || "Enterprise Client Partner",
      "sameAs": `https://${(job.companyName || "company").toLowerCase().replace(/[^a-z0-9]/g, "")}.com`
    },
    "identifier": {
      "@type": "PropertyValue",
      "name": job.companyName || "AIJobs",
      "value": job.id || `job_${Date.now()}`
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": city,
        "addressRegion": state,
        "addressCountry": country
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "INR",
      "value": {
        "@type": "QuantitativeValue",
        "value": salaryAmount,
        "unitText": "YEAR"
      }
    },
    "skills": job.skillsRequired ? job.skillsRequired.join(", ") : undefined,
    "experienceRequirements": {
      "@type": "OccupationalExperienceRequirements",
      "monthsOfExperience": job.experience?.toLowerCase().includes("senior") ? 60 : job.experience?.toLowerCase().includes("mid") ? 36 : 12
    }
  };
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
  existingScript.textContent = JSON.stringify(schemaObj);
}
