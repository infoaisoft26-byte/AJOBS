import React, { FormEvent, useMemo, useState } from "react";
import { BriefcaseBusiness, ChevronDown, Mail, Scale, Send, Users } from "lucide-react";
import { CONTACT_EMAILS } from "../config/site";

type ContactKey = keyof typeof CONTACT_EMAILS;

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  type: string;
};

const CONTACT_META: Record<ContactKey, { label: string; description: string; icon: typeof Mail }> = {
  info: {
    label: "General & Candidate Support",
    description: "Account help, candidate queries and general website support",
    icon: Users,
  },
  sales: {
    label: "Hiring & Sales India",
    description: "Employers, recruiters, consultancies, plans and partnerships",
    icon: BriefcaseBusiness,
  },
  compliance: {
    label: "Compliance & Grievance",
    description: "Privacy, legal, fraud reports, grievance and data-deletion requests",
    icon: Scale,
  },
};

function getPreferredContact(pathname: string): ContactKey {
  const path = pathname.toLowerCase();
  if (/privacy|terms|legal|refund|cancel|compliance|grievance|report|delete|fraud/.test(path)) return "compliance";
  if (/hire|employer|recruiter|consultancy|pricing|subscription|partner/.test(path)) return "sales";
  return "info";
}

function keyToType(key: ContactKey): string {
  if (key === "sales") return "sales";
  if (key === "compliance") return "compliance";
  return "general";
}

function typeToKey(type: string): ContactKey {
  if (["sales", "employer", "recruiter", "consultancy", "partnership", "billing", "subscription"].includes(type)) return "sales";
  if (["compliance", "privacy", "grievance", "fraud", "legal", "data_deletion"].includes(type)) return "compliance";
  return "info";
}

export default function OfficialContactDock() {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const preferred = useMemo(() => getPreferredContact(pathname), [pathname]);
  const preferredMeta = CONTACT_META[preferred];
  const PreferredIcon = preferredMeta.icon;
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    type: keyToType(preferred),
  });
  const selectedKey = typeToKey(form.type);

  const submitInquiry = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("");
    setBusy(true);
    try {
      const response = await fetch("/api/contact/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to send message.");
      }
      setStatus(`Sent successfully to ${payload.routedTo}.`);
      setForm((current) => ({ ...current, subject: "", message: "" }));
    } catch (error: any) {
      setStatus(error?.message || "Unable to send message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="fixed bottom-4 left-4 z-[9997] max-w-[calc(100vw-2rem)] text-white print:hidden" aria-label="AIJOBS official contact emails">
      {open && (
        <div className="mb-2 w-[360px] max-w-full overflow-hidden rounded-2xl border border-white/15 bg-[#07152F]/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 px-2 py-1">
            <p className="text-xs font-black tracking-wide">Official AIJOBS Contacts</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">Choose the correct team or send your request directly from the website.</p>
          </div>

          {(Object.keys(CONTACT_EMAILS) as ContactKey[]).map((key) => {
            const meta = CONTACT_META[key];
            const Icon = meta.icon;
            const highlighted = key === preferred;
            return (
              <button
                type="button"
                key={key}
                onClick={() => {
                  setForm((current) => ({ ...current, type: keyToType(key) }));
                  setShowForm(true);
                  setStatus("");
                }}
                className={`mb-1 flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-white/10 ${highlighted ? "border-blue-400/50 bg-blue-500/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-blue-300" : "text-slate-400"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-white">{meta.label}</span>
                  <span className="block truncate text-[11px] text-blue-300">{CONTACT_EMAILS[key]}</span>
                  <span className="mt-0.5 block text-[9px] leading-3 text-slate-500">{meta.description}</span>
                </span>
                <Send className="mt-1 h-3.5 w-3.5 text-slate-500" />
              </button>
            );
          })}

          {showForm && (
            <form onSubmit={submitInquiry} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <select
                value={form.type}
                onChange={(e) => setForm((v) => ({ ...v, type: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-[#0b1730] px-2.5 py-2 text-[10px] text-slate-200 outline-none focus:border-blue-400/60"
              >
                <option value="general">General enquiry</option>
                <option value="support">Candidate / account support</option>
                <option value="sales">Hiring / sales</option>
                <option value="employer">Employer enquiry</option>
                <option value="recruiter">Recruiter enquiry</option>
                <option value="consultancy">Consultancy enquiry</option>
                <option value="partnership">Partnership</option>
                <option value="billing">Billing / subscription</option>
                <option value="compliance">Compliance</option>
                <option value="privacy">Privacy request</option>
                <option value="grievance">Grievance</option>
                <option value="fraud">Fraud / safety report</option>
                <option value="legal">Legal</option>
                <option value="data_deletion">Data deletion</option>
              </select>
              <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 px-2.5 py-2 text-[9px] text-slate-400">
                Routing to <span className="font-bold text-blue-300">{CONTACT_META[selectedKey].label}</span> · {CONTACT_EMAILS[selectedKey]}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Your name" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] outline-none focus:border-blue-400/60" />
                <input required type="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} placeholder="Email" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] outline-none focus:border-blue-400/60" />
              </div>
              <input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} placeholder="Phone (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] outline-none focus:border-blue-400/60" />
              <input value={form.subject} onChange={(e) => setForm((v) => ({ ...v, subject: e.target.value }))} placeholder="Subject" className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] outline-none focus:border-blue-400/60" />
              <textarea required rows={4} value={form.message} onChange={(e) => setForm((v) => ({ ...v, message: e.target.value }))} placeholder="Write your message" className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] outline-none focus:border-blue-400/60" />
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[9px] leading-3 ${status.toLowerCase().includes("success") || status.toLowerCase().includes("sent") ? "text-emerald-300" : "text-slate-400"}`}>{status}</span>
                <button type="submit" disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold hover:bg-blue-500 disabled:opacity-60">
                  <Send className="h-3 w-3" />
                  {busy ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-2 flex flex-wrap gap-2 px-1">
            {(Object.keys(CONTACT_EMAILS) as ContactKey[]).map((key) => (
              <a key={key} href={`mailto:${CONTACT_EMAILS[key]}`} className="text-[9px] text-slate-500 hover:text-blue-300">Email {key}</a>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setOpen((value) => !value)} className="flex max-w-[320px] items-center gap-2 rounded-full border border-blue-400/30 bg-[#07152F]/95 px-4 py-2.5 shadow-xl backdrop-blur-xl transition hover:border-blue-300/60 hover:bg-[#0b1d3d]" aria-expanded={open}>
        <PreferredIcon className="h-4 w-4 text-blue-300" />
        <span className="min-w-0 text-left">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">Official contact</span>
          <span className="block truncate text-[11px] font-bold text-blue-200">{CONTACT_EMAILS[preferred]}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}
