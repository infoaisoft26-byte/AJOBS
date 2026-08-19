import React from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";

interface CandidateLegalBannerProps {
  className?: string;
  compact?: boolean;
}

export default function CandidateLegalBanner({ className = "", compact = false }: CandidateLegalBannerProps) {
  if (compact) {
    return (
      <div 
        id="candidate-legal-banner-compact"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-sm ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="truncate">AIJOBS never charges candidates for jobs.</span>
      </div>
    );
  }

  return (
    <div 
      id="candidate-legal-banner"
      className={`w-full bg-gradient-to-r from-emerald-950/60 via-[#17111F] to-emerald-950/60 border-y sm:border sm:rounded-2xl border-emerald-500/30 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg shadow-emerald-950/20 backdrop-blur-md ${className}`}
    >
      <div className="flex items-center gap-2.5 text-emerald-300 text-xs font-medium">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <span className="font-bold text-white mr-1.5">Free & Fair Hiring:</span>
          <span>AIJOBS never charges candidates for jobs, interviews, or registration.</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-emerald-400/80 font-mono shrink-0">
        <AlertCircle className="w-3 h-3 text-emerald-400" />
        <span>Report fraudulent fee requests immediately</span>
      </div>
    </div>
  );
}
