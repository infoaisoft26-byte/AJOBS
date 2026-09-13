import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const ROLE_PATHS = new Set(["employer", "recruiter", "consultancy"]);
function clean(v: any, max = 300) { return String(v ?? "").trim().slice(0, max); }
function parseCookies(header: string) {
  return Object.fromEntries(header.split(";").map(v => v.trim()).filter(Boolean).map(v => { const i = v.indexOf("="); return i > 0 ? [v.slice(0, i), decodeURIComponent(v.slice(i + 1))] : [v, ""]; }));
}
function attribution(req: Request) {
  const q: any = req.query || {};
  return {
    source: clean(q.utm_source, 100), medium: clean(q.utm_medium, 100), campaign: clean(q.utm_campaign, 160),
    content: clean(q.utm_content, 160), term: clean(q.utm_term, 160), gclid: clean(q.gclid, 256), fbclid: clean(q.fbclid, 256),
    referrer: clean(req.headers.referer || "", 500), landingPage: clean(req.originalUrl || req.url || "/hire", 500), firstVisitAt: new Date().toISOString()
  };
}
async function writeEvent(visitorId: string, eventName: string, role: string, a: any) {
  const day = new Date().toISOString().slice(0, 10);
  const id = `evt_${crypto.createHash("sha256").update(`${eventName}:${visitorId}:${role}:${a.landingPage}:${day}`).digest("hex").slice(0, 32)}`;
  const db = getFirestoreDb();
  const ref = db.collection("marketingEvents").doc(id);
  const snap = await ref.get();
  if (!snap.exists) await ref.set({ id, eventName, visitorId, uid: null, role: role || null, marketingAttribution: a, ...a, createdAt: new Date().toISOString() });
}

export async function handleHiringLandingRoute(req: Request, res: Response): Promise<boolean> {
  const pathname = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (!(pathname === "/hire" || pathname.startsWith("/hire/")) || req.method !== "GET") return false;
  const role = pathname.split("/")[2] || "";
  if (role && !ROLE_PATHS.has(role)) { res.status(404).send("Hiring role not found."); return true; }
  const cookies = parseCookies(String(req.headers.cookie || ""));
  const visitorId = /^[a-f0-9]{32}$/.test(cookies._aijv || "") ? cookies._aijv : crypto.randomBytes(16).toString("hex");
  if (!cookies._aijv) res.setHeader("Set-Cookie", `_aijv=${visitorId}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`);
  const a = attribution(req);
  writeEvent(visitorId, "hire_landing_view", role, a).catch(err => console.warn("[HiringLanding] event log failed", err?.message || err));
  if (role) writeEvent(visitorId, "role_selected", role, a).catch(err => console.warn("[HiringLanding] role event failed", err?.message || err));
  const file = path.join(process.cwd(), "public", "hire.html");
  if (!fs.existsSync(file)) { res.status(500).send("Hiring page unavailable."); return true; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
  res.status(200).send(fs.readFileSync(file, "utf-8"));
  return true;
}
