import React, { useState } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  MailCheck, 
  MailWarning, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  ArrowRight, 
  Filter, 
  Check, 
  ShieldAlert,
  Search
} from "lucide-react";
import { LiveStats } from "./AdminTypes";

interface CandidateVerificationWidgetProps {
  stats: LiveStats;
  users?: any[];
  onNavigateToTab?: (tab: string) => void;
  onRefresh?: () => void;
}

export default function CandidateVerificationWidget({
  stats,
  users = [],
  onNavigateToTab,
  onRefresh
}: CandidateVerificationWidgetProps) {
  const [showUnverifiedList, setShowUnverifiedList] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalCandidates = stats.totalCandidates || 0;
  const verifiedCount = stats.verifiedCandidates ?? 0;
  const unverifiedCount = stats.unverifiedCandidates ?? 0;

  // Calculate verification percentage
  const verificationRate = totalCandidates > 0 
    ? Math.round((verifiedCount / totalCandidates) * 1000) / 10 
    : 0;

  // Filter unverified candidates from the users list
  const unverifiedCandidates = users.filter(u => {
    if (u.role !== "candidate") return false;
    const isVerified = u.emailVerified === true || u.verificationStatus === "verified" || ((u.accountStatus === "active" || u.status === "active") && u.emailVerified !== false && u.verificationStatus !== "pending");
    return !isVerified;
  });

  const filteredUnverified = unverifiedCandidates.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (u.displayName || u.name || "").toLowerCase().includes(q) ||
           (u.email || "").toLowerCase().includes(q) ||
           (u.uid || "").toLowerCase().includes(q);
  });

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleSimulateResend = (email: string) => {
    setToastMessage(`Verification reminder queued for ${email}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="glass p-5 md:p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#0c0d18] via-[#090a12] to-[#0d0d1e] space-y-6 relative overflow-hidden shadow-2xl">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl shrink-0">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-extrabold text-white tracking-wide uppercase font-mono">
                Candidate Account Verification Monitor
              </h3>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Security Flow Active
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Impact metrics tracking verified vs unverified candidate registrations under the new security protocol.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5"
              title="Refresh Telemetry Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab("users")}
              className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-indigo-300 hover:text-white transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5"
            >
              <span>User Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
        
        {/* Total Candidates */}
        <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono uppercase">
            <span>Total Candidates</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white mt-2 font-mono">
            {totalCandidates}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            Registered accounts
          </div>
        </div>

        {/* Verified Candidates */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] font-mono uppercase font-bold">
            <span>Verified Accounts</span>
            <MailCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-300 mt-2 font-mono">
            {verifiedCount}
          </div>
          <div className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{totalCandidates > 0 ? Math.round((verifiedCount / totalCandidates) * 100) : 0}% of Total</span>
          </div>
        </div>

        {/* Unverified Candidates */}
        <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between text-amber-400 text-[10px] font-mono uppercase font-bold">
            <span>Pending Verification</span>
            <MailWarning className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-300 mt-2 font-mono">
            {unverifiedCount}
          </div>
          <div className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{totalCandidates > 0 ? Math.round((unverifiedCount / totalCandidates) * 100) : 0}% Awaiting Link</span>
          </div>
        </div>

        {/* Verification Conversion Rate */}
        <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between text-indigo-300 text-[10px] font-mono uppercase font-bold">
            <span>Activation Rate</span>
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-indigo-300 mt-2 font-mono">
            {verificationRate}%
          </div>
          <div className="text-[10px] text-indigo-400 mt-1">
            Verification success ratio
          </div>
        </div>

      </div>

      {/* Verification Visual Progress Bar */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 relative z-10">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-gray-300 uppercase font-mono text-[11px] tracking-wider">
            Verification Impact Split
          </span>
          <span className="font-mono text-gray-400 text-[11px]">
            <strong className="text-emerald-400">{verifiedCount} Verified</strong> / <strong className="text-amber-400">{unverifiedCount} Unverified</strong>
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-3.5 bg-neutral-900 rounded-full overflow-hidden flex p-0.5 border border-white/10 shadow-inner">
          <div 
            style={{ width: `${totalCandidates > 0 ? (verifiedCount / totalCandidates) * 100 : 0}%` }}
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-500 relative group"
            title={`Verified: ${verifiedCount}`}
          />
          <div 
            style={{ width: `${totalCandidates > 0 ? (unverifiedCount / totalCandidates) * 100 : 0}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full transition-all duration-500 relative group"
            title={`Pending Verification: ${unverifiedCount}`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-gray-300">
          <div className="flex items-start gap-2 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0"></span>
            <div>
              <span className="font-bold text-emerald-300">Verified Candidates ({verifiedCount}):</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Full access granted. Candidates can customize profile, upload ATS resumes, and apply directly to job postings.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-0.5 shrink-0"></span>
            <div>
              <span className="font-bold text-amber-300">Unverified Candidates ({unverifiedCount}):</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Gated on Verification Screen. Realtime polling automatically unlocks dashboard upon email verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Inspector Button */}
      <div className="pt-1 flex justify-between items-center relative z-10">
        <button
          onClick={() => setShowUnverifiedList(!showUnverifiedList)}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>{showUnverifiedList ? "Hide Unverified Candidates" : `Inspect Unverified Candidates (${unverifiedCount})`}</span>
          {showUnverifiedList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {unverifiedCount > 0 && !showUnverifiedList && (
          <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{unverifiedCount} candidate{unverifiedCount > 1 ? "s" : ""} pending verification link click</span>
          </span>
        )}
      </div>

      {/* Expandable Unverified Candidate Roster */}
      {showUnverifiedList && (
        <div className="p-4 bg-neutral-950/70 border border-amber-500/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/10 pb-3">
            <div>
              <h4 className="text-xs font-bold text-amber-300 font-mono uppercase flex items-center gap-2">
                <MailWarning className="w-4 h-4 text-amber-400" />
                <span>Unverified Candidate Accounts Roster</span>
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Accounts waiting for Firebase email verification confirmation.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name or email..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {filteredUnverified.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
              <p className="text-xs text-gray-300 font-semibold">
                {unverifiedCandidates.length === 0 
                  ? "All candidate accounts are verified! 100% verification rate." 
                  : "No unverified candidates match search parameters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase font-mono bg-white/[0.02]">
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Registration Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUnverified.slice(0, 10).map((cand, idx) => {
                    const cName = cand.displayName || cand.name || "Candidate User";
                    const cEmail = cand.email || "N/A";
                    const regDate = cand.createdAt 
                      ? (typeof cand.createdAt === "string" ? cand.createdAt.split("T")[0] : "Recent")
                      : "Recent";

                    return (
                      <tr key={cand.uid || idx} className="hover:bg-white/[0.02] transition-all">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {cName}
                        </td>
                        <td className="py-2.5 px-3 text-gray-300 font-mono text-[11px]">
                          {cEmail}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 font-mono text-[11px]">
                          {regDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1 w-fit">
                            <Clock className="w-2.5 h-2.5" />
                            Pending Verification
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyEmail(cEmail)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer text-[10px] flex items-center gap-1"
                              title="Copy Candidate Email"
                            >
                              {copiedEmail === cEmail ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>

                            <button
                              onClick={() => handleSimulateResend(cEmail)}
                              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-lg transition-all cursor-pointer text-[10px] font-bold flex items-center gap-1"
                              title="Send Reminder Alert"
                            >
                              <MailCheck className="w-3 h-3" />
                              <span>Remind</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredUnverified.length > 10 && (
                <p className="text-[10px] text-gray-400 font-mono text-center pt-3">
                  Showing top 10 of {filteredUnverified.length} unverified candidates. View full list in User Management.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
