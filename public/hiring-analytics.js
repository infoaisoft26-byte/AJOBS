(() => {
  "use strict";

  const MEASUREMENT_ID = "G-D5W7WRJS2B";
  const STORAGE_KEY = "aijobs_marketing_attribution_v1";
  const VISITOR_KEY = "aijobs_analytics_visitor_v1";
  const PUBLIC_EVENT_ENDPOINT = "/api/hire/event";

  const clean = (value, max = 300) => String(value ?? "").trim().slice(0, max);

  function currentRole() {
    const match = window.location.pathname.match(/^\/hire\/(employer|recruiter|consultancy)(?:\/|$)/i);
    return match ? match[1].toLowerCase() : "";
  }

  function visitorId() {
    try {
      let id = localStorage.getItem(VISITOR_KEY) || "";
      if (!/^[a-z0-9_-]{12,80}$/i.test(id)) {
        const random = globalThis.crypto?.randomUUID?.().replace(/-/g, "") ||
          `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
        id = `web_${random}`.slice(0, 80);
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch {
      return `web_${Date.now().toString(36)}`;
    }
  }

  function attribution() {
    const params = new URLSearchParams(window.location.search);
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      saved = {};
    }

    const next = {
      source: clean(params.get("utm_source") || saved.source, 100),
      medium: clean(params.get("utm_medium") || saved.medium, 100),
      campaign: clean(params.get("utm_campaign") || saved.campaign, 160),
      content: clean(params.get("utm_content") || saved.content, 160),
      term: clean(params.get("utm_term") || saved.term, 160),
      gclid: clean(params.get("gclid") || saved.gclid, 256),
      fbclid: clean(params.get("fbclid") || saved.fbclid, 256),
      landingPage: clean(saved.landingPage || `${window.location.pathname}${window.location.search}`, 500),
      referrer: clean(saved.referrer || document.referrer, 500),
      firstVisitAt: clean(saved.firstVisitAt || new Date().toISOString(), 64)
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Analytics must never block the hiring flow.
    }
    return next;
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    if (!document.querySelector(`script[data-aijobs-ga4="${MEASUREMENT_ID}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
      script.dataset.aijobsGa4 = MEASUREMENT_ID;
      document.head.appendChild(script);
    }

    if (!window.__AIJOBS_GA4_CONFIGURED__) {
      window.__AIJOBS_GA4_CONFIGURED__ = true;
      window.gtag("js", new Date());
      window.gtag("config", MEASUREMENT_ID, {
        send_page_view: false,
        anonymize_ip: true
      });
    }
  }

  function track(eventName, params = {}) {
    try {
      ensureGtag();
      const role = clean(params.role || currentRole(), 30);
      const payload = {
        event_category: "hiring_funnel",
        role: role || undefined,
        page_path: window.location.pathname,
        ...params
      };
      window.dataLayer.push({ event: eventName, aijobs_event: eventName, ...payload });
      window.gtag("event", eventName, payload);
    } catch {
      // Never make analytics a dependency of the product experience.
    }
  }

  async function recordPublicEvent(eventName, extra = {}) {
    try {
      await fetch(PUBLIC_EVENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          eventName,
          visitorId: visitorId(),
          role: currentRole(),
          marketingAttribution: attribution(),
          ...extra
        })
      });
    } catch {
      // Firestore telemetry is best-effort and must not affect conversion actions.
    }
  }

  function trackInitialPage() {
    const role = currentRole();
    track("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      role: role || undefined
    });
    track("hire_landing_view", { role: role || undefined });
    if (role) track("role_selected", { role });
  }

  function bindDomEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("a,button") : null;
      if (!target) return;

      if (target instanceof HTMLAnchorElement) {
        const href = target.getAttribute("href") || "";
        const roleMatch = href.match(/^\/hire\/(employer|recruiter|consultancy)(?:[/?#]|$)/i);
        if (roleMatch) {
          track("role_selected", { role: roleMatch[1].toLowerCase(), interaction: "cta_click" });
        }
        if (/pricing|plans|subscription/i.test(href)) {
          track("pricing_viewed", { interaction: "cta_click" });
          void recordPublicEvent("pricing_viewed", { dedupeKey: `pricing_viewed:${visitorId()}:${new Date().toISOString().slice(0, 10)}` });
        }
      }
    }, true);

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", () => {
        track("registration_started");
        void recordPublicEvent("registration_started", {
          dedupeKey: `registration_started:${visitorId()}:${currentRole() || "hiring"}`
        });
      });
    }

    const jobForm = document.getElementById("jobForm");
    if (jobForm) {
      let started = false;
      jobForm.addEventListener("input", () => {
        if (started) return;
        started = true;
        track("job_creation_started");
      }, { passive: true });
    }
  }

  function observeSuccessfulApiCalls() {
    if (window.__AIJOBS_HIRING_FETCH_WRAPPED__) return;
    window.__AIJOBS_HIRING_FETCH_WRAPPED__ = true;
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      try {
        const input = args[0];
        const init = args[1] || {};
        const url = typeof input === "string" ? input : input?.url || "";
        const method = clean(init.method || (typeof input !== "string" && input?.method) || "GET", 10).toUpperCase();
        const path = new URL(url, window.location.origin).pathname;

        if (response.ok && method === "POST") {
          if (path === "/api/hire/bootstrap") track("registration_completed");
          if (path === "/api/hire/company") track("company_profile_completed");
          if (path === "/api/hire/job") track("job_submitted");
        }
      } catch {
        // The original fetch result is always returned unchanged.
      }
      return response;
    };
  }

  ensureGtag();
  observeSuccessfulApiCalls();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      trackInitialPage();
      bindDomEvents();
    }, { once: true });
  } else {
    trackInitialPage();
    bindDomEvents();
  }
})();
