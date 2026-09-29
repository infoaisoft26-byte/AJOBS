(() => {
  "use strict";

  if (window.__AIJOBS_PAYMENT_ANALYTICS__) return;
  window.__AIJOBS_PAYMENT_ANALYTICS__ = true;

  const nativeFetch = window.fetch.bind(window);
  const STORAGE_KEY = "aijobs_marketing_attribution_v1";

  const readAttribution = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const params = new URLSearchParams(window.location.search);
      return {
        source: params.get("utm_source") || saved.source || "",
        medium: params.get("utm_medium") || saved.medium || "",
        campaign: params.get("utm_campaign") || saved.campaign || "",
        content: params.get("utm_content") || saved.content || "",
        term: params.get("utm_term") || saved.term || "",
        gclid: params.get("gclid") || saved.gclid || "",
        fbclid: params.get("fbclid") || saved.fbclid || "",
        landingPage: saved.landingPage || `${window.location.pathname}${window.location.search}`,
        referrer: saved.referrer || document.referrer || ""
      };
    } catch {
      return {};
    }
  };

  const authHeaderFrom = (input, init) => {
    try {
      const fromInit = new Headers(init?.headers || {}).get("Authorization");
      if (fromInit) return fromInit;
      if (input instanceof Request) return input.headers.get("Authorization") || "";
    } catch {}
    return "";
  };

  const ga = (eventName, data = {}) => {
    try {
      window.dataLayer = window.dataLayer || [];
      const payload = { event_category: "payments", ...data };
      window.dataLayer.push({ event: eventName, aijobs_event: eventName, ...payload });
      if (typeof window.gtag === "function") window.gtag("event", eventName, payload);
    } catch {}
  };

  const record = async (eventName, authHeader, data = {}) => {
    if (!authHeader) return;
    try {
      await nativeFetch("/api/hire/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        keepalive: true,
        body: JSON.stringify({
          eventName,
          marketingAttribution: readAttribution(),
          ...data
        })
      });
    } catch {}
  };

  window.fetch = async (...args) => {
    const [input, init] = args;
    const response = await nativeFetch(...args);

    try {
      const rawUrl = typeof input === "string" ? input : input?.url || "";
      const path = new URL(rawUrl, window.location.origin).pathname;
      const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method !== "POST" || !response.ok) return response;

      const authHeader = authHeaderFrom(input, init);
      const data = await response.clone().json().catch(() => null);
      if (!data?.success) return response;

      if (path === "/api/payments/create-order") {
        const order = data.order || {};
        if (!data.alreadyPaid) {
          ga("upgrade_started", {
            plan_id: order.planId || order.planName,
            order_id: order.orderId,
            value: Number(order.totalAmount || order.amount || 0) || undefined,
            currency: order.currency || "INR"
          });
          void record("upgrade_started", authHeader, {
            planId: order.planId || "",
            orderId: order.orderId || "",
            dedupeKey: `upgrade_started:${order.orderId || order.planId || "payment"}`
          });
        }
      }

      if (path === "/api/payments/verify-return") {
        const order = data.order || {};
        const subscription = data.subscription || {};
        const paymentId = order.razorpayPaymentId || subscription.razorpayPaymentId || "";
        const orderId = order.orderId || subscription.orderId || "";
        ga("upgrade_completed", {
          plan_id: subscription.planId || order.planId || order.planName,
          order_id: orderId,
          payment_id: paymentId,
          value: Number(order.totalAmount || order.amount || 0) || undefined,
          currency: order.currency || "INR"
        });
        void record("upgrade_completed", authHeader, {
          planId: subscription.planId || "",
          orderId,
          paymentId,
          dedupeKey: `upgrade_completed:${orderId || paymentId || "payment"}`
        });
      }
    } catch {
      // Payment behavior must never depend on telemetry.
    }

    return response;
  };
})();