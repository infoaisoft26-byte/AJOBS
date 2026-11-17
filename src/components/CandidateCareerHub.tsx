import React from "react";
import {
  BriefcaseBusiness,
  FileSearch,
  FileText,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";

interface CandidateCareerHubProps {
  profile?: any;
  onNavigate: (tab: string) => void;
}

const tools = [
  {
    id: "resume-checker",
    title: "AI Resume & ATS Checker",
    description: "Review and improve the resume already connected to your AIJOBS candidate profile.",
    icon: FileSearch,
    actionLabel: "Open Resume",
    targetTab: "resume",
    status: "Available",
  },
  {
    id: "job-search",
    title: "Smart Job Search",
    description: "Explore real approved AIJOBS openings and apply using your existing candidate profile.",
    icon: BriefcaseBusiness,
    actionLabel: "Find Jobs",
    targetTab: "explore-jobs",
    status: "Available",
  },
  {
    id: "interview-prep",
    title: "Interview Preparation",
    description: "Keep interview schedules and recruiter interview activity together in your candidate portal.",
    icon: Target,
    actionLabel: "Open Interviews",
    targetTab: "interviews",
    status: "Available",
  },
  {
    id: "cover-letter",
    title: "AI Cover Letter Generator",
    description: "Generate job-specific cover letters from your profile and selected job once the generation service is connected.",
    icon: MessageSquareText,
    actionLabel: "Integration required",
    targetTab: null,
    status: "Coming soon",
  },
  {
    id: "resume-builder",
    title: "Resume Builder",
    description: "Build and manage your AIJOBS resume from your verified profile without duplicating candidate data.",
    icon: FileText,
    actionLabel: "Manage Resume",
    targetTab: "resume",
    status: "Available",
  },
];

export default function CandidateCareerHub({ profile, onNavigate }: CandidateCareerHubProps) {
  const firstName = String(profile?.fullName || profile?.name || "Candidate").trim().split(/\s+/)[0] || "Candidate";

  return (
    <section className="space-y-5" aria-labelledby="career-hub-title">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(7,21,47,0.96),rgba(15,23,42,0.9))] p-5 sm:p-7 shadow-[0_18px_60px_rgba(2,132,199,0.12)]">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            AIJOBS Career Hub
          </div>
          <h1 id="career-hub-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Build a stronger job search, {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Use your real AIJOBS candidate profile, resume, approved jobs and interview activity from one place. Tools that do not yet have a production backend are clearly marked instead of showing fake AI results.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate("explore-jobs")}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              Find Jobs
            </button>
            <button
              type="button"
              onClick={() => onNavigate("resume")}
              className="rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:border-cyan-400/50 hover:text-cyan-200"
            >
              Improve Resume
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const enabled = Boolean(tool.targetTab);
          return (
            <article
              key={tool.id}
              className="group rounded-2xl border border-slate-700/70 bg-[rgba(4,12,35,0.78)] p-5 backdrop-blur-xl transition hover:border-cyan-400/35 hover:bg-[rgba(7,21,47,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                  {tool.status}
                </span>
              </div>
              <h2 className="mt-4 text-base font-extrabold text-white">{tool.title}</h2>
              <p className="mt-2 min-h-16 text-sm leading-6 text-slate-400">{tool.description}</p>
              <button
                type="button"
                disabled={!enabled}
                onClick={() => tool.targetTab && onNavigate(tool.targetTab)}
                className={`mt-4 w-full rounded-xl px-3 py-2.5 text-sm font-bold transition ${enabled ? "bg-slate-800 text-slate-100 hover:bg-blue-600 hover:text-white" : "cursor-not-allowed border border-slate-700 bg-slate-900/70 text-slate-500"}`}
              >
                {tool.actionLabel}
              </button>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-950/25 p-4 text-sm leading-6 text-slate-300">
        <strong className="text-cyan-300">AIJOBS safety:</strong> never pay anyone for a job. Career Hub actions stay inside the existing candidate portal and use AIJOBS data rather than third-party branded assets or copied testimonials.
      </div>
    </section>
  );
}
