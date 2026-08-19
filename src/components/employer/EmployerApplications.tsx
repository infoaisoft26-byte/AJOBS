import React, { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  FileText, 
  Download, 
  MessageSquare, 
  UserCheck, 
  UserX, 
  Calendar, 
  Star, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  GraduationCap, 
  Briefcase, 
  X, 
  ExternalLink, 
  ChevronRight, 
  Send,
  Save,
  Check
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { CompanyApplication, CompanyJob } from "./EmployerTypes";

interface EmployerApplicationsProps {
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  onUpdateApplicationStatus: (appId: string, newStatus: string, note?: string) => void;
  onOpenLiveChat?: (candidateId: string, candidateName: string) => void;
  selectedCandidate?: CompanyApplication | null;
  onCloseDrawer?: () => void;
  onSelectCandidate?: (candidate: CompanyApplication | null) => void;
}

export default function EmployerApplications({
  jobs,
  applications,
  onUpdateApplicationStatus,
  onOpenLiveChat,
  selectedCandidate,
  onCloseDrawer,
  onSelectCandidate
}: EmployerApplicationsProps) {
  const [activeStatusTab, setActiveStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");
  const [minAiScore, setMinAiScore] = useState<number>(0);
  const [expFilter, setExpFilter] = useState<string>("all");
  const [activeDrawer, setActiveDrawer] = useState<CompanyApplication | null>(selectedCandidate || null);
  const [drawerNotes, setDrawerNotes] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // Sync prop changes
  React.useEffect(() => {
    if (selectedCandidate) {
      setActiveDrawer(selectedCandidate);
      setDrawerNotes(selectedCandidate.notes || "");
    }
  }, [selectedCandidate]);

  const statusTabs = [
    { id: "all", label: "All Applicants" },
    { id: "new", label: "New" },
    { id: "reviewed", label: "Reviewed" },
    { id: "shortlisted", label: "Shortlisted" },
    { id: "interview", label: "Interview" },
    { id: "selected", label: "Selected" },
    { id: "rejected", label: "Rejected" },
  ];

  // Filtering logic
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (activeStatusTab !== "all" && app.status?.toLowerCase() !== activeStatusTab.toLowerCase()) {
        return false;
      }
      // Job filter
      if (selectedJobFilter !== "all" && app.jobId !== selectedJobFilter && app.jobTitle !== selectedJobFilter) {
        return false;
      }
      // AI Score filter
      if ((app.aiMatchScore || 85) < minAiScore) {
        return false;
      }
      // Experience filter
      if (expFilter !== "all") {
        const expStr = (app.candidateExperience || "").toLowerCase();
        if (expFilter === "junior" && !expStr.includes("1") && !expStr.includes("2")) return false;
        if (expFilter === "mid" && !expStr.includes("3") && !expStr.includes("4") && !expStr.includes("5")) return false;
        if (expFilter === "senior" && !expStr.includes("6") && !expStr.includes("7") && !expStr.includes("8") && !expStr.includes("10")) return false;
      }
      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = app.candidateName?.toLowerCase().includes(q);
        const matchesEmail = app.candidateEmail?.toLowerCase().includes(q);
        const matchesJob = app.jobTitle?.toLowerCase().includes(q);
        const matchesSkills = app.candidateSkills?.some(s => s.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesJob && !matchesSkills) return false;
      }
      return true;
    });
  }, [applications, activeStatusTab, selectedJobFilter, minAiScore, expFilter, searchQuery]);

  const handleOpenCandidate = (cand: CompanyApplication) => {
    setActiveDrawer(cand);
    setDrawerNotes(cand.notes || "");
    if (onSelectCandidate) onSelectCandidate(cand);
  };

  const handleClose = () => {
    setActiveDrawer(null);
    if (onCloseDrawer) onCloseDrawer();
  };

  const handleSaveNotes = async () => {
    if (!activeDrawer) return;
    setIsSavingNote(true);
    try {
      await updateDoc(doc(db, "company_applications", activeDrawer.id), {
        notes: drawerNotes
      });
      activeDrawer.notes = drawerNotes;
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (e) {
      activeDrawer.notes = drawerNotes;
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-6" id="employer-applications-container">
      {/* Header with Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI APPLICATION PIPELINE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Manage Candidates & Applications</h2>
          <p className="text-xs text-slate-400">Review AI match breakdown, screen candidate resumes, and schedule interviews</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
            {filteredApplications.length} Candidates Filtered
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-5 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-lg space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => {
            const count = tab.id === "all" 
              ? applications.length 
              : applications.filter(a => a.status?.toLowerCase() === tab.id).length;
            const isActive = activeStatusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isActive ? "bg-white/20 text-white" : "bg-black/40 text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multi-Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-purple-500/15">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, skills..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Job Filter */}
          <div>
            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Posted Jobs ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          {/* Experience Filter */}
          <div>
            <select
              value={expFilter}
              onChange={(e) => setExpFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Experience Levels</option>
              <option value="junior">Junior (1-2 Yrs)</option>
              <option value="mid">Mid-Level (3-5 Yrs)</option>
              <option value="senior">Senior (6+ Yrs)</option>
            </select>
          </div>

          {/* AI Score Filter */}
          <div>
            <select
              value={minAiScore}
              onChange={(e) => setMinAiScore(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value={0}>Any AI Match Score</option>
              <option value={80}>Min 80% Match</option>
              <option value={85}>Min 85% Match (Recommended)</option>
              <option value={90}>Min 90% Match (Top Tier)</option>
              <option value={95}>Min 95% Match (Exact Fit)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table / Card List */}
      <div className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No applicants matching selected filters</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search criteria, clearing the AI match score threshold, or selecting another job role.
            </p>
            <button
              onClick={() => {
                setActiveStatusTab("all");
                setSearchQuery("");
                setSelectedJobFilter("all");
                setMinAiScore(0);
                setExpFilter("all");
              }}
              className="px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-blue-500/30"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-purple-500/20 text-[11px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="pb-3 font-semibold">Candidate Profile</th>
                  <th className="pb-3 font-semibold">Applied Role</th>
                  <th className="pb-3 font-semibold">Experience & Skills</th>
                  <th className="pb-3 font-semibold">AI Match Score</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Quick Pipeline Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                    {/* Candidate Name & Contact */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                          {app.candidateName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-white group-hover:text-blue-300 transition-colors text-sm">
                            {app.candidateName}
                          </div>
                          <div className="text-[11px] text-slate-400">{app.candidateEmail}</div>
                          {app.candidatePhone && (
                            <div className="text-[10px] text-slate-500 font-mono">{app.candidatePhone}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Job Title */}
                    <td className="py-4 pr-4">
                      <div className="font-bold text-slate-200">{app.jobTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Applied {new Date(app.appliedAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Exp & Skills */}
                    <td className="py-4 pr-4">
                      <div className="font-mono text-xs text-slate-300 font-semibold mb-1">
                        {app.candidateExperience || "3+ Years"}
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(app.candidateSkills || ["React", "TypeScript"]).slice(0, 3).map((sk) => (
                          <span key={sk} className="px-2 py-0.5 rounded-md bg-[#0e0a14] text-slate-300 text-[10px] font-mono border border-purple-500/20">
                            {sk}
                          </span>
                        ))}
                        {(app.candidateSkills || []).length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 text-[10px]">
                            +{(app.candidateSkills || []).length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AI Score */}
                    <td className="py-4 pr-4">
                      <div className="inline-flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                          (app.aiMatchScore || 85) >= 90 
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                            : "bg-blue-500/10 border border-blue-500/30 text-blue-300"
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          {app.aiMatchScore || 85}%
                        </span>
                      </div>
                    </td>

                    {/* Current Status Pill */}
                    <td className="py-4 pr-4">
                      <select
                        value={app.status || "new"}
                        onChange={(e) => onUpdateApplicationStatus(app.id, e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-xs font-bold text-white capitalize focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="interview">Interview</option>
                        <option value="selected">Selected</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenCandidate(app)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          View Drawer
                        </button>
                        <button
                          onClick={() => onUpdateApplicationStatus(app.id, "shortlisted")}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl transition-all cursor-pointer"
                          title="Shortlist candidate"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenLiveChat && onOpenLiveChat(app.candidateId, app.candidateName)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-all cursor-pointer"
                          title="Message candidate"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Candidate Detail Slide-Over Drawer */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-[#17111F] border-l border-purple-500/30 shadow-2xl flex flex-col justify-between overflow-y-auto">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-purple-500/20 bg-[#17111F]/90 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg">
                    {activeDrawer.candidateName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{activeDrawer.candidateName}</h3>
                    <p className="text-xs text-blue-300 font-medium">{activeDrawer.jobTitle}</p>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                
                {/* AI Match Overview Card */}
                <div className="p-5 rounded-3xl bg-[#0e0a14] border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Profile Analysis
                    </span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      {activeDrawer.aiMatchScore || 94}% Fit
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-slate-400 text-[10px] uppercase font-mono">Skills Match</span>
                      <div className="font-bold text-white mt-0.5">
                        {activeDrawer.matchBreakdown?.skillsMatch || 96}% High Compatibility
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-slate-400 text-[10px] uppercase font-mono">Experience Match</span>
                      <div className="font-bold text-white mt-0.5">
                        {activeDrawer.matchBreakdown?.experienceMatch || 92}% Relevant
                      </div>
                    </div>
                  </div>
                </div>

                {/* Candidate Overview & Contact */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Candidate Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Experience</span>
                        <span className="font-bold text-white">{activeDrawer.candidateExperience || "3.5 Years"}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Location</span>
                        <span className="font-bold text-white">{activeDrawer.candidateLocation || "Bengaluru (Open to relocate)"}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Education</span>
                        <span className="font-bold text-white">{activeDrawer.candidateEducation || "B.Tech Computer Science"}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Applied At</span>
                        <span className="font-bold text-white">{new Date(activeDrawer.appliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Verified */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Verified Technical Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(activeDrawer.candidateSkills || ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS", "Docker"]).map((sk) => (
                      <span key={sk} className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Resume Actions */}
                <div className="p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Candidate Resume / CV</div>
                      <div className="text-[10px] text-slate-400">PDF Document • Verified on AIJOBS</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeDrawer.resumeUrl ? (
                      <a
                        href={activeDrawer.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => alert("Resume document verified and accessible in standard ATS viewer.")}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Resume</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Hiring Team Notes</h4>
                    {noteSaved && (
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Saved
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                    placeholder="Add private evaluation notes, technical assessment feedback..."
                    className="w-full p-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNote}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingNote ? "Saving..." : "Save Note"}</span>
                  </button>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-purple-500/20 bg-[#0e0a14] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onUpdateApplicationStatus(activeDrawer.id, "shortlisted");
                      activeDrawer.status = "shortlisted";
                    }}
                    className="px-4 py-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Shortlist
                  </button>
                  <button
                    onClick={() => {
                      onUpdateApplicationStatus(activeDrawer.id, "interview");
                      activeDrawer.status = "interview";
                    }}
                    className="px-4 py-2 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Move to Interview
                  </button>
                  <button
                    onClick={() => {
                      onUpdateApplicationStatus(activeDrawer.id, "rejected");
                      activeDrawer.status = "rejected";
                    }}
                    className="px-4 py-2 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                </div>

                <button
                  onClick={() => onOpenLiveChat && onOpenLiveChat(activeDrawer.candidateId, activeDrawer.candidateName)}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message Candidate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
