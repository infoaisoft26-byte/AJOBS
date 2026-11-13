import React, { useState } from "react";
import { ArrowLeft, Download, FileText, Plus, Sparkles } from "lucide-react";

type ResumeData = {
  name: string; title: string; email: string; phone: string; location: string;
  summary: string; skills: string; experience: string; education: string; projects: string;
};
const empty: ResumeData = { name: "", title: "", email: "", phone: "", location: "", summary: "", skills: "", experience: "", education: "", projects: "" };

export default function ResumeBuilder({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<ResumeData>(empty);
  const update = (key: keyof ResumeData, value: string) => setData((old) => ({ ...old, [key]: value }));
  const field = (label: string, key: keyof ResumeData, placeholder: string, multiline = false) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {multiline ? <textarea value={data[key]} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} rows={4} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /> :
      <input value={data[key]} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />}
    </label>
  );
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <style>{`@media print { body * { visibility: hidden !important; } #resume-print, #resume-print * { visibility: visible !important; } #resume-print { position: absolute; inset: 0; width: 100%; box-shadow: none !important; border: 0 !important; } .no-print { display: none !important; } }`}</style>
      <div className="mx-auto max-w-6xl">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white"><ArrowLeft size={17}/> Back to AIJOBS</button>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700"><Sparkles size={14}/> Free Resume Builder</div>
        </div>
        <div className="no-print mb-7">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Create your professional resume</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Add your details and see your resume update instantly. When ready, choose Save as PDF in the print window.</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="no-print rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-slate-900"><FileText size={19} className="text-violet-600"/> Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("Full name", "name", "e.g. Priya Sharma")}
              {field("Professional title", "title", "e.g. Marketing Executive")}
              {field("Email", "email", "you@example.com")}
              {field("Phone", "phone", "+91 98765 43210")}
              <div className="sm:col-span-2">{field("City / Location", "location", "Pune, Maharashtra")}</div>
              <div className="sm:col-span-2">{field("Professional summary", "summary", "Write 2–3 lines about your experience, strengths and career goal...", true)}</div>
              <div className="sm:col-span-2">{field("Skills", "skills", "Communication, Excel, React, Sales (separate with commas)", true)}</div>
              <div className="sm:col-span-2">{field("Work experience", "experience", "Job title | Company | Dates\nDescribe your responsibilities and achievements...", true)}</div>
              <div className="sm:col-span-2">{field("Education", "education", "Degree | College | Year\nAdd your qualification and result...", true)}</div>
              <div className="sm:col-span-2">{field("Projects / Certifications (optional)", "projects", "Project or certificate name — short description", true)}</div>
            </div>
            <button onClick={() => window.print()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-200 hover:brightness-105"><Download size={17}/> Download Resume as PDF</button>
            <p className="mt-2 text-center text-xs text-slate-500">Tip: Select “Save as PDF” as the printer destination.</p>
          </section>
          <section id="resume-print" className="min-h-[680px] rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
            <header className="border-b-2 border-slate-900 pb-5">
              <h2 className="text-3xl font-black uppercase tracking-wide text-slate-950">{data.name || "Your Name"}</h2>
              <p className="mt-1 text-base font-semibold text-violet-700">{data.title || "Professional Title"}</p>
              <p className="mt-3 break-words text-xs text-slate-600">{[data.email, data.phone, data.location].filter(Boolean).join("  •  ") || "Email • Phone • Location"}</p>
            </header>
            {([["Professional Summary", data.summary], ["Key Skills", data.skills], ["Work Experience", data.experience], ["Education", data.education], ["Projects & Certifications", data.projects]] as const).map(([heading, value]) => (
              <section key={heading} className="mt-6 break-inside-avoid">
                <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase tracking-[0.16em] text-slate-800">{heading}</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || "Add your information in the form to complete this section."}</p>
              </section>
            ))}
            <footer className="mt-10 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">Created with AIJOBS Resume Builder</footer>
          </section>
        </div>
      </div>
    </main>
  );
}
