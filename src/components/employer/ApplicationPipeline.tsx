import { useState } from "react";
import { 
  Users, ChevronRight, Check, X, ShieldCheck, 
  MapPin, Clock, Brain, FileText, ArrowRightLeft, CalendarClock, Award
} from "lucide-react";
import { CompanyApplication, CompanyJob } from "./EmployerTypes";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface ApplicationPipelineProps {
  userId: string;
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  onRefresh: () => void;
  onOpenScheduleInterview: (app: CompanyApplication) => void;
  onOpenReleaseOffer: (app: CompanyApplication) => void;
}

const PIPELINE_COLUMNS = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "HR Round",
  "Final Round",
  "Offer",
  "Joined",
  "Rejected"
] as const;

export default function ApplicationPipeline({
  userId,
  jobs,
  applications,
  onRefresh,
  onOpenScheduleInterview,
  onOpenReleaseOffer
}: ApplicationPipelineProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("All");
  
  // Modal detail drawer state
  const [activeApp, setActiveApp] = useState<CompanyApplication | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const handleMoveStage = async (app: CompanyApplication, targetStage: typeof PIPELINE_COLUMNS[number]) => {
    setIsChangingStatus(true);
    try {
      // 1. Update corporate application
      const updatedApp: CompanyApplication = {
        ...app,
        status: targetStage
      };
      await setDoc(doc(db, "company_applications", app.id), updatedApp);

      // 2. Sync to standard application collection
      await setDoc(doc(db, "applications", app.id), {
        status: targetStage.toLowerCase()
      }, { merge: true });

      // Log activity
      const activityId = "clog_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "company_activity_logs", activityId), {
        id: activityId,
        companyId: userId,
        type: "application",
        description: `Candidate "${app.candidateName}" moved to stage: "${targetStage}" for "${app.jobTitle}".`,
        createdAt: new Date().toISOString()
      });

      alert(`Candidate advanced to: "${targetStage}"`);
      setActiveApp(updatedApp);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error moving pipeline stage.");
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Filter application list based on selected job opening
  const filteredApps = applications.filter(app => {
    return selectedJobId === "All" || app.jobId === selectedJobId;
  });

  return (
    <div className="space-y-6" id="application-pipeline-view">
      {/* Pipeline Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Interactive Recruitment Pipeline</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Advance applicants across interview checkpoints, technical audits, final offers, and joining logs.
          </p>
        </div>

        {/* Job filtering dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Filter Pipeline:</span>
          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Active Openings</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {PIPELINE_COLUMNS.map((colName) => {
          const colApps = filteredApps.filter(app => app.status === colName);
          
          return (
            <div 
              key={colName} 
              className="flex-shrink-0 w-72 bg-[#09090e]/60 border border-white/5 rounded-2xl p-4 flex flex-col h-[520px]"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-3 text-xs font-bold">
                <span className="text-gray-200 tracking-wide font-sans">{colName}</span>
                <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {colApps.length}
                </span>
              </div>

              {/* Column Cards scroll list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setActiveApp(app)}
                    className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/20 rounded-xl space-y-2 transition-all duration-250 cursor-pointer group shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">
                        {app.candidateName}
                      </h4>
                      {app.resumeScore && app.resumeScore >= 80 && (
                        <span title="Highly Recommended ATS match">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-400 font-mono line-clamp-1">{app.jobTitle}</p>

                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 pt-1">
                      <span>ATS: <strong className="text-indigo-400">{app.resumeScore || 70}</strong></span>
                      <span>Interview: <strong className="text-pink-400">{app.interviewScore || "—"}</strong></span>
                    </div>
                  </div>
                ))}

                {colApps.length === 0 && (
                  <div className="text-center py-16 text-[10px] text-gray-600 italic border border-dashed border-white/5 rounded-xl">
                    Empty column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Details drawer overlay */}
      {activeApp && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 space-y-5 text-xs">
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-white">{activeApp.candidateName}</h4>
                <p className="text-gray-400 mt-0.5">{activeApp.candidateEmail}</p>
              </div>
              <button
                onClick={() => setActiveApp(null)}
                className="text-gray-400 hover:text-white bg-white/5 p-1 rounded-lg border border-white/5"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-neutral-900 p-3.5 rounded-xl border border-white/5 font-mono">
              <div>
                Target Position: <span className="text-white block font-bold">{activeApp.jobTitle}</span>
              </div>
              <div>
                Pipeline Stage: <span className="text-indigo-400 block font-bold uppercase">{activeApp.status}</span>
              </div>
              <div className="mt-2">
                ATS Score: <span className="text-emerald-400 block font-bold">{activeApp.resumeScore || "N/A"}/100</span>
              </div>
              <div className="mt-2">
                AI Interview Score: <span className="text-pink-400 block font-bold">{activeApp.interviewScore || "N/A"}/100</span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 font-mono block">Pipeline Action Suite:</span>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActiveApp(null);
                    onOpenScheduleInterview(activeApp);
                  }}
                  disabled={isChangingStatus}
                  className="py-2 px-3 bg-white/5 hover:bg-indigo-600/10 border border-white/10 hover:border-indigo-500/20 text-indigo-400 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span>Schedule Interview</span>
                </button>

                <button
                  onClick={() => {
                    setActiveApp(null);
                    onOpenReleaseOffer(activeApp);
                  }}
                  disabled={isChangingStatus}
                  className="py-2 px-3 bg-white/5 hover:bg-emerald-600/10 border border-white/10 hover:border-emerald-500/20 text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Release Offer Letter</span>
                </button>
              </div>

              {/* Status progression slider */}
              <div className="space-y-1 pt-2">
                <label className="text-gray-400">Advance Stage Directly:</label>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {PIPELINE_COLUMNS.filter(stage => stage !== activeApp.status).map(stage => (
                    <button
                      key={stage}
                      onClick={() => handleMoveStage(activeApp, stage)}
                      disabled={isChangingStatus}
                      className="py-1.5 px-2 bg-neutral-900 hover:bg-white/5 border border-white/5 text-[9px] text-gray-300 font-medium rounded-lg text-left transition-all hover:text-white"
                    >
                      {stage} &rarr;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
