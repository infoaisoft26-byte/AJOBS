import {
  Facebook,
  Instagram,
  Type
} from "lucide-react";
/**
 * Lead Source & UTM Parameter Tracking Utility
 */

export interface LeadAttribution {
  source: string;
  medium: string;
  campaign: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referralCode?: string;
  landingPage: string;
  firstVisitAt: string;
}

const ATTRIBUTION_STORAGE_KEY = "aijobs_lead_attribution";

/**
 * Initializes lead attribution tracking by parsing URL parameters and storing first visit data.
 */
export function initLeadAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const existing = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const nowIso = new Date().toISOString();

    const urlParams = new URLSearchParams(window.location.search);
    const utm_source = urlParams.get("utm_source") || undefined;
    const utm_medium = urlParams.get("utm_medium") || undefined;
    const utm_campaign = urlParams.get("utm_campaign") || undefined;
    const utm_content = urlParams.get("utm_content") || undefined;
    const referralCode = urlParams.get("ref") || urlParams.get("referralCode") || undefined;

    // Determine initial source
    let source = "Direct";
    const referrer = document.referrer ? document.referrer.toLowerCase() : "";

    if (utm_source) {
      source = utm_source;
    } else if (referrer.includes("google.")) {
      source = "Google Ads / Organic";
    } else if (referrer.includes("facebook.") || referrer.includes("fb.com")) {
      source = "Facebook";
    } else if (referrer.includes("instagram.")) {
      source = "Instagram";
    } else if (referrer.includes("whatsapp.")) {
      source = "WhatsApp";
    } else if (referralCode) {
      source = "Referral";
    }

    const campaign = utm_campaign || "Organic Campaign";
    const medium = utm_medium || (source === "Direct" ? "direct" : "referral");

    if (!existing) {
      const data: LeadAttribution = {
        source,
        medium,
        campaign,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        referralCode,
        landingPage: window.location.pathname,
        firstVisitAt: nowIso
      };
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data));
    } else if (utm_source || utm_campaign || referralCode) {
      // Update campaign if explicit UTM present
      const parsed: LeadAttribution = JSON.parse(existing);
      const updated: LeadAttribution = {
        ...parsed,
        source: utm_source || parsed.source,
        medium: utm_medium || parsed.medium,
        campaign: utm_campaign || parsed.campaign,
        utm_source: utm_source || parsed.utm_source,
        utm_medium: utm_medium || parsed.utm_medium,
        utm_campaign: utm_campaign || parsed.utm_campaign,
        utm_content: utm_content || parsed.utm_content,
        referralCode: referralCode || parsed.referralCode
      };
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error("Failed to initialize lead attribution:", err);
  }
}

/**
 * Retrieves the stored lead attribution metadata for registration/lead capture.
 */
export function getCapturedLeadAttribution(): LeadAttribution {
  const fallback: LeadAttribution = {
    source: "Direct",
    medium: "organic",
    campaign: "Default Campaign",
    landingPage: typeof window !== "undefined" ? window.location.pathname : "/",
    firstVisitAt: new Date().toISOString()
  };

  if (typeof window === "undefined") return fallback;

  try {
    const stored = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}

  return fallback;
}

/**
 * Captures lead in backend API during registration or contact submission.
 */
export async function trackLeadSubmission(payload: {
  userId?: string;
  role: string;
  fullName: string;
  email: string;
  mobile?: string;
  city?: string;
  assignedConsultancyId?: string;
  assignedRecruiterId?: string;
}): Promise<void> {
  try {
    const attribution = getCapturedLeadAttribution();
    await fetch("/api/leads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...attribution,
        ...payload
      })
    });
  } catch (err) {
    console.warn("Failed to record lead in CRM:", err);
  }
}
