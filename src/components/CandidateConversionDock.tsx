import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, Sparkles, UserPlus, X } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function CandidateConversionDock() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const updateVisibility = (hasUser = Boolean(auth.currentUser)) => {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const homepage = path === "/";
      const hidden = sessionStorage.getItem("aijobs_candidate_conversion_dismissed") === "1";
      setDismissed(hidden);
      setVisible(homepage && !hasUser && !hidden);
    };

    updateVisibility();
    const unsubscribe = onAuthStateChanged(auth, (user) => updateVisibility(Boolean(user)));
    const onPop = () => updateVisibility(Boolean(auth.currentUser));
    window.addEventListener("popstate", onPop);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  if (!visible || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem("aijobs_candidate_conversion_dismissed", "1");
    setDismissed(true);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-3xl border border-blue-400/30 bg-[#07152F]/95 p-4 shadow-[0_20px_80px_rgba(37,99,235,0.32)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />

        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss registration prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex flex-col gap-4 pr-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.15em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> Candidate Career Profile
            </div>
            <h3 className="text-lg font-black text-white sm:text-xl">
              Apply now, but create your free AIJOBS profile to get more interview opportunities.
            </h3>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 100% free for candidates</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Save applications & resume</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Recruiters can discover your profile</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <button
              type="button"
              onClick={() => window.location.assign("/candidate/register")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-700/30 transition hover:-translate-y-0.5 hover:shadow-blue-600/40"
            >
              <UserPlus className="h-4 w-4" /> Create Free Profile
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/jobs")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Briefcase className="h-4 w-4" /> Browse Live Jobs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
