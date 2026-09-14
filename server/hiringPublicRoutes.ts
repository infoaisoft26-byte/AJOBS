import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const SITE_URL = "https://aijobs1.in";
const BLOCKED = new Set(["draft", "pending_review", "pending_admin_verification", "changes_requested", "rejected", "expired", "closed"]);
function esc(v: any) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
function status(v: any) { return String(v || "").trim().toLowerCase().replace(/[\s-]+/g,"_"); }
function isLive(job: any) {
  if (status(job.status) !== "approved" || job.approved === false) return false;
  const expiry = job.validThrough || job.expiryDate || job.applyDeadline;
  if (expiry) {
    const t = new Date(expiry).getTime();
    if (Number.isFinite(t) && t < Date.now()) return false;
  }
  return !BLOCKED.has(status(job.status));
}
function googleEmploymentType(v: any) {
  const s = String(v || "Full Time").toUpperCase().replace(/[\s-]+/g,"_");
  return ["FULL_TIME","PART_TIME","CONTRACT","INTERN","TEMPORARY","VOLUNTEER","PER_DIEM","OTHER"].includes(s) ? s : (s === "INTERNSHIP" ? "INTERN" : "FULL_TIME");
}
function publicUrl(job: any, id: string) {
  if (job.canonicalUrl && String(job.canonicalUrl).startsWith(SITE_URL)) return job.canonicalUrl;
  const slug = job.slug || `${String(job.title || "job").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-${id}`;
  return `${SITE_URL}/jobs/${slug}`;
}

