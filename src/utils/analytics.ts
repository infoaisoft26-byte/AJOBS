/**
 * Google Analytics 4 Telemetry Utilities (Measurement ID: G-D5W7WRJS2B)
 * Safely wraps GA4 events with graceful fallback when scripts are absent or blocked.
 * Strict Privacy: Never sends passwords, OTPs, resume contents, phone numbers,
 * email addresses, or personally identifiable information (PII).
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = "G-D5W7WRJS2B";

// Lazy initializer / verify for gtag
export function initGA() {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  // Ensure script is loaded if not already present in HTML
  if (!document.querySelector(`script[src*="${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false, // Managed manually per SPA route change
    anonymize_ip: true,
    cookie_flags: "SameSite=None;Secure"
  });

  console.log(`[Telemetry Engine] Initialized Google Analytics 4 (${GA_MEASUREMENT_ID})`);
}

// Track SPA pageviews
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    try {
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_title: pageTitle || document.title,
        page_location: window.location.href
      });
    } catch (e) {
      console.debug("[Analytics] Page view note:", e);
    }
  }
}

// Generic safe event sender
export function sendGAEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    try {
      // Sanitize: ensure no accidental PII keys
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(params)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("otp") ||
          lowerKey.includes("phone") ||
          lowerKey.includes("email") ||
          lowerKey.includes("resume_text") ||
          lowerKey.includes("token")
        ) {
          continue; // Skip PII
        }
        sanitized[key] = val;
      }

      window.gtag("event", eventName, sanitized);
      console.debug(`[Analytics] Tracked event: ${eventName}`, sanitized);
    } catch (e) {
      console.debug("[Analytics] Event tracking notice:", e);
    }
  }
}

// Specific AIJobs Core Events
export function trackCandidateRegistrationStarted(method: string = "email") {
  sendGAEvent("candidate_registration_started", { method });
}

export function trackCandidateRegistrationCompleted(method: string = "email") {
  sendGAEvent("candidate_registration_completed", { method });
}

export function trackLogin(method: string = "email", role: string = "candidate") {
  sendGAEvent("login", { method, user_role: role });
}

export function trackResumeUploaded(fileType?: string, source: string = "onboarding") {
  sendGAEvent("resume_uploaded", { file_type: fileType || "document", upload_source: source });
}

export function trackProfileCompleted(role: string = "candidate") {
  sendGAEvent("profile_completed", { user_role: role });
}

export function trackJobView(jobId: string, jobTitle?: string, companyName?: string) {
  sendGAEvent("job_view", { job_id: jobId, job_title: jobTitle, company: companyName });
}

export function trackJobSearch(query: string, location?: string, resultsCount?: number) {
  sendGAEvent("job_search", { search_term: query, location_filter: location || "all", results_count: resultsCount });
}

export function trackJobApplyStarted(jobId: string, jobTitle?: string) {
  sendGAEvent("job_apply_started", { job_id: jobId, job_title: jobTitle });
}

export function trackJobApplicationSubmitted(jobId: string, jobTitle?: string, companyName?: string) {
  sendGAEvent("job_application_submitted", { job_id: jobId, job_title: jobTitle, company: companyName });
}

export function trackRecruiterRegistration(companyName?: string) {
  sendGAEvent("recruiter_registration", { entity: companyName || "employer" });
}

export function trackConsultancyRegistration(agencyName?: string) {
  sendGAEvent("consultancy_registration", { entity: agencyName || "consultancy" });
}

export function trackContactFormSubmitted(subject?: string) {
  sendGAEvent("contact_form_submitted", { subject: subject || "general" });
}

export function trackAIAssistantOpened(context: string = "assistant") {
  sendGAEvent("ai_assistant_opened", { context });
}

// Legacy helper compatibility
export function trackInteraction(action: string, category: string, label?: string, value?: number) {
  sendGAEvent(action, { event_category: category, event_label: label, value });
}
