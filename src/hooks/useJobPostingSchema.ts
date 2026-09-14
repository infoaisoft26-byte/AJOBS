import { useEffect } from "react";
import { JobPosting } from "../types";
import { generateJobPostingSchema } from "../utils/schemaGenerator";
import { getPublicJobUrl } from "../config/site";

/**
 * A custom React hook to dynamically manage the SEO lifecycle for a Job Page.
 * It injects Google Jobs ready JSON-LD (JobPosting Schema), sets canonical URLs,
 * configures essential SEO Meta tags, and injects Open Graph elements.
 * Fully compliant with Google Search console requirements.
 */
export function useJobPostingSchema(job: JobPosting | null | undefined): void {
  useEffect(() => {
    if (!job) return;

    const originalTitle = document.title;
    const metaDescElement = document.querySelector('meta[name="description"]');
    const originalMetaDesc = metaDescElement ? metaDescElement.getAttribute("content") : "";

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    const originalCanonical = canonicalLink ? canonicalLink.getAttribute("href") : "";

    const cleanCompanyName = job.companyName || "AIJobs Partner";
    const newTitle = `${job.title} at ${cleanCompanyName} | AIJobs Recruitment Platform`;
    document.title = newTitle;

    const cleanDescriptionText = (job.description || "")
      .replace(/[\r\n]+/g, " ")
      .trim();
    const newMetaDesc = cleanDescriptionText.length > 155
      ? `${cleanDescriptionText.slice(0, 152)}...`
      : cleanDescriptionText || `Explore specifications, salary packages, experience levels, and skills required for the role of ${job.title} at ${cleanCompanyName}.`;

    if (metaDescElement) {
      metaDescElement.setAttribute("content", newMetaDesc);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.setAttribute("name", "description");
      newMeta.setAttribute("content", newMetaDesc);
      document.head.appendChild(newMeta);
    }

    const jobUrl = getPublicJobUrl(job);
    if (canonicalLink) {
      canonicalLink.setAttribute("href", jobUrl);
    } else {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      canonicalLink.setAttribute("href", jobUrl);
      document.head.appendChild(canonicalLink);
    }

    // Legacy Google Jobs/app links used /?jobId=... . Once the real job is
    // loaded, normalize the browser address to the canonical /jobs/<slug>
    // route without reloading the SPA. Preserve apply/UTM attribution params,
    // but remove the duplicate jobId query parameter.
    try {
      const current = new URL(window.location.href);
      if (current.pathname === "/" && current.searchParams.get("jobId")) {
        const canonical = new URL(jobUrl);
        current.searchParams.forEach((value, key) => {
          if (key !== "jobId") canonical.searchParams.append(key, value);
        });
        window.history.replaceState(
          window.history.state,
          "",
          `${canonical.pathname}${canonical.search}${canonical.hash}`
        );
      }
    } catch (error) {
      console.warn("Failed to normalize legacy job URL to canonical route:", error);
    }

    const ogTags = [
      { property: "og:title", content: newTitle },
      { property: "og:description", content: newMetaDesc },
      { property: "og:url", content: jobUrl },
      { property: "og:type", content: "website" }
    ];

    const originalOgVals: Record<string, string | null> = {};
    ogTags.forEach(tag => {
      let element = document.querySelector(`meta[property="${tag.property}"]`);
      if (element) {
        originalOgVals[tag.property] = element.getAttribute("content");
        element.setAttribute("content", tag.content);
      } else {
        originalOgVals[tag.property] = null;
        element = document.createElement("meta");
        element.setAttribute("property", tag.property);
        element.setAttribute("content", tag.content);
        document.head.appendChild(element);
      }
    });

    const schemaId = `job-schema-${job.id}`;
    let schemaScript = document.getElementById(schemaId) as HTMLScriptElement;
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.setAttribute("id", schemaId);
      schemaScript.setAttribute("type", "application/ld+json");
      document.head.appendChild(schemaScript);
    }

    try {
      const schemaObj = generateJobPostingSchema(job);
      schemaScript.textContent = JSON.stringify(schemaObj, null, 2);
    } catch (err) {
      console.error("Failed to generate dynamic JSON-LD schema:", err);
    }

    return () => {
      document.title = originalTitle;

      const currentMetaDesc = document.querySelector('meta[name="description"]');
      if (currentMetaDesc) {
        if (originalMetaDesc) {
          currentMetaDesc.setAttribute("content", originalMetaDesc);
        } else {
          currentMetaDesc.remove();
        }
      }

      const currentCanonical = document.querySelector('link[rel="canonical"]');
      if (currentCanonical) {
        if (originalCanonical) {
          currentCanonical.setAttribute("href", originalCanonical);
        } else {
          currentCanonical.remove();
        }
      }

      Object.entries(originalOgVals).forEach(([property, val]) => {
        const element = document.querySelector(`meta[property="${property}"]`);
        if (element) {
          if (val) {
            element.setAttribute("content", val);
          } else {
            element.remove();
          }
        }
      });

      const scriptToRemove = document.getElementById(schemaId);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [job]);
}
