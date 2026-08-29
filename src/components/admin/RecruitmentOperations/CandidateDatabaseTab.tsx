import React, { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  UserCheck, 
  FileText, 
  Sparkles, 
  Download, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink,
  SlidersHorizontal
} from "lucide-react";
import { RecruitmentCandidate, RecruitmentJob, RecruiterUser } from "../../../types/recruitment";
import { exportCandidatesToExcel, createCandidate } from "../../../services/recruitmentService";

interface CandidateDatabaseTabProps {
  candidates?: RecruitmentCandidate[];
  recruiters?: RecruiterUser[];
  jobs?: RecruitmentJob[];
  onOpenCandidateProfile: (candidate: RecruitmentCandidate) => void;
  onOpenAssignModal: (candidates: RecruitmentCandidate[]) => void;
  onFindMatchesForCandidate: (candidate: RecruitmentCandidate) => void;
  onRefresh: () => void;
  adminUser?: { name: string; email: string };
}

export default function CandidateDatabaseTab({
  candidates = [],
  recruiters = [],
  jobs = [],
  onOpenCandidateProfile,
  onOpenAssignModal,
  onFindMatchesForCandidate,
  onRefresh,
  adminUser
}: CandidateDatabaseTabProps) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  const safeRecruiters = Array.isArray(recruiters) ? recruiters : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [expFilter, setExpFilter] = useState("ALL");
  const [verificationFilter, setVerificationFilter] = useState("ALL");
  const [resumeFilter, setResumeFilter] = useState("ALL");
  const [recruiterFilter, setRecruiterFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // Multi-selection state
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "Bengaluru",
    targetRole: "Software Engineer",
    totalExperienceYears: 3,
    highestQualification: "Bachelor's Degree",
    keySkills: "React, TypeScript, Node.js",
    currentCompany: "",
    currentCtc: "",
    expectedCtc: ""
  });
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");

  // Filtering calculation
  const filteredCandidates = useMemo(() => {
    return safeCandidates.filter((c) => {
      const term = searchTerm.toLowerCase().trim();
      const skillsStr = (c.keySkills || c.skills || []).join(" ").toLowerCase();
      const matchesSearch = 
        !term ||
        (c.candidateId && c.candidateId.toLowerCase().includes(term)) ||
        (c.fullName && c.fullName.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.targetRole && c.targetRole.toLowerCase().includes(term)) ||
        (c.location && c.location.toLowerCase().includes(term)) ||
        skillsStr.includes(term);

      // Experience filter
      const exp = c.totalExperienceYears || 0;
      let matchesExp = true;
      if (expFilter === "0_1") matchesExp = exp < 1;
      else if (expFilter === "1_3") matchesExp = exp >= 1 && exp <= 3;
      else if (expFilter === "3_6") matchesExp = exp > 3 && exp <= 6;
      else if (expFilter === "6_plus") matchesExp = exp > 6;

      // Verification filter
      const matchesVerif = 
        verificationFilter === "ALL" ||
        (verificationFilter === "VERIFIED" && (c.emailVerified || c.verificationStatus === "verified")) ||
        (verificationFilter === "PENDING" && !c.emailVerified && c.verificationStatus !== "verified");

      // Resume filter
      const matchesResume = 
        resumeFilter === "ALL" ||
        (resumeFilter === "WITH_RESUME" && Boolean(c.resumeUrl)) ||
        (resumeFilter === "NO_RESUME" && !c.resumeUrl);

      // Recruiter assigned filter
      const matchesRecruiter = 
        recruiterFilter === "ALL" ||
        (recruiterFilter === "ASSIGNED" && Boolean(c.assignedRecruiterId || c.assignedConsultancyId)) ||
        (recruiterFilter === "UNASSIGNED" && !c.assignedRecruiterId && !c.assignedConsultancyId) ||
        c.assignedRecruiterId === recruiterFilter || c.assignedConsultancyId === recruiterFilter;

      // Source filter
      const matchesSource = 
        sourceFilter === "ALL" || 
        c.source === sourceFilter;

      return matchesSearch && matchesExp && matchesVerif && matchesResume && matchesRecruiter && matchesSource;
    });
  }, [candidates, searchTerm, expFilter, verificationFilter, resumeFilter, recruiterFilter, sourceFilter]);

  // Select all / deselect
  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.length === filteredCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(filteredCandidates.map((c) => c.id));
    }
  };

  const handleToggleCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Recruiter Assignment Trigger
  const handleBulkAssign = () => {
    const selectedList = candidates.filter((c) => selectedCandidateIds.includes(c.id));
    if (selectedList.length === 0) return;
    onOpenAssignModal(selectedList);
  };

  // Manual Candidate Creation
  const handleCreateManualCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.fullName.trim() || !manualForm.email.trim()) return;

    setIsCreatingManual(true);
    try {
      const skillsArray = manualForm.keySkills.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
      await createCandidate({
        fullName: manualForm.fullName.trim(),
        email: manualForm.email.trim(),
        phone: manualForm.phone.trim(),
        city: manualForm.city,
        location: `${manualForm.city}, India`,
        targetRole: manualForm.targetRole,
        totalExperienceYears: Number(manualForm.totalExperienceYears),
        highestQualification: manualForm.highestQualification,
        keySkills: skillsArray,
        currentCompany: manualForm.currentCompany,
        currentCtc: manualForm.currentCtc,
        expectedCtc: manualForm.expectedCtc,
        emailVerified: true,
        verificationStatus: "verified",
        accountStatus: "active",
        profileStatus: "incomplete",
        profileCompletion: 40,
        source: "Admin Manual"
      }, adminUser);

      setNoticeMessage(`Candidate created successfully with next sequential AIJ-CAN ID.`);
      setTimeout(() => setNoticeMessage(""), 3500);
      setIsManualModalOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error("Manual candidate creation failure:", err);
    } finally {
      setIsCreatingManual(false);
    }
  };

  const sourcesList = Array.from(new Set(candidates.map((c) => c.source).filter(Boolean)));

  return (
    <div className="space-y-5">
      {/* Top Console Controls */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Central Candidate Database</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {filteredCandidates.length} of {candidates.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Master repository of verified candidates with unique sequential IDs (<span className="text-blue-400 font-mono">AIJ-CAN-XXXXXX</span>).</p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {selectedCandidateIds.length > 0 && (
            <button
              onClick={handleBulkAssign}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Assign Selected ({selectedCandidateIds.length})</span>
            </button>
          )}

          <button
            onClick={() => exportCandidatesToExcel(filteredCandidates)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {noticeMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Multi-Dimensional Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate ID, name, email, skill..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Experience Filter */}
        <div>
          <select
            value={expFilter}
            onChange={(e) => setExpFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Experience Levels</option>
            <option value="0_1">Fresher / &lt; 1 Year</option>
            <option value="1_3">1 - 3 Years</option>
            <option value="3_6">3 - 6 Years (Mid)</option>
            <option value="6_plus">6+ Years (Senior)</option>
          </select>
        </div>

        {/* Verification Filter */}
        <div>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="VERIFIED">✅ Email / KYC Verified</option>
            <option value="PENDING">⏳ Pending Verification</option>
          </select>
        </div>

        {/* Resume Filter */}
        <div>
          <select
            value={resumeFilter}
            onChange={(e) => setResumeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Resume Statuses</option>
            <option value="WITH_RESUME">📄 Resume Attached</option>
            <option value="NO_RESUME">Missing Resume</option>
          </select>
        </div>

        {/* Recruiter Assignment Filter */}
        <div>
          <select
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Partner Routings</option>
            <option value="ASSIGNED">Assigned to Partner</option>
            <option value="UNASSIGNED">Unassigned (Open Pool)</option>
            {recruiters.map((r) => (
              <option key={r.id} value={r.id}>
                Assigned: {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / List Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedCandidateIds.length > 0 && selectedCandidateIds.length === filteredCandidates.length}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
            />
            <span className="text-slate-400 font-medium">
              {selectedCandidateIds.length > 0 ? `${selectedCandidateIds.length} Candidate(s) Selected` : "Select All Candidates in View"}
            </span>
          </div>
          <span className="text-slate-500 font-mono">
            Showing {filteredCandidates.length} Records
          </span>
        </div>

        {/* Candidate Rows */}
        <div className="divide-y divide-slate-800/80">
          {filteredCandidates.map((cand) => {
            const isSelected = selectedCandidateIds.includes(cand.id);

            return (
              <div
                key={cand.id}
                className={`p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isSelected ? "bg-blue-950/20" : "hover:bg-slate-950/50"
                }`}
              >
                {/* Left Column: Checkbox, Avatar, Name & ID */}
                <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleCandidate(cand.id)}
                    className="w-4 h-4 mt-1 sm:mt-0 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer shrink-0"
                  />

                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-700/30 text-blue-300 border border-blue-500/40 flex items-center justify-center font-bold font-mono text-sm shrink-0 shadow-md">
                    {cand.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span 
                        onClick={() => onOpenCandidateProfile(cand)}
                        className="font-bold text-white hover:text-blue-400 transition-colors cursor-pointer text-sm"
                      >
                        {cand.fullName}
                      </span>
                      <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[11px] border border-blue-500/30">
                        {cand.candidateId}
                      </span>
                      {cand.emailVerified ? (
                        <span className="inline-flex items-center text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          <AlertCircle className="w-3 h-3 mr-0.5" /> Pending
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px]">
                      <span className="text-slate-300 font-medium">{cand.targetRole || "Software Engineer"}</span>
                      <span>•</span>
                      <span className="flex items-center"><Mail className="w-3 h-3 mr-1 text-slate-500" /> {cand.email}</span>
                      {cand.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center"><Phone className="w-3 h-3 mr-1 text-slate-500" /> {cand.phone}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-slate-500" /> {cand.location || "India"}</span>
                    </div>

                    {/* Key Skills Pills */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(cand.keySkills && cand.keySkills.length > 0 ? cand.keySkills : (cand.skills || ["General Candidate"])).slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px]">
                          {skill}
                        </span>
                      ))}
                      {(cand.keySkills?.length || cand.skills?.length || 0) > 5 && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          +{((cand.keySkills?.length || cand.skills?.length || 0) - 5)} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Routing status & Action buttons */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                  <div className="text-left lg:text-right space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Assignment Status</span>
                    {cand.assignedRecruiterName || cand.assignedConsultancyName ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {cand.assignedConsultancyName ? `Consultancy: ${cand.assignedConsultancyName}` : `Recruiter: ${cand.assignedRecruiterName}`}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-800 border border-slate-700">
                        Unassigned Pool
                      </span>
                    )}
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onFindMatchesForCandidate(cand)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                      title="Find matching jobs for this candidate"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onOpenAssignModal([cand])}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                      title="Assign candidate to recruiter or consultancy"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onOpenCandidateProfile(cand)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-xs flex items-center space-x-1 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCandidates.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No Candidates Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No candidate profiles match the current filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Candidate Creation Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 text-xs">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Add Candidate to Master Database</h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualCandidate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.fullName}
                    onChange={(e) => setManualForm({ ...manualForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">City / Location</label>
                  <input
                    type="text"
                    value={manualForm.city}
                    onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Target Role *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.targetRole}
                    onChange={(e) => setManualForm({ ...manualForm, targetRole: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Total Experience (Years)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualForm.totalExperienceYears}
                    onChange={(e) => setManualForm({ ...manualForm, totalExperienceYears: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Key Skills (Comma-separated)</label>
                <input
                  type="text"
                  value={manualForm.keySkills}
                  onChange={(e) => setManualForm({ ...manualForm, keySkills: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingManual}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingManual ? "Generating ID & Saving..." : "Create Candidate Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
