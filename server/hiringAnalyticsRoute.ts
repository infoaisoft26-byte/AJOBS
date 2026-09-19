import crypto from "crypto";
import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const PUBLIC_EVENTS = new Set([
  "hire_landing_view",
  "role_selected",
  "registration_started",
  "pricing_viewed",
  "candidate_registration_started"
]);

const ALL_EVENTS = new Set([
  "hire_landing_view",
  "role_selected",
  "registration_started",
  "registration_completed",
  "company_profile_completed",
  "job_creation_started",
  "job_submitted",
  "job_approved",
  "job_rejected",
  "first_job_credit_used",
  "pricing_viewed",
  "upgrade_started",
  "upgrade_completed",
  "candidate_registration_started",
  "candidate_registration_completed",
  "candidate_profile_completed",
  "candidate_resume_uploaded",
  "candidate_application_submitted"
]);

function clean(v: any, max = 300) {
  return String(v ?? "").trim().slice(0, max);
}

function normalizeRole(v: any) {
  return clean(v, 30).toLowerCase().replace(/[\s-]+/g, "_");
}

function toIso(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v?.toDate === "function") {
    try { return v.toDate().toISOString(); } catch { return ""; }
  }
  try {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  } catch {
    return "";
  }
}

async function getOptionalUser(req: Request) {
  const h = String(req.headers.authorization || "");
  if (!h.startsWith("Bearer ")) return null;
  try {
    return await getFirebaseAuth().verifyIdToken(h.slice(7), true);
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request) {
  const decoded = await getOptionalUser(req);
  if (!decoded) {
    throw Object.assign(new Error("Admin authentication required."), { status: 401 });
  }
  const db = getFirestoreDb();
  const [u, a] = await Promise.all([
    db.collection("users").doc(decoded.uid).get(),
    db.collection("admins").doc(decoded.uid).get()
  ]);
  const role = normalizeRole(u.data()?.role || decoded.role);
  if (!(role === "admin" || role === "superadmin" || role === "super_admin" || a.exists)) {
    throw Object.assign(new Error("Admin access required."), { status: 403 });
  }
  return { decoded, db };
}

function attr(body: any) {
  const a = body?.marketingAttribution || body || {};
  return {
    source: clean(a.source || a.utm_source, 100),
    medium: clean(a.medium || a.utm_medium, 100),
    campaign: clean(a.campaign || a.utm_campaign, 160),
    content: clean(a.content || a.utm_content, 160),
    term: clean(a.term || a.utm_term, 160),
    gclid: clean(a.gclid, 256),
    fbclid: clean(a.fbclid, 256),
    landingPage: clean(a.landingPage, 500),
    referrer: clean(a.referrer, 500)
  };
}

function campaignKey(a: any) {
  return [
    a.source || a.utm_source || (a.gclid ? "google_ads" : "direct"),
    a.medium || a.utm_medium || (a.gclid ? "cpc" : "none"),
    a.campaign || a.utm_campaign || "none",
    a.content || a.utm_content || "none"
  ].join(" | ");
}

function ensureCampaign(store: Record<string, any>, a: any) {
  const key = campaignKey(a);
  if (!store[key]) {
    store[key] = {
      source: a.source || a.utm_source || (a.gclid ? "google_ads" : "direct"),
      medium: a.medium || a.utm_medium || (a.gclid ? "cpc" : "none"),
      campaign: a.campaign || a.utm_campaign || "none",
      content: a.content || a.utm_content || "none",
      landingViews: 0,
      registrationStarted: 0,
      registrations: 0,
      candidateRegistrationStarted: 0,
      candidateRegistrations: 0,
      candidateProfilesCompleted: 0,
      resumesUploaded: 0,
      applicationsSubmitted: 0,
      firstJobsSubmitted: 0,
      jobsApproved: 0,
      jobsRejected: 0,
      paidConversions: 0
    };
  }
  return store[key];
}

export async function handleHiringAnalyticsRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/hire/event" && path !== "/api/hire/admin/analytics-v2") return false;

  try {
    if (path === "/api/hire/event") {
      if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method not allowed." });
        return true;
      }

      const eventName = clean(req.body?.eventName, 80);
      if (!ALL_EVENTS.has(eventName)) {
        res.status(400).json({ success: false, error: "Unsupported event." });
        return true;
      }

      const decoded = await getOptionalUser(req);
      if (!decoded && !PUBLIC_EVENTS.has(eventName)) {
        res.status(401).json({ success: false, error: "Authentication required for this event." });
        return true;
      }

      const visitorId = clean(req.body?.visitorId, 120) || decoded?.uid || "anonymous";
      const attribution = attr(req.body);
      const day = new Date().toISOString().slice(0, 10);
      const oncePerDay = ["hire_landing_view", "candidate_registration_started"].includes(eventName);
      const dedupeSeed = clean(req.body?.dedupeKey, 300) ||
        `${eventName}:${decoded?.uid || visitorId}:${attribution.landingPage || "/"}:${oncePerDay ? day : "once"}`;
      const id = `evt_${crypto.createHash("sha256").update(dedupeSeed).digest("hex").slice(0, 32)}`;

      const db = getFirestoreDb();
      const ref = db.collection("marketingEvents").doc(id);
      const snap = await ref.get();

      if (!snap.exists) {
        await ref.set({
          id,
          eventName,
          uid: decoded?.uid || null,
          visitorId,
          role: normalizeRole(req.body?.role) || (eventName.startsWith("candidate_") ? "candidate" : ""),
          marketingAttribution: attribution,
          ...attribution,
          createdAt: new Date().toISOString()
        });
      }

      res.json({ success: true, deduped: snap.exists });
      return true;
    }

    if (path === "/api/hire/admin/analytics-v2") {
      if (req.method !== "GET") {
        res.status(405).json({ success: false, error: "Method not allowed." });
        return true;
      }

      const { db } = await requireAdmin(req);
      const [eventsSnap, usersSnap, jobsSnap, leadsSnap, applicationsSnap] = await Promise.all([
        db.collection("marketingEvents").get(),
        db.collection("users").get(),
        db.collection("jobs").get(),
        db.collection("leads").get().catch(() => null),
        db.collection("applications").get().catch(() => null)
      ]);

      const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
      const hiringUsers = users.filter(u => ["employer", "recruiter", "consultancy"].includes(normalizeRole(u.role)));
      const candidates = users.filter(u => normalizeRole(u.role) === "candidate");
      const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const leads = leadsSnap ? leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)) : [];
      const applications = applicationsSnap ? applicationsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)) : [];

      const visitors = new Set(events.filter(e => e.eventName === "hire_landing_view").map(e => e.visitorId || e.id));
      const paidConversions = events.filter(e => e.eventName === "upgrade_completed").length;
      const byCampaign: Record<string, any> = {};

      for (const e of events) {
        const a = e.marketingAttribution || e;
        const row = ensureCampaign(byCampaign, a);
        if (e.eventName === "hire_landing_view") row.landingViews++;
        if (e.eventName === "registration_started") row.registrationStarted++;
        if (e.eventName === "registration_completed") row.registrations++;
        if (e.eventName === "candidate_registration_started") row.candidateRegistrationStarted++;
        if (e.eventName === "candidate_registration_completed") row.candidateRegistrations++;
        if (e.eventName === "candidate_profile_completed") row.candidateProfilesCompleted++;
        if (e.eventName === "candidate_resume_uploaded") row.resumesUploaded++;
        if (e.eventName === "candidate_application_submitted") row.applicationsSubmitted++;
        if (e.eventName === "job_submitted") row.firstJobsSubmitted++;
        if (e.eventName === "job_approved") row.jobsApproved++;
        if (e.eventName === "job_rejected") row.jobsRejected++;
        if (e.eventName === "upgrade_completed") row.paidConversions++;
      }

      // Candidate user records are the source of truth for registrations. Merge them into
      // campaign rows when event telemetry was blocked or the user completed registration
      // before the event endpoint became available.
      for (const c of candidates) {
        const a = c.marketingAttribution || c;
        const row = ensureCampaign(byCampaign, a);
        row.candidateRegistrationsFromUsers = (row.candidateRegistrationsFromUsers || 0) + 1;
        if (c.resumeUrl || c.resumeURL || c.resumeFileName) {
          row.resumesFromUsers = (row.resumesFromUsers || 0) + 1;
        }
      }

      for (const r of Object.values(byCampaign) as any[]) {
        r.candidateRegistrations = Math.max(r.candidateRegistrations, r.candidateRegistrationsFromUsers || 0);
        r.resumesUploaded = Math.max(r.resumesUploaded, r.resumesFromUsers || 0);
        r.visitorToRegistrationRate = r.landingViews
          ? Number(((r.registrations / r.landingViews) * 100).toFixed(1))
          : 0;
        r.candidateStartToRegistrationRate = r.candidateRegistrationStarted
          ? Number(((r.candidateRegistrations / r.candidateRegistrationStarted) * 100).toFixed(1))
          : 0;
        r.registrationToApprovedRate = r.registrations
          ? Number(((r.jobsApproved / r.registrations) * 100).toFixed(1))
          : 0;
      }

      const today = new Date().toISOString().slice(0, 10);
      const googleCandidates = candidates.filter(c =>
        Boolean(c.gclid) ||
        String(c.acquisitionSource || "").toLowerCase() === "google_ads" ||
        String(c.utm_source || "").toLowerCase() === "google"
      );
      const candidatesToday = candidates.filter(c => toIso(c.createdAt).startsWith(today));
      const googleCandidatesToday = googleCandidates.filter(c => toIso(c.createdAt).startsWith(today));
      const candidatesWithResume = candidates.filter(c => c.resumeUrl || c.resumeURL || c.resumeFileName);
      const leadStatusCounts = leads.reduce((acc: Record<string, number>, lead: any) => {
        const s = normalizeRole(lead.status || lead.currentStatus || "new") || "new";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        totals: {
          landingPageVisitors: visitors.size,
          registrations: hiringUsers.length,
          employerRegistrations: hiringUsers.filter(u => normalizeRole(u.role) === "employer").length,
          recruiterRegistrations: hiringUsers.filter(u => normalizeRole(u.role) === "recruiter").length,
          consultancyRegistrations: hiringUsers.filter(u => normalizeRole(u.role) === "consultancy").length,
          recruiterLeads: leads.length,
          newRecruiterLeads: leadStatusCounts.new || 0,
          interestedRecruiterLeads: leadStatusCounts.interested || 0,
          convertedRecruiterLeads: leadStatusCounts.converted || 0,
          candidateRegistrations: candidates.length,
          candidateRegistrationsToday: candidatesToday.length,
          googleCandidateRegistrations: googleCandidates.length,
          googleCandidateRegistrationsToday: googleCandidatesToday.length,
          candidateResumesUploaded: candidatesWithResume.length,
          candidateApplications: applications.length,
          firstJobsSubmitted: events.filter(e => e.eventName === "job_submitted").length,
          jobsApproved: jobs.filter(j => ["approved", "live", "published"].includes(normalizeRole(j.status))).length,
          jobsRejected: jobs.filter(j => normalizeRole(j.status) === "rejected").length,
          paidConversions
        },
        leadStatusCounts,
        byCampaign: Object.values(byCampaign).sort((a: any, b: any) =>
          (b.candidateRegistrations + b.registrations) - (a.candidateRegistrations + a.registrations)
        ),
        recentGoogleCandidates: googleCandidates
          .sort((a, b) => new Date(toIso(b.createdAt) || 0).getTime() - new Date(toIso(a.createdAt) || 0).getTime())
          .slice(0, 20)
          .map(c => ({
            uid: c.uid,
            name: c.name || c.fullName || "Candidate",
            email: c.email || "",
            city: c.currentCity || c.location || "",
            campaign: c.utm_campaign || "",
            term: c.utm_term || "",
            gclid: c.gclid || "",
            resumeUploaded: Boolean(c.resumeUrl || c.resumeURL || c.resumeFileName),
            createdAt: toIso(c.createdAt)
          }))
      });
      return true;
    }

    return false;
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({
      success: false,
      error: error?.message || "Analytics request failed."
    });
    return true;
  }
}
