import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const SITE_URL = "https://aijobs1.in";
const SOCIAL_IMAGE = `${SITE_URL}/images/aijobs-ai-logo.png`;
const BLOCKED = new Set(["draft", "pending", "pending_approval", "pending_review", "pending_admin_verification", "changes_requested", "rejected", "expired", "closed", "deleted"]);
const PUBLIC_STATES = new Set(["approved", "live", "published", "active"]);

function esc(v: any) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function status(v: any) { return String(v || "").trim().toLowerCase().replace(/[\s-]+/g, "_"); }
function asDate(value: any): Date | null {
  if (!value) return null;
  const raw = typeof value?.toDate === "function" ? value.toDate() : value;
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function asIsoDate(value: any, fallback = new Date()) { return (asDate(value) || fallback).toISOString().slice(0, 10); }
function isLive(job: any) {
  const normalized = status(job.status);
  if (!PUBLIC_STATES.has(normalized) || BLOCKED.has(normalized) || job.approved === false) return false;
  const expiry = asDate(job.validThrough || job.expiryDate || job.applyDeadline);
  if (expiry && expiry.getTime() < Date.now()) return false;
  return job.isPublic !== false && job.publicVisibility !== false && job.visibility !== "private";
}
function googleEmploymentType(v: any) {
  const raw = String(v || "FULL_TIME").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = { CONTRACT: "CONTRACTOR", CONTRACTUAL: "CONTRACTOR", INTERNSHIP: "INTERN", FULLTIME: "FULL_TIME", PARTTIME: "PART_TIME" };
  const normalized = aliases[raw] || raw;
  return ["FULL_TIME", "PART_TIME", "CONTRACTOR", "TEMPORARY", "INTERN", "VOLUNTEER", "PER_DIEM", "OTHER"].includes(normalized) ? normalized : "OTHER";
}
function googleSalaryUnit(v: any) {
  const raw = String(v || "YEAR").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = { ANNUAL: "YEAR", ANNUALLY: "YEAR", YEARLY: "YEAR", PA: "YEAR", PER_ANNUM: "YEAR", MONTHLY: "MONTH", WEEKLY: "WEEK", DAILY: "DAY", HOURLY: "HOUR" };
  const normalized = aliases[raw] || raw;
  return ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"].includes(normalized) ? normalized : "YEAR";
}
function isHttpUrl(value: any) {
  try { const url = new URL(String(value || "")); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}
function publicUrl(job: any, id: string) {
  const canonical = String(job.canonicalUrl || "").trim();
  if (canonical.startsWith(`${SITE_URL}/jobs/`)) return canonical;
  const slug = job.slug || `${String(job.title || job.jobTitle || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${id}`;
  return `${SITE_URL}/jobs/${encodeURIComponent(String(slug))}`;
}
function textList(value: any): string[] {
  if (Array.isArray(value)) return value.map(v => String(v || "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\n]/).map(v => v.trim()).filter(Boolean);
  return [];
}
function plainText(value: any) { return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

export async function handleHiringPublicRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (!(path === "/sitemap.xml" || path === "/job-sitemap.xml" || path.startsWith("/jobs/"))) return false;
  const db = getFirestoreDb();

  if ((path === "/sitemap.xml" || path === "/job-sitemap.xml") && req.method === "GET") {
    const snap = await db.collection("jobs").get();
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(isLive);
    const staticUrls = path === "/job-sitemap.xml" ? [] : ["/", "/jobs", "/hire", "/hire/employer", "/hire/recruiter", "/hire/consultancy"];
    const nodes = [
      ...staticUrls.map(p => `<url><loc>${SITE_URL}${p}</loc><changefreq>daily</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`),
      ...jobs.map(j => `<url><loc>${esc(publicUrl(j, j.id))}</loc><lastmod>${asIsoDate(j.updatedAt || j.approvedAt || j.publishedAt || j.createdAt)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`)
    ];
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes.join("")}</urlset>`);
    return true;
  }

  if (path.startsWith("/jobs/") && req.method === "GET") {
    const slug = decodeURIComponent(path.slice("/jobs/".length));
    let jobSnap: any = null;
    const q = await db.collection("jobs").where("slug", "==", slug).limit(1).get().catch(() => null);
    if (q && !q.empty) jobSnap = q.docs[0];
    if (!jobSnap) {
      const idGuess = slug.match(/-(job_[a-z0-9_-]+)$/i)?.[1];
      if (idGuess) {
        const direct = await db.collection("jobs").doc(idGuess).get();
        if (direct.exists) jobSnap = direct;
      }
    }
    if (!jobSnap) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send("Job not found");
      return true;
    }

    const job: any = { id: jobSnap.id, ...jobSnap.data() };
    if (!isLive(job)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send("This job is not publicly available.");
      return true;
    }

    const title = String(job.title || job.jobTitle || "Job Opening").trim();
    const canonical = publicUrl(job, job.id);
    const expiry = asDate(job.validThrough || job.expiryDate || job.applyDeadline) || new Date(Date.now() + 30 * 86400000);
    const remote = status(job.workMode) === "remote" || status(job.jobLocationType) === "telecommute";
    const companyName = String(job.hiringOrganizationName || job.companyName || "AIJOBS Hiring Partner").trim();
    const description = String(job.description || job.jobDescription || "").trim();
    const metaDescription = (plainText(description) || `Apply for ${title} at ${companyName} on AIJOBS.`).slice(0, 158);
    const skills = textList(job.skillsRequired || job.requiredSkills || job.skills);
    const responsibilities = textList(job.responsibilities || job.keyResponsibilities);
    const qualifications = textList(job.qualifications || job.minimumQualification || job.requirements);
    const benefits = textList(job.benefits);
    const experienceRequirement = String(job.experienceRequirements || job.experienceRequired || [job.minimumExperience, job.maximumExperience].filter(v => v !== undefined && v !== null && v !== "").join("-")).trim();
    const educationRequirement = String(job.educationRequirements || job.minimumQualification || "").trim();
    const organization: any = { "@type": "Organization", name: companyName };
    if (isHttpUrl(job.companyWebsite || job.website)) organization.sameAs = String(job.companyWebsite || job.website);
    if (isHttpUrl(job.companyLogo)) organization.logo = String(job.companyLogo);

    const schema: any = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      url: canonical,
      title,
      description: description || `Apply for ${title} at ${companyName}.`,
      datePosted: asIsoDate(job.datePosted || job.approvedAt || job.publishedAt || job.createdAt),
      validThrough: expiry.toISOString(),
      employmentType: googleEmploymentType(job.employmentType || job.type),
      identifier: { "@type": "PropertyValue", name: companyName, value: job.id },
      hiringOrganization: organization,
      directApply: true
    };
    if (skills.length) schema.skills = skills.join(", ");
    if (responsibilities.length) schema.responsibilities = responsibilities.join("\n");
    if (qualifications.length) schema.qualifications = qualifications.join("\n");
    if (experienceRequirement) schema.experienceRequirements = experienceRequirement;
    if (educationRequirement) schema.educationRequirements = educationRequirement;
    if (remote) {
      schema.jobLocationType = "TELECOMMUTE";
      schema.applicantLocationRequirements = { "@type": "Country", name: job.country || "India" };
    } else {
      schema.jobLocation = { "@type": "Place", address: { "@type": "PostalAddress", streetAddress: job.streetAddress || undefined, addressLocality: job.city || job.location || "", addressRegion: job.state || "", postalCode: job.postalCode || undefined, addressCountry: job.countryCode || job.country || "IN" } };
    }
    const minSalary = Number(job.minimumSalary);
    const maxSalary = Number(job.maximumSalary);
    if ((Number.isFinite(minSalary) && minSalary > 0) || (Number.isFinite(maxSalary) && maxSalary > 0)) {
      schema.baseSalary = { "@type": "MonetaryAmount", currency: job.salaryCurrency || "INR", value: { "@type": "QuantitativeValue", minValue: minSalary > 0 ? minSalary : undefined, maxValue: maxSalary > 0 ? maxSalary : undefined, unitText: googleSalaryUnit(job.salaryPeriod) } };
    }

    const consultancyName = String(job.consultancyName || job.consultancy || "").trim();
    const jdDownload = isHttpUrl(job.jdFileUrl) ? String(job.jdFileUrl) : "";
    const socialImage = isHttpUrl(job.companyLogo) ? String(job.companyLogo) : SOCIAL_IMAGE;
    const locationText = String(job.location || [job.city, job.state].filter(Boolean).join(", ") || (remote ? "Remote" : "India"));

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300");
    res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large");
    res.status(200).send(`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} at ${esc(companyName)} | AIJOBS</title><meta name="description" content="${esc(metaDescription)}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta property="og:title" content="${esc(title)} at ${esc(companyName)} | AIJOBS"><meta property="og:description" content="${esc(metaDescription)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(socialImage)}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script><style>
body{margin:0;background:#07152F;color:#fff;font-family:Inter,system-ui,sans-serif}.w{max-width:920px;margin:auto;padding:28px}.c,.apply{background:#0b1c39;border:1px solid #20395f;border-radius:22px;padding:28px}.b{display:inline-block;padding:6px 10px;border-radius:99px;background:#12376b;color:#93c5fd;font-size:12px}.m{color:#94a3b8}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.g div{padding:12px;background:#08162e;border-radius:12px}.a,.submit{display:inline-block;border:0;text-decoration:none;background:linear-gradient(90deg,#2563EB,#06B6D4);color:#fff;padding:13px 18px;border-radius:12px;font-weight:800;margin-top:18px;cursor:pointer}.jd{display:inline-block;text-decoration:none;color:#a5b4fc;border:1px solid #4f46e5;padding:10px 14px;border-radius:12px;font-weight:700;margin-top:14px}.apply{margin-top:20px}.formgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{display:flex;flex-direction:column;gap:6px}.field.full{grid-column:1/-1}input{background:#08162e;border:1px solid #294267;color:#fff;padding:12px;border-radius:10px;font-size:14px}label{font-size:13px;color:#cbd5e1}.notice{padding:12px;border-radius:12px;background:#052e2b;border:1px solid #0f766e;color:#99f6e4}.err{padding:12px;border-radius:12px;background:#3f0d1a;border:1px solid #7f1d1d;color:#fecdd3}.success{padding:18px;border-radius:14px;background:#052e2b;border:1px solid #10b981;color:#d1fae5}.hp{position:absolute;left:-9999px;opacity:0}.small{font-size:12px}.submit[disabled]{opacity:.55;cursor:not-allowed}@media(max-width:700px){.g,.formgrid{grid-template-columns:1fr}.field.full{grid-column:auto}.w{padding:14px}.c,.apply{padding:20px}}
</style></head><body><div class="w"><div style="font-weight:900;font-size:22px;margin-bottom:18px">AIJOBS</div><div class="c"><span class="b">Verified Job</span><h1>${esc(title)}</h1><p class="m">${esc(companyName)} · ${esc(locationText)}</p>${consultancyName ? `<p class="m"><strong>Posted through:</strong> ${esc(consultancyName)} on AIJOBS</p>` : `<p class="m"><strong>Published on:</strong> AIJOBS</p>`}<div class="g"><div><b>Salary</b><br><span class="m">${minSalary > 0 || maxSalary > 0 ? `${esc(job.salaryCurrency || "INR")} ${esc(minSalary || "")} - ${esc(maxSalary || "")} ${esc(googleSalaryUnit(job.salaryPeriod))}` : "As per company policy"}</span></div><div><b>Experience</b><br><span class="m">${esc(experienceRequirement || "As per role")}</span></div><div><b>Openings</b><br><span class="m">${esc(job.openings || job.numberOfOpenings || 1)}</span></div><div><b>Qualification</b><br><span class="m">${esc(educationRequirement || "As per role")}</span></div><div><b>Employment</b><br><span class="m">${esc(job.employmentType || job.type || "")}</span></div><div><b>Work Mode</b><br><span class="m">${esc(job.workMode || (remote ? "Remote" : "On-site"))}</span></div></div>${skills.length ? `<h3>Required Skills</h3><p class="m">${esc(skills.join(", "))}</p>` : ""}<h3>Job Description</h3><div class="m" style="white-space:pre-wrap;line-height:1.7">${esc(description || "See role details and requirements above.")}</div>${jdDownload ? `<a class="jd" href="${esc(jdDownload)}" target="_blank" rel="noopener noreferrer">View / Download Full JD</a>` : ""}${responsibilities.length ? `<h3>Responsibilities</h3><div class="m" style="white-space:pre-wrap">${esc(responsibilities.join("\n"))}</div>` : ""}${qualifications.length ? `<h3>Qualifications</h3><div class="m" style="white-space:pre-wrap">${esc(qualifications.join("\n"))}</div>` : ""}${benefits.length ? `<h3>Benefits</h3><div class="m" style="white-space:pre-wrap">${esc(benefits.join("\n"))}</div>` : ""}<p class="m">Posted: ${esc(asIsoDate(job.datePosted || job.approvedAt || job.publishedAt || job.createdAt))} · Expires: ${esc(expiry.toISOString().slice(0, 10))}</p><button class="a" type="button" onclick="document.getElementById('quick-apply').scrollIntoView({behavior:'smooth'})">Quick Apply — No Registration →</button><p class="m small">No account is required to submit your application.</p></div>
<div class="apply" id="quick-apply"><h2 style="margin-top:0">Quick Apply</h2><div class="notice"><strong>Apply directly.</strong> Registration is not required. We will capture your application and share it only with the hiring team for this job.</div><form id="quickApply" data-job-id="${esc(job.id)}"><div class="formgrid" style="margin-top:16px"><div class="field"><label>Full Name *</label><input name="name" maxlength="120" required autocomplete="name"></div><div class="field"><label>Mobile Number *</label><input name="phone" maxlength="20" required inputmode="tel" autocomplete="tel"></div><div class="field"><label>Email *</label><input name="email" type="email" maxlength="180" required autocomplete="email"></div><div class="field"><label>Current Location</label><input name="location" maxlength="120" autocomplete="address-level2"></div><div class="field"><label>Total Experience</label><input name="experience" maxlength="80" placeholder="e.g. 2 years"></div><div class="field"><label>Qualification</label><input name="qualification" maxlength="160" placeholder="e.g. Graduate"></div><div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><div class="field full"><label style="display:flex;gap:8px;align-items:flex-start"><input name="consent" type="checkbox" required style="width:auto;margin-top:2px">I agree that AIJOBS may share my application details with the recruiter/employer/consultancy hiring for this job.</label></div></div><div id="applyMessage" style="margin-top:12px"></div><button class="submit" id="applySubmit" type="submit">Submit Application</button><p class="m small">AIJOBS does not charge candidates for job applications, interviews, selection, offer letters or joining.</p></form></div></div><script>
(function(){var form=document.getElementById('quickApply');var msg=document.getElementById('applyMessage');var btn=document.getElementById('applySubmit');if(!form)return;form.addEventListener('submit',async function(e){e.preventDefault();msg.className='';msg.textContent='';btn.disabled=true;btn.textContent='Submitting...';try{var fd=new FormData(form);var qs=new URLSearchParams(window.location.search);var payload={jobId:form.getAttribute('data-job-id'),name:fd.get('name'),phone:fd.get('phone'),email:fd.get('email'),location:fd.get('location'),experience:fd.get('experience'),qualification:fd.get('qualification'),website:fd.get('website'),consent:fd.get('consent')==='on',utm_source:qs.get('utm_source')||'public_job',utm_medium:qs.get('utm_medium')||'job_apply',utm_campaign:qs.get('utm_campaign')||'public_job_apply',utm_content:qs.get('utm_content')||'',utm_term:qs.get('utm_term')||'',landingPage:window.location.href,referrer:document.referrer};var r=await fetch('/api/public/job-apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});var d=await r.json().catch(function(){return{success:false,error:'Unable to submit application.'}});if(!r.ok||!d.success)throw new Error(d.error||d.message||'Unable to submit application.');form.innerHTML='<div class="success"><strong>Application received ✓</strong><p style="margin-bottom:0">'+(d.duplicate?'We already have your application for this job.':'Your application has been sent to the hiring team. You do not need to register first.')+'</p></div>';form.scrollIntoView({behavior:'smooth',block:'center'});}catch(err){msg.className='err';msg.textContent=err&&err.message?err.message:'Unable to submit application. Please try again.';btn.disabled=false;btn.textContent='Submit Application';}});})();
</script></body></html>`);
    return true;
  }
  return false;
}
