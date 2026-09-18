import React from "react";
import { 
  CreditCard, 
  Briefcase, 
  Users, 
  Sparkles, 
  PhoneCall, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  FileText,
  PlusCircle
} from "lucide-react";
import { CreditBalance, CreditUsageLog } from "./HiringTypes";

interface CreditsUsageViewProps {
  credits: CreditBalance;
  usageHistory: CreditUsageLog[];
  onNavigateTab: (tabId: string) => void;
}

export default function CreditsUsageView({
  credits,
  usageHistory,
  onNavigateTab
}: CreditsUsageViewProps) {

  const creditCards = [
    {
      id: "job",
      title: "Job Posting Credits",
      icon: Briefcase,
      remaining: credits.jobCredits,
      used: credits.jobCreditsUsed,
      total: credits.jobCredits + credits.jobCreditsUsed,
      color: "blue",
      validity: credits.validityDate,
      unit: "Jobs"
    },
    {
      id: "database",
      title: "Candidate DB Unlocks",
      icon: Users,
      remaining: credits.databaseCredits,
      used: credits.databaseCreditsUsed,
      total: credits.databaseCredits + credits.databaseCreditsUsed,
      color: "cyan",
      validity: credits.validityDate,
      unit: "Unlocks"
    },
    {
      id: "ai",
      title: "Gemini AI Query Credits",
      icon: Sparkles,
      remaining: credits.aiCredits,
      used: credits.aiCreditsUsed,
      total: credits.aiCredits + credits.aiCreditsUsed,
      color: "purple",
      validity: "Permanent",
      unit: "Prompts"
    },
    {
      id: "calling",
      title: "AI Voice Calling Minutes",
      icon: PhoneCall,
      remaining: credits.callingCredits,
      used: credits.callingCreditsUsed,
      total: credits.callingCredits + credits.callingCreditsUsed,
      color: "emerald",
      validity: credits.validityDate,
      unit: "Minutes"
    }
  ];

  return (
    <div className="space-y-6" id="credits-usage-view">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
            <span>CREDIT QUOTA & ACCOUNTING</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Credits & Usage Telemetry</h2>
          <p className="text-xs text-slate-400">Audit credit consumption, remaining balances, and line-item transaction ledgers</p>
        </div>

        <button
          onClick={() => onNavigateTab("billing")}
          className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>Purchase / Add Credits</span>
        </button>
      </div>

      {/* Credit Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {creditCards.map((card) => {
          const IconComp = card.icon;
          const pctUsed = card.total > 0 ? Math.min(100, Math.round((card.used / card.total) * 100)) : 0;

          return (
            <div 
              key={card.id}
              className="p-5 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-slate-400">
                  {card.title}
                </span>
                <div className="p-2 rounded-xl bg-white/5 text-cyan-400">
                  <IconComp className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl font-black text-white">
                  {card.remaining} <span className="text-xs font-normal text-slate-400 font-mono">{card.unit}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {card.used} consumed of {card.total} allocated
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                    style={{ width: `${100 - pctUsed}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>{100 - pctUsed}% Available</span>
                  <span>Expires: {card.validity}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage History Table */}
      <div className="p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white">Credit Usage History</h3>
            <p className="text-xs text-slate-400">Granular audit log of all profile unlocks, job posts, and AI invocations</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{usageHistory.length} Transactions</span>
        </div>

        {usageHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No credit usage records logged in current billing cycle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Activity Description</th>
                  <th className="py-3 px-3">Target Candidate / Job</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-center">Credits Used</th>
                  <th className="py-3 px-3">Recruiter</th>
                  <th className="py-3 px-3 text-right">Reference ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usageHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{item.date}</td>
                    <td className="py-3 px-3 font-bold text-white">{item.activity}</td>
                    <td className="py-3 px-3 text-cyan-300 font-mono">{item.item}</td>
                    <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                      -{item.creditsUsed}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{item.recruiter}</td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-[10px]">{item.refId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
