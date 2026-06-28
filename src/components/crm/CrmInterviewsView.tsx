import { useState } from "react";
import { 
  Calendar, Clock, User, Briefcase, Plus, Save, X, Trash2, 
  CheckCircle, MessageSquare, Star, ChevronLeft, ChevronRight, Edit3
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { InterviewModel, ConsultancyJobModel, ConsultancyCandidateModel } from "./CrmTypes";

interface CrmInterviewsViewProps {
  interviews: InterviewModel[];
  jobs: ConsultancyJobModel[];
  candidates: ConsultancyCandidateModel[];
  onRefresh: () => void;
  userRole: "Admin" | "Manager" | "Recruiter" | "Viewer";
}

export default function CrmInterviewsView({
  interviews,
  jobs,
  candidates,
  onRefresh,
  userRole
}: CrmInterviewsViewProps) {
  const [selectedInt, setSelectedInt] = useState<InterviewModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRecordingFeedback, setIsRecordingFeedback] = useState(false);

  // Form states
  const [candidateName, setCandidateName] = useState(candidates[0]?.name || "");
  const [jobTitle, setJobTitle] = useState(jobs[0]?.title || "");
  const [date, setDate] = useState("2026-06-28");
  const [time, setTime] = useState("10:00");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"scheduled" | "completed" | "cancelled" | "rescheduled">("scheduled");

  const isReadOnly = userRole === "Viewer";

  const handleOpenAdd = () => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot schedule interviews.");
      return;
    }
    setCandidateName(candidates[0]?.name || "Aryan Sharma");
    setJobTitle(jobs[0]?.title || "Senior Fullstack Architect");
    setDate("2026-06-28");
    setTime("10:00");
    setStatus("scheduled");
    setIsAdding(true);
    setIsRecordingFeedback(false);
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      const intId = "int_" + Math.random().toString(36).substr(2, 9);
      const intObj: InterviewModel = {
        id: intId,
        candidateName,
        jobTitle,
        date,
        time,
        status,
        feedback: "No feedback recorded yet."
      };

      await setDoc(doc(db, "interviews_scheduled", intId), intObj);
      alert("Interview coordinated & scheduled successfully in database!");
      setIsAdding(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !selectedInt) return;

    try {
      await setDoc(doc(db, "interviews_scheduled", selectedInt.id), {
        ...selectedInt,
        feedback,
        status: "completed"
      });
      alert("Feedback and recommendations logged. Candidate status upgraded to Completed!");
      setIsRecordingFeedback(false);
      setSelectedInt(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelInterview = async (id: string) => {
    if (isReadOnly) return;
    try {
      const original = interviews.find(i => i.id === id);
      if (original) {
        await setDoc(doc(db, "interviews_scheduled", id), {
          ...original,
          status: "cancelled"
        });
        alert("Interview status updated to CANCELLED.");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-interviews-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Interviews Scheduler & Coordinator</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Greenhouse-grade calendar coordinate planner. Log ratings feedback.</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Interview Round</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: List and Calendar View */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Mini Calendar Visual Grid */}
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-white font-mono uppercase tracking-wider">June 2026 Calendar Grid</span>
              <div className="flex items-center gap-1 text-gray-400 font-mono">
                <ChevronLeft className="w-4 h-4 cursor-pointer" />
                <span>June 2026</span>
                <ChevronRight className="w-4 h-4 cursor-pointer" />
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <span key={d} className="text-gray-500 font-bold uppercase py-1">{d}</span>
              ))}

              {Array.from({ length: 30 }).map((_, idx) => {
                const dayNumber = idx + 1;
                const dateStr = `2026-06-${dayNumber.toString().padStart(2, "0")}`;
                const dailyInterviews = interviews.filter(i => i.date === dateStr);
                const hasInterviews = dailyInterviews.length > 0;

                return (
                  <div 
                    key={idx}
                    className={`p-1.5 rounded border relative min-h-[44px] flex flex-col justify-between transition-all ${
                      hasInterviews 
                        ? "bg-indigo-600/10 border-indigo-500/30 hover:bg-indigo-600/20 cursor-pointer" 
                        : "border-white/5 bg-neutral-950/20 text-gray-500"
                    } ${dayNumber === 28 ? "border-amber-500 bg-amber-500/5" : ""}`}
                    onClick={() => {
                      if (hasInterviews) {
                        setSelectedInt(dailyInterviews[0]);
                      }
                    }}
                  >
                    <span className={`text-[9px] font-bold ${dayNumber === 28 ? "text-amber-400" : "text-gray-400"}`}>
                      {dayNumber}
                    </span>
                    {hasInterviews && (
                      <span className="text-[7px] bg-indigo-600 text-white font-black px-1 rounded block truncate">
                        {dailyInterviews.length} Round{dailyInterviews.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of Interviews */}
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 bg-white/5 border-b border-white/5 text-xs font-mono uppercase font-extrabold text-white">
              Upcoming scheduled slots
            </div>
            <div className="divide-y divide-white/5">
              {interviews.length > 0 ? (
                interviews.map(slot => (
                  <div
                    key={slot.id}
                    onClick={() => { setSelectedInt(slot); setIsAdding(false); setIsRecordingFeedback(false); }}
                    className={`p-4 hover:bg-white/5 transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs ${
                      selectedInt?.id === slot.id ? "bg-indigo-500/10" : ""
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{slot.candidateName}</span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                          slot.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                          slot.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {slot.status}
                        </span>
                      </div>
                      <p className="text-gray-400">{slot.jobTitle}</p>
                    </div>

                    <div className="flex items-center gap-4 text-gray-300 font-mono text-[11px] shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{slot.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{slot.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 italic">No coordinated calendar interviews.</div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Form or Feedback Sidebar */}
        <div>
          {isAdding ? (
            <form onSubmit={handleScheduleInterview} className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">Coordinate Interview</h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Candidate Profile *</label>
                  <select
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  >
                    {candidates.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Hiring Job Position *</label>
                  <select
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  >
                    {jobs.map(j => (
                      <option key={j.id} value={j.title}>{j.companyName} - {j.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Date Target</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Time Slot</label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Coordinating Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Scheduled Slot</span>
              </button>
            </form>
          ) : isRecordingFeedback && selectedInt ? (
            <form onSubmit={handleRecordFeedback} className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">Record Interview Evaluation</h4>
                <button
                  type="button"
                  onClick={() => setIsRecordingFeedback(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Candidate:</label>
                  <p className="text-white font-bold text-sm">{selectedInt.candidateName}</p>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Ratings Feedback Logs *</label>
                  <textarea
                    required
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Candidate demonstrated exceptional knowledge of async processes. Strong recommendation for Offer Release."
                    className="w-full h-32 bg-neutral-900 border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-white resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Log Performance & Complete</span>
              </button>
            </form>
          ) : selectedInt ? (
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-white/5 pb-3 space-y-1">
                <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider block w-fit">
                  Slot Details
                </span>
                <h4 className="font-extrabold text-base text-white">{selectedInt.candidateName}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">{selectedInt.jobTitle}</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-2.5 rounded-lg border border-white/5 text-gray-300">
                  <span>Slot Date: {selectedInt.date}</span>
                  <span>Time: {selectedInt.time}</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Logged Performance Evaluation:</span>
                  </span>
                  <p className="p-3 bg-neutral-950/40 rounded-xl border border-white/5 text-gray-300 leading-relaxed italic text-[11px]">
                    {selectedInt.feedback || "No feedback recorded yet for this slot. Round is outstanding."}
                  </p>
                </div>

                {!isReadOnly && (
                  <div className="pt-2 space-y-2">
                    {selectedInt.status === "scheduled" && (
                      <button
                        onClick={() => {
                          setFeedback(selectedInt.feedback || "");
                          setIsRecordingFeedback(true);
                        }}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Log Feedback & Complete</span>
                      </button>
                    )}

                    {selectedInt.status === "scheduled" && (
                      <button
                        onClick={() => handleCancelInterview(selectedInt.id)}
                        className="w-full py-2 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-400 font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Cancel Interview Round</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl text-center space-y-3">
              <Calendar className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="font-bold text-sm text-gray-300">Select Interview Slot</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Choose an active coordinator slot on the left table list or calendar day grid to view details, update times, or log ratings feedback.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
