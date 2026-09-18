/**
 * Attribution & Marketing Analytics Utility
 * Preserves Google Ads (GCLID) and UTM tracking parameters across candidate registration and session lifecycles.
 */

export interface AttributionData {
  gclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landingPage?: string;
  intendedJobId?: string;
  capturedAt?: string;
}

const STORAGE_KEY = "aijobs_attribution_data";
const INTENDED_JOB_KEY = "aijobs_intended_job_id";

/**
 * Parses query parameters from window.location and saves any attribution parameters to storage.
 * Call this on application mount or route change.
 */
export function captureAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get("gclid") || undefined;
    const utm_source = params.get("utm_source") || undefined;
    const utm_medium = params.get("utm_medium") || undefined;
    const utm_campaign = params.get("utm_campaign") || undefined;
    const utm_content = params.get("utm_content") || undefined;
    const utm_term = params.get("utm_term") || undefined;
    const jobIdParam = params.get("job") || params.get("jobId") || undefined;

    // Load existing stored attribution data
    let existing: AttributionData = {};
    const stored = window.sessionStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        existing = JSON.parse(stored);
      } catch {}
    }

    // Merge incoming parameters (do not overwrite existing with undefined)
    const updated: AttributionData = {
      ...existing,
      gclid: gclid || existing.gclid,
      utm_source: utm_source || existing.utm_source,
      utm_medium: utm_medium || existing.utm_medium,
      utm_campaign: utm_campaign || existing.utm_campaign,
      utm_content: utm_content || existing.utm_content,
      utm_term: utm_term || existing.utm_term,
      referrer: document.referrer || existing.referrer || "direct",
      landingPage: existing.landingPage || window.location.pathname,
      intendedJobId: jobIdParam || existing.intendedJobId,
      capturedAt: existing.capturedAt || new Date().toISOString(),
    };

    if (jobIdParam) {
      window.sessionStorage.setItem(INTENDED_JOB_KEY, jobIdParam);
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return updated;
  } catch (err) {
    console.debug("[Attribution] Error capturing attribution:", err);
    return {};
  }
}

/**
 * Retrieves the currently stored attribution parameters.
 */
export function getStoredAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return captureAttribution();
}

/**
 * Gets the current intended job ID if the user arrived via a job-specific campaign.
 */
export function getIntendedJobId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const paramJob = params.get("job") || params.get("jobId");
    if (paramJob) return paramJob;
    return window.sessionStorage.getItem(INTENDED_JOB_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Clears the intended job ID once the candidate has applied or confirmed.
 */
export function clearIntendedJobId(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(INTENDED_JOB_KEY);
  } catch {}
}
