import { auth } from "../firebase";

const STORAGE_KEY = "aijobs_marketing_attribution_v1";

function readAttribution() {
  if (typeof window === "undefined") return {};
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
}

function emitGa4(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: eventName, aijobs_event: eventName, ...params });
    if (typeof w.gtag === "function") w.gtag("event", eventName, params);
  } catch {
    // Analytics must never block payment.
  }
}

async function recordAuthenticatedEvent(eventName: "upgrade_started" | "upgrade_completed", data: Record<string, unknown> = {}) {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch("/api/hire/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        marketingAttribution: readAttribution(),
        ...data
      })
    });
  } catch {
    // Conversion telemetry is best-effort.
  }
}

export function trackUpgradeStarted(params: { role?: string; planId?: string; orderId?: string } = {}) {
  emitGa4("upgrade_started", {
    event_category: "payments",
    role: params.role,
    plan_id: params.planId,
    order_id: params.orderId
  });
  void recordAuthenticatedEvent("upgrade_started", {
    role: params.role,
    planId: params.planId,
    orderId: params.orderId,
    dedupeKey: `upgrade_started:${auth.currentUser?.uid || "user"}:${params.orderId || params.planId || "plan"}`
  });
}

export function trackUpgradeCompleted(params: { role?: string; planId?: string; orderId?: string; paymentId?: string; value?: number; currency?: string } = {}) {
  emitGa4("upgrade_completed", {
    event_category: "payments",
    role: params.role,
    plan_id: params.planId,
    order_id: params.orderId,
    payment_id: params.paymentId,
    value: params.value,
    currency: params.currency || "INR"
  });
  void recordAuthenticatedEvent("upgrade_completed", {
    role: params.role,
    planId: params.planId,
    orderId: params.orderId,
    paymentId: params.paymentId,
    value: params.value,
    currency: params.currency || "INR",
    dedupeKey: `upgrade_completed:${auth.currentUser?.uid || "user"}:${params.orderId || params.paymentId || "payment"}`
  });
}
