import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const ORIGIN = "https://aijobs1.in";
const PAGES: Record<string, { title: string; description: string; heading: string; intro: string; kind: "all" | "remote" | "wfh"; faqs: Array<[string, string]> }> = {
  "/jobs-in-india": {
    title: "Latest Jobs in India | Verified Job Openings | AIJOBS",
    description: "Explore current job openings in India on AIJOBS. Discover approved opportunities, review role requirements and apply directly to suitable jobs.",
    heading: "Latest Jobs in India",
    intro: "Explore job opportunities across India on AIJOBS. Review the role, employer information, location and requirements shown on each approved listing before applying.",
    kind: "all",
    faqs: [
      ["Where can I find current jobs in India?", "Browse the approved openings listed on this page and open a job to review its requirements and application details."],
      ["Do I need to pay to apply for a job on AIJOBS?", "AIJOBS does not charge candidates to submit job applications."],
      ["How do I apply?", "Open a suitable job listing and use the application option provided on that job page."]
    ]
  },
  "/remote-jobs-india": {
    title: "Remote Jobs in India | Work Remotely | AIJOBS",
    description: "Find remote job opportunities in India on AIJOBS. Explore approved remote roles and check each listing for location, eligibility and application requirements.",
    heading: "Remote Jobs in India",
    intro: "Looking for remote work? Explore approved listings marked as remote and check each employer's location and applicant eligibility before applying.",
    kind: "remote",
    faqs: [
      ["Are all remote jobs open to applicants across India?", "Not necessarily. Check the applicant location and eligibility requirements on each individual listing."],
      ["Can remote jobs require office visits?", "Work arrangements vary by employer. Review the job description and confirm expectations with the hiring team."],
      ["Is applying free?", "AIJOBS does not charge candidates to submit job applications."]
    ]
  },
  "/work-from-home-jobs-india": {
    title: "Work From Home Jobs in India | AIJOBS",
    description: "Browse approved work from home job listings in India. Check role details, eligibility and employer requirements on AIJOBS before applying.",
    heading: "Work From Home Jobs in India",
    intro: "Explore work-from-home opportunities listed on AIJOBS. Read each job description carefully to understand the role, required skills, working arrangement and eligibility.",
    kind: "wfh",
    faqs: [
      ["How can I identify genuine work-from-home opportunities?", "Review the employer and role details, avoid requests for payment to secure a job, and verify unusual offers directly with the hiring organization."],
      ["Are work-from-home jobs available for freshers?", "Eligibility depends on each employer and role. Check the requirements in the individual listing."],
      ["Does AIJOBS charge application fees?", "AIJOBS does not charge candidates for job applications, interviews, selection or joining."]
    ]
  }
};

