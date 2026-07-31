import {
  Check,
  Code,
  Copy,
  Gift,
  Link,
  Share2,
  Sparkles,
  User,
  Users
} from "lucide-react";
import { useState } from "react";


export default function ReferralEcosystem() {
  const [copied, setCopied] = useState(false);
  const referralCode = "AIJOBS-REF-77291";
  const referralLink = `https://aijobs.app/invite?code=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referralLogs = [
    { id: "ref-1", name: "David Chen", email: "david.c@tech.io", role: "Candidate", status: "HIRED", reward: "$250.00", date: "2026-07-24" },
    { id: "ref-2", name: "Sarah Jenkins", email: "sarah.j@corp.com", role: "Recruiter", status: "ONBOARDED", reward: "$100.00", date: "2026-07-22" },
    { id: "ref-3", name: "Michael Vance", email: "m.vance@cloud.net", role: "Candidate", status: "INTERVIEWING", reward: "Pending ($250)", date: "2026-07-20" }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-black border border-emerald-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold mb-3">
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span>MODULE 7 — REFERRAL & REWARD ECOSYSTEM</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Viral Candidate & Recruiter Referral Hub</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Earn $250 for every hired candidate and $100 for every onboarded recruiter referred using your unique referral code.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono">
            <div>
              <span className="text-gray-400 block text-[10px]">TOTAL EARNED</span>
              <span className="text-emerald-400 font-extrabold text-lg">$350.00</span>
            </div>
            <div className="border-l border-white/10 pl-3">
              <span className="text-gray-400 block text-[10px]">PENDING REWARDS</span>
              <span className="text-amber-400 font-extrabold text-lg">$250.00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Referral Link & QR Code */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 space-y-5 shadow-xl">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Your Personal Referral Link</span>
          </h3>

          <div className="space-y-2">
            <label className="text-[11px] font-mono text-gray-400">Referral Code:</label>
            <div className="p-3 bg-black/60 border border-white/10 rounded-xl text-xs font-mono font-bold text-emerald-400 flex items-center justify-between">
              <span>{referralCode}</span>
              <QrCode className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono text-gray-400">Invite URL:</label>
            <div className="p-2.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono text-gray-300 flex items-center justify-between overflow-hidden">
              <span className="truncate pr-2">{referralLink}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Referral Tracking Table */}
        <div className="lg:col-span-2 bg-neutral-900/90 border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Referred Network & Payouts</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/60 text-gray-400 border-b border-white/10 uppercase">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reward</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {referralLogs.map(row => (
                  <tr key={row.id} className="hover:bg-white/5 text-gray-200">
                    <td className="p-3 font-bold text-white">{row.name}</td>
                    <td className="p-3 text-gray-400">{row.role}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.status === "HIRED" || row.status === "ONBOARDED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-400">{row.reward}</td>
                    <td className="p-3 text-gray-400">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
