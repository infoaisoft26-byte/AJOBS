import React, { useState } from "react";
import { 
  Briefcase, 
  Users, 
  Calendar, 
  Trophy, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight, 
  MessageSquare, 
  UserCheck, 
  IndianRupee,
  Building2,
  MapPin,
  Flame
} from "lucide-react";
import { RecruiterJob, PipelineCandidate, RecruiterTask } from "./RecruiterTypes";

interface RecruiterOverviewProps {
  userName: string;
  assignedJobs: RecruiterJob[];
  pipelineCandidates: PipelineCandidate[];
  onNavigateTab: (tabId: string) => void;
  onSelectCandidateForPipeline: (candidate: PipelineCandidate) => void;
  onOpenLiveChat?: (candidateId: string, candidateName: string) => void;
}

export default function RecruiterOverview({
  userName,
  assignedJobs,
  pipelineCandidates,
  onNavigateTab,
  onSelectCandidateForPipeline,
  onOpenLiveChat
}: RecruiterOverviewProps) {
  const [tasks, setTasks] = useState<RecruiterTask[]>([]);

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const statCards = [
    {
      title: "Assigned Jobs",
      value: assignedJobs.length,
      sub: "Active mandate openings",
      icon: Briefcase,
      color: "from-blue-600/20 to-blue-500/10",
      border: "border-blue-500/30",
      textColor: "text-blue-400"
    },
    {
      title: "Candidates in Pipeline",
      value: pipelineCandidates.length,
      sub: "Across all active stages",
      icon: Users,
      color: "from-purple-600/20 to-purple-500/10",
      border: "border-purple-500/30",
      textColor: "text-purple-400"
    },
    {
      title: "Interviews Scheduled",
      value: pipelineCandidates.filter(c => c.stage === "interview").length,
      sub: "From assigned applications",
      icon: Calendar,
      color: "from-cyan-600/20 to-cyan-500/10",
      border: "border-cyan-500/30",
      textColor: "text-cyan-400"
    },
    {
      title: "Selected Candidates",
      value: pipelineCandidates.filter(c => c.stage === "selected").length,
      sub: "Recorded in assigned pipeline",
      icon: Trophy,
      color: "from-emerald-600/20 to-emerald-500/10",
      border: "border-emerald-500/30",
      textColor: "text-emerald-400"
    }
  ];

  return (
    <div className="space-y-6" id="recruiter-overview-container">
      {/* Welcome Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#17111F] via-[#231830] to-[#17111F] border border-purple-500/20 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI RECRUITER WORKSPACE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your smarter hiring workspace. Manage assigned jobs, find qualified candidates and move them seamlessly through the hiring pipeline.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => onNavigateTab("pipeline")}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
          >
            <span>Open Kanban Pipeline</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigateTab("find-candidates")}
            className="px-5 py-2.5 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Find Sourced Candidates</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((st, i) => {
          const Icon = st.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-3xl bg-gradient-to-br ${st.color} border ${st.border} backdrop-blur-md shadow-lg space-y-2 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase font-semibold">{st.title}</span>
                <div className={`p-2 rounded-xl bg-black/30 ${st.textColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-white">{st.value}</div>
                <div className="text-[11px] text-slate-400">{st.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Jobs & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Priority Jobs (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-extrabold text-white">Priority Assigned Jobs</h2>
            </div>
            <button
              onClick={() => onNavigateTab("assigned-jobs")}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {assignedJobs.slice(0, 3).map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/20 hover:border-blue-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      {job.status || "Active"}
                    </span>
                    <span className="text-[11px] text-slate-400">{job.companyName}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>{job.location}</span>
                    <span>•</span>
                    <span className="text-emerald-400">{job.salary}</span>
                    <span>•</span>
                    <span className="text-blue-300">{job.openings} Openings</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigateTab("pipeline")}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    View Pipeline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Today's Tasks (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-extrabold text-white">Today's Recruiter Tasks</h2>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">
              {tasks.filter(t => t.completed).length}/{tasks.length} Completed
            </span>
          </div>

          <div className="space-y-2.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                  task.completed 
                    ? "bg-white/5 border-white/5 text-slate-500 opacity-60" 
                    : "bg-[#0e0a14] border-purple-500/20 hover:border-purple-500/40 text-slate-200"
                }`}
              >
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                  task.completed ? "bg-emerald-500 border-emerald-500 text-slate-950" : "border-purple-500/40"
                }`}>
                  {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-tight ${task.completed ? "line-through" : "text-white"}`}>
                    {task.title}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">Due {task.dueDate}</span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-xs text-slate-500 p-3">No recruiter tasks have been assigned.</p>}
          </div>
        </div>
      </div>

      {/* AI Recommendations & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* AI Recommendations Card (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-gradient-to-br from-[#1b1226] to-[#120d1a] border border-cyan-500/30 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI SMART MATCHES TO CONTACT TODAY</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Only candidates with a saved AI evaluation score are shown here:
          </p>

          <div className="space-y-2.5">
            {pipelineCandidates.filter(cand => typeof cand.aiScore === "number").slice(0, 2).map((cand) => (
              <div
                key={cand.id}
                className="p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                    {(cand.name || "Candidate").charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{cand.name || "Candidate"}</h4>
                    <span className="text-[10px] text-blue-300">{cand.role}</span>
                    <div className="text-[10px] text-slate-400">{cand.experience} • {cand.location}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    {typeof cand.aiScore === "number" ? `${cand.aiScore}% Match` : "Not evaluated"}
                  </span>
                  <button
                    onClick={() => onOpenLiveChat && onOpenLiveChat(cand.candidateId || cand.id, cand.name || "Candidate")}
                    className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 transition-all cursor-pointer"
                    title="Send Outreach"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {pipelineCandidates.filter(cand => typeof cand.aiScore === "number").length === 0 && <p className="text-xs text-slate-500 p-3">No saved AI match evaluations yet.</p>}
          </div>
        </div>

        {/* Recent Candidate Activity Timeline (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Recent Candidate Activity</span>
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {pipelineCandidates.slice(0, 5).map((cand) => (
              <div key={cand.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-bold">{cand.name} · {cand.stage.replace("_", " ")}</p>
                  <p className="text-[11px] text-slate-400">{cand.jobTitle} · {cand.companyName}</p>
                  <span className="text-[10px] text-slate-500 font-mono">{cand.lastActivity}</span>
                </div>
              </div>
            ))}
            {pipelineCandidates.length === 0 && <p className="text-xs text-slate-500 p-3">No recruiter-assigned candidate activity yet.</p>}
          </div></div>
        </div>
      </div>
    </div>
  );
}