function esc(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function cleanText(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function dateValue(value: any): Date | null {
  if (!value) return null;
  const raw = typeof value?.toDate === "function" ? value.toDate() : value;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
function isApprovedPublic(job: any): boolean {
  if (String(job.status || "").trim().toLowerCase() !== "approved") return false;
  if (job.approved === false || job.isPublic === false || job.publicVisibility === false || job.visibility === "private") return false;
  const expiry = dateValue(job.validThrough || job.expiryDate || job.applyDeadline);
  return !expiry || expiry.getTime() >= Date.now();
}
function isRemote(job: any): boolean {
  const mode = String(job.workMode || job.jobLocationType || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return mode === "remote" || mode === "telecommute" || job.remote === true || job.isRemote === true;
}
function jobUrl(job: any, id: string): string {
  const canonical = String(job.canonicalUrl || "").trim();
  if (canonical.startsWith(ORIGIN + "/jobs/")) return canonical;
  const slug = String(job.slug || `${String(job.title || job.jobTitle || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${id}`);
  return `${ORIGIN}/jobs/${encodeURIComponent(slug)}`;
}
function salaryLabel(job: any): string {
  const min = Number(job.minimumSalary), max = Number(job.maximumSalary);
  if (!(min > 0) && !(max > 0)) return "";
  const currency = String(job.salaryCurrency || "INR").toUpperCase();
  const period = String(job.salaryPeriod || "year").toLowerCase();
  return [currency, min > 0 ? min.toLocaleString("en-IN") : "", max > 0 ? max.toLocaleString("en-IN") : ""].filter(Boolean).join(" ") + (period ? ` / ${period}` : "");
}

export async function handleSeoJobLandingRoute(req: Request, res: Response): Promise<boolean> {
  const pathname = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  const page = PAGES[pathname];
  if (!page || req.method !== "GET") return false;

  try {
    const db = getFirestoreDb();
    const snap = await db.collection("jobs").get();
    const jobs = snap.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .filter(isApprovedPublic)
      .filter((job: any) => page.kind === "all" || isRemote(job))
      .sort((a: any, b: any) => {
        const da = dateValue(a.approvedAt || a.datePosted || a.createdAt)?.getTime() || 0;
        const db = dateValue(b.approvedAt || b.datePosted || b.createdAt)?.getTime() || 0;
        return db - da;
      })
      .slice(0, 60);

    const cards = jobs.map((job: any) => {
      const title = cleanText(job.title || job.jobTitle || "Job opening");
      const company = cleanText(job.hiringOrganizationName || job.companyName || "Hiring organization");
      const location = cleanText(job.location || [job.city, job.state].filter(Boolean).join(", ") || (isRemote(job) ? "Remote" : ""));
      const description = cleanText(job.description || job.jobDescription || "");
      const summary = description.length > 190 ? description.slice(0, 187) + "..." : description;
      const url = jobUrl(job, job.id);
      const salary = salaryLabel(job);
      const mode = cleanText(job.workMode || (isRemote(job) ? "Remote" : ""));
      return `<article class="job"><h2><a href="${esc(url)}">${esc(title)}</a></h2><p class="meta">${esc(company)}${location ? " · " + esc(location) : ""}${mode ? " · " + esc(mode) : ""}</p>${summary ? `<p>${esc(summary)}</p>` : ""}${salary ? `<p class="salary">${esc(salary)}</p>` : ""}<a class="joblink" href="${esc(url)}">View job and apply →</a></article>`;
    }).join("");

    const itemList = jobs.map((job: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      url: jobUrl(job, job.id),
      name: cleanText(job.title || job.jobTitle || "Job opening")
    }));
    const collectionSchema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.heading,
      description: page.description,
      url: ORIGIN + pathname,
      mainEntity: { "@type": "ItemList", itemListElement: itemList }
    };
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer }
      }))
    };
    const faqHtml = page.faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join("");
    const emptyMessage = page.kind === "all"
      ? "There are no approved public job listings to display right now. Check back soon, or browse the main AIJOBS job area."
      : "There are no approved public listings matching this work arrangement right now. Check back soon or browse all available jobs.";
    const canonical = ORIGIN + pathname;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300");
    res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large");
    return res.status(200).send(`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta property="og:type" content="website"><meta property="og:site_name" content="AIJOBS"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary"><script type="application/ld+json">${JSON.stringify(collectionSchema).replace(/</g, "\\u003c")}</script><script type="application/ld+json">${JSON.stringify(faqSchema).replace(/</g, "\\u003c")}</script><style>body{margin:0;background:#07152f;color:#f8fafc;font-family:Inter,system-ui,sans-serif;line-height:1.65}.wrap{max-width:1050px;margin:auto;padding:30px 22px}.brand{font-weight:900;font-size:22px;color:#fff;text-decoration:none}.hero{padding:38px 0 24px}.eyebrow{color:#67e8f9;font-weight:800;letter-spacing:.1em;text-transform:uppercase;font-size:12px}h1{font-size:clamp(32px,5vw,48px);line-height:1.12;margin:12px 0}p{color:#cbd5e1}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.btn{display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:800}.btn.secondary{background:#102647;border:1px solid #28466f}.count{color:#94a3b8;font-size:14px}.job{background:#0b1c39;border:1px solid #1e3a5f;border-radius:16px;padding:20px;margin:14px 0}.job h2{font-size:20px;margin:0 0 4px}.job h2 a{color:#fff;text-decoration:none}.job h2 a:hover{color:#67e8f9}.meta{font-size:14px;color:#93c5fd;margin:4px 0 12px}.salary{font-weight:700;color:#a7f3d0}.joblink{color:#67e8f9;font-weight:800;text-decoration:none}.content{margin-top:38px;padding:24px;background:#0b1c39;border:1px solid #1e3a5f;border-radius:18px}.content h2{margin-top:0}details{padding:14px 0;border-top:1px solid #294267}summary{cursor:pointer;font-weight:700}footer{padding:28px 0;color:#94a3b8}footer a{color:#67e8f9;margin-right:14px}@media(max-width:640px){.wrap{padding:20px 14px}.hero{padding-top:28px}}</style></head><body><main class="wrap"><a class="brand" href="/">AIJOBS</a><section class="hero"><div class="eyebrow">AIJOBS · Verified opportunities</div><h1>${esc(page.heading)}</h1><p>${esc(page.intro)}</p><div class="actions"><a class="btn" href="/jobs">Browse all jobs</a><a class="btn secondary" href="/hire/employer">Hire with AIJOBS</a></div><div class="count">${jobs.length} approved public ${jobs.length === 1 ? "listing" : "listings"} shown</div></section><section aria-label="Current job listings">${cards || `<article class="job"><p>${esc(emptyMessage)}</p><a class="joblink" href="/jobs">Browse AIJOBS →</a></article>`}</section><section class="content"><h2>Explore jobs with confidence</h2><p>Read the complete job description, required skills, experience and location details before applying. Job availability and eligibility are set by each hiring organization and may change.</p><h2>Job search guidance</h2><p>Keep your resume current, use accurate contact details, tailor your application to the role and never pay an individual to guarantee selection or an offer. Contact the hiring organization if any job detail is unclear.</p><h2>Frequently asked questions</h2>${faqHtml}</section><footer><a href="/">Home</a><a href="/jobs">All jobs</a><a href="/hire">For employers</a><a href="/about">About AIJOBS</a><a href="/contact">Contact</a></footer></main></body></html>`);
  } catch (error: any) {
    console.error("[SEO job landing]", error?.message || error);
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).send("Job listings are temporarily unavailable. Please try again shortly.");
  }
}
