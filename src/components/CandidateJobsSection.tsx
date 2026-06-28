import { useState } from "react";
import { 
  Heart, Briefcase, Brain, Star, CheckCircle2, Search, ArrowRight, 
  Trash2, ShieldCheck, HelpCircle, Clock, Calendar, Check, X, Award, ChevronRight 
} from "lucide-react";
import { JobPosting, JobApplication } from "../types";

interface JobsSectionProps {
  userId: string;
  profile: any;
  jobs: JobPosting[];
  applications: JobApplication[];
  activeTab: "saved-jobs" | "applied-jobs";
  onSaveJob: (jobId: string, remove: boolean) => Promise<void>;
  onOneClickApply: (job: JobPosting) => Promise<void>;
  onStartInterview: (job: JobPosting) => void;
  onCheckMatch: (job: JobPosting) => Promise<void>;
  selectedJobForMatch: JobPosting | null;
  isMatching: boolean;
  matchResult: any;
  searchQuery: string;
}

export default function CandidateJobsSection({
  userId,
  profile,
  jobs,
  applications,
  activeTab,
  onSaveJob,
  onOneClickApply,
  onStartInterview,
  onCheckMatch,
  selectedJobForMatch,
  isMatching,
  matchResult,
  searchQuery
}: JobsSectionProps) {
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  const savedJobIds = profile?.savedJobIds || [];

  // Filter jobs based on search queries and active view
  const getFilteredJobs = () => {
    let list = [...jobs];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j => 
        j.title.toLowerCase().includes(q) || 
        j.companyName.toLowerCase().includes(q) || 
        j.skillsRequired?.some(sk => sk.toLowerCase().includes(q))
      );
    }

    if (activeTab === "saved-jobs") {
      return list.filter(j => savedJobIds.includes(j.id));
    }
    
    return list;
  };

  const filteredList = getFilteredJobs();

  // Handle application status index
  const getStatusIndex = (status: string) => {
    const stages = ["applied", "under_review", "interviewing", "selected", "rejected", "offered"];
    const idx = stages.indexOf(status.toLowerCase().replace(" ", "_"));
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. SAVED JOBS BOARD */}
      {activeTab === "saved-jobs" && (
        <div className="space-y-4">
          <div className="border-b border-white/5 pb-3">
            <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <span>Bookmarked Career Openings</span>
            </h3>
            <p className="text-xs text-gray-400">Manage bookmarks, track active matches, and trigger standard 1-Click submissions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((job) => {
              const applied = applications.some(a => a.jobId === job.id);
              return (
                <div key={job.id} className="glass p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-indigo-400 font-extrabold uppercase">{job.companyName}</span>
                      <button 
                        onClick={() => onSaveJob(job.id, true)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                        title="Remove Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-white">{job.title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{job.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skillsRequired?.map((sk, k) => (
                        <span key={k} className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-gray-300 rounded border border-white/5">{sk}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs">
                    <button
                      onClick={() => onCheckMatch(job)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-gray-200 rounded-lg transition-all border border-white/5"
                    >
                      AI Match
                    </button>
                    <button
                      onClick={() => onOneClickApply(job)}
                      disabled={applied}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        applied 
                          ? "bg-green-500/25 text-green-400 border border-green-500/30 cursor-not-allowed" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
                      }`}
                    >
                      {applied ? "Applied" : "1-Click Apply"}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="col-span-2 text-center py-12 glass rounded-2xl text-xs text-gray-500 italic">
                No bookmarked career openings. Use the Search or Dashboard to save job listings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. APPLIED JOBS STATUS TRACKING */}
      {activeTab === "applied-jobs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of Applied Jobs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <span>Job Application Registry</span>
              </h3>
              <p className="text-xs text-gray-400">Track standard progress pipelines for currently submitted portfolios.</p>
            </div>

            <div className="space-y-3.5">
              {applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <div 
                    key={app.id} 
                    onClick={() => setSelectedApp(app)}
                    className={`p-4 rounded-2xl transition-all flex items-center justify-between border cursor-pointer ${
                      isSelected 
                        ? "bg-indigo-600/15 border-indigo-500/40 shadow shadow-indigo-500/10" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-extrabold text-indigo-400 uppercase">{app.companyName}</span>
                      <h4 className="font-bold text-xs text-white">{app.jobTitle}</h4>
                      <p className="text-[10px] text-gray-500">Submitted: {new Date(app.appliedAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono border ${
                        app.status === "applied" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        app.status === "interviewing" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        app.status === "offered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        app.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-white/5 text-gray-300"
                      }`}>
                        {app.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                );
              })}

              {applications.length === 0 && (
                <div className="text-center py-12 glass rounded-2xl text-xs text-gray-500 italic">
                  You haven't applied to any roles. View job matches to trigger applications.
                </div>
              )}
            </div>
          </div>

          {/* Application Status Timeline View */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs font-mono tracking-widest text-purple-400 uppercase">Application Progress</h4>
            {selectedApp ? (
              <div className="glass p-5 rounded-2xl space-y-5 animate-in fade-in duration-300">
                <div className="border-b border-white/5 pb-3">
                  <span className="text-[9px] font-mono text-purple-400 font-extrabold uppercase">{selectedApp.companyName}</span>
                  <h3 className="font-bold text-sm text-white">{selectedApp.jobTitle}</h3>
                  <span className="text-[10px] text-gray-400">Resume score during submit: {selectedApp.resumeScore || 70}%</span>
                </div>

                {/* Timeline graph */}
                <div className="space-y-4 relative pl-4 border-l border-white/5">
                  
                  {/* Step 1: Applied */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border ${
                      getStatusIndex(selectedApp.status) >= 0 ? "bg-indigo-400 border-indigo-400" : "bg-black border-white/10"
                    }`}></div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-gray-200">Application Received</p>
                      <p className="text-[9px] text-gray-500">Resume profile logged successfully into ATS filters.</p>
                    </div>
                  </div>

                  {/* Step 2: Under Review */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border ${
                      getStatusIndex(selectedApp.status) >= 1 ? "bg-indigo-400 border-indigo-400" : "bg-black border-white/10"
                    }`}></div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-gray-200">Portfolio Under Review</p>
                      <p className="text-[9px] text-gray-500">Agency partners reviewing skill stacks and timeline matching.</p>
                    </div>
                  </div>

                  {/* Step 3: Interviewing */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border ${
                      getStatusIndex(selectedApp.status) >= 2 ? "bg-purple-400 border-purple-400 animate-pulse" : "bg-black border-white/10"
                    }`}></div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-gray-200">Interview Scheduled</p>
                      <p className="text-[9px] text-gray-500">Direct technical evaluations or simulator challenge initialized.</p>
                    </div>
                  </div>

                  {/* Step 4: Selected / Decided */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border ${
                      getStatusIndex(selectedApp.status) >= 3 ? "bg-emerald-400 border-emerald-400" : "bg-black border-white/10"
                    }`}></div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-gray-200">Evaluation Selected</p>
                      <p className="text-[9px] text-gray-500">Completed cycles verified with positive feedback markers.</p>
                    </div>
                  </div>

                  {/* Step 5: Offer Received */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border ${
                      selectedApp.status === "offered" ? "bg-emerald-500 border-emerald-500 scale-110" : "bg-black border-white/10"
                    }`}></div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-gray-200">Offer Handover</p>
                      <p className="text-[9px] text-gray-500">Official offer letter dispatched. Check your inbox.</p>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="glass p-6 text-center text-xs text-gray-500 italic rounded-2xl">
                Click any application card on the left to reveal the dynamic status timeline.
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. AI COMPATIBILITY MODAL PORTION (renders inline if job matched) */}
      {selectedJobForMatch && (
        <div className="glass p-5 rounded-2xl border border-indigo-500/20 bg-[#090d16]/30 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div>
              <span className="text-[9px] font-mono uppercase text-indigo-400">AI Compatibility Meter</span>
              <h4 className="font-bold text-xs text-white">{selectedJobForMatch.title}</h4>
            </div>
            {isMatching ? (
              <span className="text-xs text-indigo-400 animate-pulse font-bold">Executing Match...</span>
            ) : (
              <span className="text-xl font-black font-display text-indigo-400">{matchResult?.matchPercentage || 0}% Match</span>
            )}
          </div>

          {!isMatching && matchResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-gray-300">Analysis Summary</p>
                <p className="text-gray-400 leading-relaxed text-[11px]">{matchResult.compatibilitySummary}</p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-gray-300">Suggested Skill Focus</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {matchResult.missingSkills?.map((sk: string, k: number) => (
                    <span key={k} className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] border border-red-500/20">{sk}</span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5">
                <p className="font-bold text-indigo-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>AI Preparation Tip</span>
                </p>
                <p className="text-[11px] text-gray-300 leading-normal">{matchResult.interviewTip}</p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