export async function handleHiringPublicRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/,"") || "/";
  if (!(path === "/sitemap.xml" || path === "/job-sitemap.xml" || path.startsWith("/jobs/"))) return false;
  const db = getFirestoreDb();

  if ((path === "/sitemap.xml" || path === "/job-sitemap.xml") && req.method === "GET") {
    const snap = await db.collection("jobs").get();
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(isLive);
    const staticUrls = path === "/job-sitemap.xml" ? [] : ["/", "/jobs", "/hire", "/hire/employer", "/hire/recruiter", "/hire/consultancy"];
    const nodes = [
      ...staticUrls.map(p => `<url><loc>${SITE_URL}${p}</loc><changefreq>daily</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`),
      ...jobs.map(j => `<url><loc>${esc(publicUrl(j,j.id))}</loc><lastmod>${esc(String(j.updatedAt || j.approvedAt || j.createdAt || new Date().toISOString()).slice(0,10))}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`)
    ];
    res.setHeader("Content-Type","application/xml; charset=utf-8");
    res.setHeader("Cache-Control","public, max-age=300, s-maxage=300");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes.join("")}</urlset>`);
    return true;
  }

  if (path.startsWith("/jobs/") && req.method === "GET") {
    const slug = decodeURIComponent(path.slice("/jobs/".length));
    let jobSnap: any = null;
    const q = await db.collection("jobs").where("slug","==",slug).limit(1).get().catch(()=>null);
    if (q && !q.empty) jobSnap = q.docs[0];
    if (!jobSnap) {
      const match = slug.match(/-(job_[a-z0-9]+)$/i);
      if (match) {
        const direct = await db.collection("jobs").doc(match[1]).get();
        if (direct.exists) jobSnap = direct;
      }
    }
    if (!jobSnap) { res.status(404).send("Job not found"); return true; }
    const job: any = { id: jobSnap.id, ...jobSnap.data() };
    if (!isLive(job)) { res.status(404).send("This job is not publicly available."); return true; }
    const canonical = publicUrl(job, job.id);
    const expiry = job.validThrough || job.expiryDate || job.applyDeadline || new Date(Date.now()+30*86400000).toISOString();
    const remote = String(job.workMode || "").toLowerCase() === "remote";
    const schema: any = {
      "@context":"https://schema.org/","@type":"JobPosting",
      title: job.title,
      description: job.description || job.jobDescription || "",
      datePosted: String(job.datePosted || job.approvedAt || job.createdAt || new Date().toISOString()).slice(0,10),
      validThrough: expiry,
      employmentType: googleEmploymentType(job.employmentType || job.type),
      identifier:{"@type":"PropertyValue",name:job.companyName || "AIJOBS Hiring Partner",value:job.id},
      hiringOrganization:{"@type":"Organization",name:job.hiringOrganizationName || job.companyName || "AIJOBS Hiring Partner",sameAs:job.companyWebsite || job.website || undefined,logo:job.companyLogo || undefined},
      directApply:true
    };
    if (remote) {
      schema.jobLocationType = "TELECOMMUTE";
      schema.applicantLocationRequirements = {"@type":"Country",name:job.country || "India"};
    } else {
      schema.jobLocation = {"@type":"Place",address:{"@type":"PostalAddress",addressLocality:job.city || job.location || "",addressRegion:job.state || "",addressCountry:job.country || "IN"}};
    }
    if (Number(job.minimumSalary) || Number(job.maximumSalary)) schema.baseSalary={"@type":"MonetaryAmount",currency:job.salaryCurrency || "INR",value:{"@type":"QuantitativeValue",minValue:Number(job.minimumSalary)||undefined,maxValue:Number(job.maximumSalary)||undefined,unitText:job.salaryPeriod || "YEAR"}};
    const skills = Array.isArray(job.skillsRequired || job.requiredSkills) ? (job.skillsRequired || job.requiredSkills) : [];
    const applyUrl = `/?jobId=${encodeURIComponent(job.id)}`;
    const consultancyName = String(job.consultancyName || job.consultancy || "").trim();
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.setHeader("Cache-Control","public, max-age=120, s-maxage=300");
    res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(job.title)} | ${esc(job.companyName)} | AIJOBS</title><meta name="description" content="${esc(String(job.description||job.jobDescription||"").replace(/<[^>]+>/g," ").slice(0,155))}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="AIJOBS"><meta property="og:title" content="${esc(job.title)} at ${esc(job.companyName)}"><meta property="og:description" content="${esc(String(job.description||job.jobDescription||"").replace(/<[^>]+>/g," ").slice(0,155))}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{margin:0;background:#07152F;color:#fff;font-family:Inter,system-ui,sans-serif}.w{max-width:900px;margin:auto;padding:28px}.c{background:#0b1c39;border:1px solid #20395f;border-radius:22px;padding:28px}.b{display:inline-block;padding:6px 10px;border-radius:99px;background:#12376b;color:#93c5fd;font-size:12px}.m{color:#94a3b8}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.g div{padding:12px;background:#08162e;border-radius:12px}.a{display:inline-block;text-decoration:none;background:#2563EB;color:#fff;padding:13px 18px;border-radius:12px;font-weight:800;margin-top:18px}@media(max-width:700px){.g{grid-template-columns:1fr}}</style></head><body><div class="w"><div style="font-weight:900;font-size:22px;margin-bottom:18px">AIJOBS</div><div class="c"><span class="b">Verified Job</span><h1>${esc(job.title)}</h1><p class="m">${esc(job.companyName)} · ${esc(job.location)}</p>${consultancyName ? `<p class="m"><strong>Posted through:</strong> ${esc(consultancyName)} on AIJOBS</p>` : `<p class="m"><strong>Published on:</strong> AIJOBS</p>`}<div class="g"><div><b>Salary</b><br><span class="m">₹${esc(job.minimumSalary||"")} - ₹${esc(job.maximumSalary||"")} ${esc(job.salaryPeriod||"")}</span></div><div><b>Experience</b><br><span class="m">${esc(job.minimumExperience||0)} - ${esc(job.maximumExperience||0)} years</span></div><div><b>Openings</b><br><span class="m">${esc(job.openings||1)}</span></div><div><b>Qualification</b><br><span class="m">${esc(job.minimumQualification||"As per role")}</span></div><div><b>Employment</b><br><span class="m">${esc(job.employmentType||job.type||"")}</span></div><div><b>Work Mode</b><br><span class="m">${esc(job.workMode||"")}</span></div></div><h3>Required Skills</h3><p class="m">${esc(skills.join(", "))}</p><h3>Job Description</h3><div class="m" style="white-space:pre-wrap;line-height:1.7">${esc(job.description||job.jobDescription||"")}</div>${job.benefits?`<h3>Benefits</h3><div class="m" style="white-space:pre-wrap">${esc(job.benefits)}</div>`:""}<p class="m">Posted: ${esc(String(job.datePosted||job.approvedAt||job.createdAt||"").slice(0,10))} · Expires: ${esc(String(expiry).slice(0,10))}</p><a class="a" href="${applyUrl}">Apply on AIJOBS →</a></div></div></body></html>`);
    return true;
  }
  return false;
}
