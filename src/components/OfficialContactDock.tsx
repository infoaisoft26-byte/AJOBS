import { useMemo, useState } from "react";
import { BriefcaseBusiness, ChevronDown, Mail, Scale, Users } from "lucide-react";
import { CONTACT_EMAILS } from "../config/site";

type ContactKey = keyof typeof CONTACT_EMAILS;

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

export default function OfficialContactDock() {
  const [open, setOpen] = useState(false);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const preferred = useMemo(() => getPreferredContact(pathname), [pathname]);
  const preferredMeta = CONTACT_META[preferred];
  const PreferredIcon = preferredMeta.icon;

  return (
    <aside className="fixed bottom-4 left-4 z-[9997] max-w-[calc(100vw-2rem)] text-white print:hidden" aria-label="AIJOBS official contact emails">
      {open && (
        <div className="mb-2 w-[340px] max-w-full overflow-hidden rounded-2xl border border-white/15 bg-[#07152F]/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 px-2 py-1">
            <p className="text-xs font-black tracking-wide">Official AIJOBS Contacts</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">Choose the correct mailbox so your request reaches the right team.</p>
          </div>
          {(Object.keys(CONTACT_EMAILS) as ContactKey[]).map((key) => {
            const meta = CONTACT_META[key];
            const Icon = meta.icon;
            const highlighted = key === preferred;
            return (
              <a
                key={key}
                href={`mailto:${CONTACT_EMAILS[key]}`}
                className={`mb-1 flex items-start gap-3 rounded-xl border px-3 py-2.5 transition hover:bg-white/10 ${highlighted ? "border-blue-400/50 bg-blue-500/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-blue-300" : "text-slate-400"}`} />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-white">{meta.label}</span>
                  <span className="block truncate text-[11px] text-blue-300">{CONTACT_EMAILS[key]}</span>
                  <span className="mt-0.5 block text-[9px] leading-3 text-slate-500">{meta.description}</span>
                </span>
              </a>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex max-w-[320px] items-center gap-2 rounded-full border border-blue-400/30 bg-[#07152F]/95 px-4 py-2.5 shadow-xl backdrop-blur-xl transition hover:border-blue-300/60 hover:bg-[#0b1d3d]"
        aria-expanded={open}
      >
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
