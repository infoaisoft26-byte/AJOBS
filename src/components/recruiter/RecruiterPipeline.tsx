import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  MoveRight, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  MapPin, 
  ChevronDown,
  Building2,
  ExternalLink
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { PipelineCandidate, RecruiterJob } from "./RecruiterTypes";

interface RecruiterPipelineProps {
  candidates: PipelineCandidate[];
  assignedJobs: RecruiterJob[];
  onUpdateCandidateStage: (candidateId: string, newStage: PipelineCandidate["stage"]) => void;
  onOpenLiveChat?: (candidateId: string, candidateName: string) => void;
}

export default function RecruiterPipeline({
  candidates,
  assignedJobs,
  onUpdateCandidateStage,
  onOpenLiveChat
}: RecruiterPipelineProps) {
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const columns: { id: PipelineCandidate["stage"]; label: string; color: string; border: string }[] = [
    { id: "new_lead", label: "New Lead", color: "bg-cyan-500/10 text-cyan-300", border: "border-cyan-500/30" },
    { id: "contacted", label: "Contacted", color: "bg-blue-500/10 text-blue-300", border: "border-blue-500/30" },
    { id: "screened", label: "Screened", color: "bg-indigo-500/10 text-indigo-300", border: "border-indigo-500/30" },
    { id: "shortlisted", label: "Shortlisted", color: "bg-purple-500/10 text-purple-300", border: "border-purple-500/30" },
    { id: "interview", label: "Interview", color: "bg-amber-500/10 text-amber-300", border: "border-amber-500/30" },
    { id: "selected", label: "Selected", color: "bg-emerald-500/10 text-emerald-300", border: "border-emerald-500/30" },
    { id: "rejected", label: "Rejected", color: "bg-red-500/10 text-red-300", border: "border-red-500/30" },
  ];

  const filteredCandidates = candidates.filter((c) => {
    if (selectedJob !== "all" && c.jobId !== selectedJob && c.jobTitle !== selectedJob) {
      return false;
    }
    if (locationFilter !== "all" && !c.location.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchRole = c.role.toLowerCase().includes(q);
      const matchSkills = c.skills.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchRole && !matchSkills) return false;
    }
    return true;
  });

  const handleStageChange = async (candidateId: string, newStage: PipelineCandidate["stage"]) => {
    try {
      await updateDoc(doc(db, "company_applications", candidateId), {
        status: newStage,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {}

    onUpdateCandidateStage(candidateId, newStage);
  };

  return (
    <div className="space-y-6" id="recruiter-kanban-pipeline-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>INTERACTIVE KANBAN ATS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Candidate Pipeline Stages</h2>
          <p className="text-xs text-slate-400">Track candidates from initial contact through screening, interviews, and final placement</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
            {filteredCandidates.length} Candidates Active
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, skills..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="w-full px-3.5 py-2 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Assigned Mandates ({assignedJobs.length})</option>
            {assignedJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title} ({j.companyName})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Candidate Locations</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Pune">Pune</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Delhi">Delhi NCR</option>
          </select>
        </div>
      </div>

      {/* 7-Column Kanban Horizontal Board */}
      <div className="overflow-x-auto pb-4 pt-1 scrollbar-thin">
        <div className="flex gap-4 min-w-[1400px]">
          {columns.map((col) => {
            const colCandidates = filteredCandidates.filter(c => c.stage === col.id);
            return (
              <div
                key={col.id}
                className="w-72 shrink-0 rounded-3xl bg-[#17111F]/60 border border-purple-500/20 backdrop-blur-md p-3 flex flex-col h-[700px] shadow-xl"
              >
                {/* Column Header */}
                <div className={`p-3 rounded-2xl ${col.color} border ${col.border} flex items-center justify-between mb-3`}>
                  <span className="text-xs font-mono font-black uppercase tracking-wider">{col.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono font-bold">
                    {colCandidates.length}
                  </span>
                </div>

                {/* Candidate Cards Stream */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
                  {colCandidates.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs italic">
                      No candidates in this stage
                    </div>
                  ) : (
                    colCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="p-4 rounded-2xl bg-[#0e0a14] hover:bg-[#120d1a] border border-purple-500/20 hover:border-purple-500/40 shadow-md transition-all space-y-3 group"
                      >
                        {/* Top: Avatar & Name */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                              {cand.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {cand.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 block">{cand.role}</span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                            {cand.aiScore}%
                          </span>
                        </div>

                        {/* Mandate & Exp */}
                        <div className="text-[11px] space-y-1 text-slate-300">
                          <div className="flex items-center gap-1.5 text-blue-300 truncate">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{cand.jobTitle}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono">
                            <span>{cand.experience}</span>
                            <span>•</span>
                            <span>{cand.location}</span>
                          </div>
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1">
                          {cand.skills.slice(0, 3).map((sk) => (
                            <span key={sk} className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 text-[9px] font-mono">
                              {sk}
                            </span>
                          ))}
                        </div>

                        {/* Stage Dropdown & Action */}
                        <div className="pt-2 border-t border-purple-500/15 flex items-center justify-between gap-2">
                          <select
                            value={cand.stage}
                            onChange={(e) => handleStageChange(cand.id, e.target.value as PipelineCandidate["stage"])}
                            className="px-2 py-1 rounded-lg bg-black/50 border border-purple-500/30 text-[10px] font-bold text-white capitalize focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="new_lead">New Lead</option>
                            <option value="contacted">Contacted</option>
                            <option value="screened">Screened</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="interview">Interview</option>
                            <option value="selected">Selected</option>
                            <option value="rejected">Rejected</option>
                          </select>

                          <button
                            onClick={() => onOpenLiveChat && onOpenLiveChat(cand.id, cand.name)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Message Candidate"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
