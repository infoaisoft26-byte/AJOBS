import React from "react";
import { 
  IndianRupee, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Share2, 
  Sparkles, 
  Copy,
  Trophy,
  ArrowUpRight
} from "lucide-react";

export default function RecruiterEarnings() {
  const referralLink = `${window.location.origin}/signup?ref=recruiter_pro_partner`;

  return (
    <div className="space-y-6" id="recruiter-earnings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            <span>PAYOUT & REWARD METRICS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Recruiter Placement Earnings</h2>
          <p className="text-xs text-slate-400">Track successful candidate hirings, commission disbursements, and partner referral incentives</p>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 shadow-lg space-y-2">
          <span className="text-xs font-mono text-emerald-300 uppercase font-semibold">Total Earned (YTD)</span>
          <div className="text-3xl font-black text-white">₹5,40,000</div>
          <span className="text-xs text-slate-400">12 Total verified candidate placements</span>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600/20 to-blue-500/10 border border-blue-500/30 shadow-lg space-y-2">
          <span className="text-xs font-mono text-blue-300 uppercase font-semibold">Pending Processing</span>
          <div className="text-3xl font-black text-white">₹90,000</div>
          <span className="text-xs text-slate-400">2 Placements in probation verification</span>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-600/20 to-purple-500/10 border border-purple-500/30 shadow-lg space-y-2">
          <span className="text-xs font-mono text-purple-300 uppercase font-semibold">Referral Commission</span>
          <div className="text-3xl font-black text-white">₹35,000</div>
          <span className="text-xs text-slate-400">From 7 referred active recruiters</span>
        </div>
      </div>

      {/* Partner Referral Box */}
      <div className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" />
          <span>Your Partner Referral Link</span>
        </h3>
        <p className="text-xs text-slate-300">
          Earn 10% bonus commission on all placements completed by recruiters joining through your unique invitation link.
        </p>

        <div className="flex items-center gap-2 max-w-xl">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-cyan-300 text-xs font-mono select-all focus:outline-none"
          />
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(referralLink);
                alert("Referral link copied to clipboard!");
              }
            }}
            className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-600/20 shrink-0"
          >
            <Copy className="w-4 h-4 text-slate-950" />
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
