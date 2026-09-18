import React, { useState } from "react";
import { 
  PhoneCall, 
  PhoneForwarded, 
  PhoneIncoming, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Play, 
  Calendar,
  MessageSquare,
  ShieldCheck,
  PlusCircle,
  Volume2
} from "lucide-react";
import { CallingLog } from "./HiringTypes";
import { CompanyJob } from "../employer/EmployerTypes";

interface AiCallingAgentViewProps {
  jobs: CompanyJob[];
  onScheduleCall?: (candidateName: string, phone: string, jobTitle: string) => void;
  onOpenLiveChat?: (candidateId: string, candidateName: string) => void;
}

export default function AiCallingAgentView({
  jobs,
  onScheduleCall,
  onOpenLiveChat
}: AiCallingAgentViewProps) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newCandName, setNewCandName] = useState("");
  const [newCandPhone, setNewCandPhone] = useState("");
  const [newJobTitle, setNewJobTitle] = useState(jobs[0]?.title || "Senior React Engineer");

  const [calls, setCalls] = useState<CallingLog[]>([
    {
      id: "call_1",
      candidateName: "Aarav Sharma",
      candidatePhone: "+91 98765 43210",
      jobTitle: "Senior React & TypeScript Engineer",
      callStatus: "completed",
      aiFit: "strong_match",
      screeningSummary: "Confirmed 5.5 yrs total exp, 4 yrs in React/Next.js. Current CTC ₹18 LPA, Expected ₹24 LPA. Notice period 15 days. Expressed strong interest in micro-frontends.",
      duration: "4m 12s",
      timestamp: "Today, 11:30 AM"
    },
    {
      id: "call_2",
      candidateName: "Sneha Deshmukh",
      candidatePhone: "+91 98123 45678",
      jobTitle: "Senior Frontend Engineer",
      callStatus: "completed",
      aiFit: "strong_match",
      screeningSummary: "Demonstrated thorough knowledge of React performance optimization. Available to join immediately. Comfortable with hybrid Bengaluru schedule.",
      duration: "3m 45s",
      timestamp: "Today, 10:15 AM"
    },
    {
      id: "call_3",
      candidateName: "Aditya Verma",
      candidatePhone: "+91 97654 32109",
      jobTitle: "Backend Node.js Engineer",
      callStatus: "scheduled",
      aiFit: "potential",
      screeningSummary: "Automated AI screening call scheduled for today at 3:00 PM IST.",
      duration: "--",
      timestamp: "Today, 03:00 PM"
    },
    {
      id: "call_4",
      candidateName: "Karan Johar",
      candidatePhone: "+91 91234 56789",
      jobTitle: "DevOps & Cloud Engineer",
      callStatus: "unreachable",
      aiFit: "potential",
      screeningSummary: "Candidate phone was busy on first two attempts. AI calling agent has scheduled automated retry in 2 hours.",
      duration: "--",
      timestamp: "Yesterday, 04:20 PM"
    }
  ]);

  const handleAddNewCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName || !newCandPhone) return;

    const newCallItem: CallingLog = {
      id: "call_" + Date.now(),
      candidateName: newCandName,
      candidatePhone: newCandPhone,
      jobTitle: newJobTitle,
      callStatus: "scheduled",
      aiFit: "potential",
      screeningSummary: "Automated screening call queued in AI telephony gateway.",
      duration: "--",
      timestamp: "Just now"
    };

    setCalls([newCallItem, ...calls]);
    setShowScheduleModal(false);
    setNewCandName("");
    setNewCandPhone("");
  };

  const filteredCalls = calls.filter((c) => {
    if (filterStatus !== "all" && c.callStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6" id="ai-calling-agent-view">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI RECRUITER TELEPHONY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">AI Calling Agent</h2>
          <p className="text-xs text-slate-400">Autonomous voice screening calls for applicant availability, CTC, and qualifications</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Queue Screening Call</span>
          </button>
        </div>
      </div>

      {/* Telephony Gateway Status Banner */}
      <div className="p-4 rounded-3xl bg-blue-950/20 border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">Voice Agent Gateway Online</span>
          <span className="text-slate-400 hidden sm:inline">• Automated Indian accent speech synthesis active</span>
        </div>
        <div className="text-[11px] font-mono text-cyan-300">
          Available Calling Credits: <strong>120 Mins</strong>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["all", "completed", "scheduled", "in_progress", "unreachable"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              filterStatus === st
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {st.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Calling Logs Table / Cards */}
      <div className="space-y-3">
        {filteredCalls.map((call) => (
          <div
            key={call.id}
            className="p-5 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 hover:border-cyan-500/30 transition-all space-y-3 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white">{call.candidateName}</span>
                  <span className="text-xs font-mono text-slate-400">{call.candidatePhone}</span>

                  {/* Call Status Badge */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    call.callStatus === "completed"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : call.callStatus === "scheduled"
                      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                      : call.callStatus === "in_progress"
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}>
                    {call.callStatus}
                  </span>

                  {/* AI Fit */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    call.aiFit === "strong_match"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : call.aiFit === "potential"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}>
                    {call.aiFit.replace("_", " ")}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-300">{call.jobTitle}</div>
                <div className="text-[11px] text-slate-500 font-mono">{call.timestamp} • Duration: {call.duration}</div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {call.callStatus === "completed" && (
                  <button
                    onClick={() => {
                      if (onOpenLiveChat) {
                        onOpenLiveChat(call.id, call.candidateName);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                )}
                {call.callStatus === "unreachable" && (
                  <button
                    onClick={() => {
                      setCalls(calls.map(c => c.id === call.id ? { ...c, callStatus: "scheduled", timestamp: "Queued for retry" } : c));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-bold cursor-pointer"
                  >
                    Retry Call
                  </button>
                )}
              </div>
            </div>

            {/* Screening Summary Box */}
            <div className="p-3.5 rounded-2xl bg-[#0e0a14] border border-white/5 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Screening Synthesis</span>
              </span>
              <p className="leading-relaxed">{call.screeningSummary}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Call Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#17111F] border border-cyan-500/30 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Queue AI Voice Screening Call</h3>
            <form onSubmit={handleAddNewCall} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Candidate Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  placeholder="e.g. Varun Kapoor"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number with Country Code *</label>
                <input
                  type="text"
                  required
                  value={newCandPhone}
                  onChange={(e) => setNewCandPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Job Requisition</label>
                <select
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.title}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
                >
                  Confirm & Initiate Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
