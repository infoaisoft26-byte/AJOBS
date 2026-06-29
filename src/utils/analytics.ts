/**
 * Google Analytics 4 Telemetry Utilities
 * Safely wraps analytics events with graceful fallback when scripts are absent or blocked.
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = "G-AIJOBS2026"; // Production placeholder

// Lazy initializer for gtag
export function initGA() {
  if (typeof window === "undefined" || window.gtag) return;

  // Create script tag
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: true,
    anonymize_ip: true,
    cookie_flags: "SameSite=None;Secure"
  });

  console.log(`[Telemetry Engine] Initialized Google Analytics 4 for ${GA_MEASUREMENT_ID}`);
}

// Track pageviews
export function trackPageView(pagePath: string, pageTitle: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
  console.log(`[Telemetry View] path: "${pagePath}", title: "${pageTitle}"`);
}

// Track custom interactions
export function trackInteraction(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
  console.log(`[Telemetry Event] ${category} -> ${action} [${label || ""}]`);
}
