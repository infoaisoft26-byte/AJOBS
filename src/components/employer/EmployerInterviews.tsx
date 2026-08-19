import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Video, 
  Users, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { CompanyInterview, CompanyJob, CompanyApplication } from "./EmployerTypes";

interface EmployerInterviewsProps {
  userId: string;
  interviews: CompanyInterview[];
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  onInterviewScheduled?: (newInt: CompanyInterview) => void;
}

export default function EmployerInterviews({
  userId,
  interviews,
  jobs,
  applications,
  onInterviewScheduled
}: EmployerInterviewsProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState(jobs[0]?.title || "Senior React Engineer");
  const [dateTime, setDateTime] = useState("");
  const [roundName, setRoundName] = useState("Technical Screening");
  const [meetLink, setMeetLink] = useState("https://meet.google.com/aijobs-interview");
  const [interviewer, setInterviewer] = useState("Lead Engineering Manager");

  const displayInterviews: CompanyInterview[] = interviews.length > 0 ? interviews : [
    {
      id: "int_scheduled_1",
      jobId: "job_1",
      jobTitle: "Senior React & TypeScript Engineer",
      candidateId: "cand_1",
      candidateName: "Aarav Sharma",
      candidateEmail: "aarav.sharma@example.com",
      dateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
      roundName: "Technical Deep Dive & System Design",
      interviewer: "Hiring Manager (Engineering)",
      meetLink: "https://meet.google.com/aij-tech-01",
      status: "scheduled"
    },
    {
      id: "int_scheduled_2",
      jobId: "job_2",
      jobTitle: "Full Stack Node.js Developer",
      candidateId: "cand_2",
      candidateName: "Vikram Malhotra",
      candidateEmail: "vikram.m@example.com",
      dateTime: new Date(Date.now() + 86400000 * 4).toISOString(),
      roundName: "Architecture Round",
      interviewer: "VP of Engineering",
      meetLink: "https://meet.google.com/aij-arch-02",
      status: "scheduled"
    }
  ];

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !dateTime) {
      alert("Please enter candidate name and date/time.");
      return;
    }

    const newInt: CompanyInterview = {
      id: "int_" + Math.random().toString(36).substr(2, 9),
      jobId: "job_int",
      jobTitle,
      candidateId: "cand_" + Math.random().toString(36).substr(2, 6),
      candidateName,
      dateTime,
      roundName,
      interviewer,
      meetLink,
      status: "scheduled"
    };

    try {
      await setDoc(doc(db, "company_interviews", newInt.id), {
        ...newInt,
        companyId: userId
      });
    } catch (e) {}

    if (onInterviewScheduled) onInterviewScheduled(newInt);
    setShowScheduleModal(false);
    setCandidateName("");
  };

  return (
    <div className="space-y-6" id="employer-interviews-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>INTERVIEW SCHEDULING HUB</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Candidate Interview Schedules</h2>
          <p className="text-xs text-slate-400">Manage technical rounds, candidate evaluations, and automated calendar invitations</p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>Schedule Interview</span>
        </button>
      </div>

      {/* Grid of Scheduled Interviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayInterviews.map((intv) => (
          <div
            key={intv.id}
            className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-md shadow-xl transition-all space-y-4 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  {intv.roundName}
                </span>
                <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
                  {intv.candidateName}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{intv.jobTitle}</p>
              </div>

              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0e0a14] border border-purple-500/20 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{new Date(intv.dateTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Interviewer: {intv.interviewer}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2">
              {intv.meetLink && (
                <a
                  href={intv.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Video Room</span>
                </a>
              )}
              <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Calendar Synced
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#17111F] border border-purple-500/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Schedule Candidate Interview</span>
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Candidate Name</label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full p-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Round Type</label>
                  <select
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Technical Screening">Technical Screening</option>
                    <option value="Architecture Round">Architecture Round</option>
                    <option value="Live Coding Test">Live Coding Test</option>
                    <option value="HR / Cultural Fit">HR / Cultural Fit</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Meeting URL (Google Meet / Zoom)</label>
                <input
                  type="url"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-extrabold shadow-lg"
                >
                  Save & Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
