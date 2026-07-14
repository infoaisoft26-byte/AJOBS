import { useState } from "react";
import { 
  Calendar, Video, MapPin, CheckSquare, Clock, Plus, 
  Trash2, Send, Save, BookOpen, Star, UserCheck, AlertCircle, Sparkles
} from "lucide-react";
import { CompanyInterview, CompanyApplication, CompanyJob } from "./EmployerTypes";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { 
  signInWithGoogleCalendar, getCalendarAccessToken, GoogleCalendarService 
} from "../../services/googleCalendarService";

interface InterviewManagementProps {
  userId: string;
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  interviews: CompanyInterview[];
  onRefresh: () => void;
}

export default function InterviewManagement({
  userId,
  jobs,
  applications,
  interviews,
  onRefresh
}: InterviewManagementProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<CompanyInterview | null>(null);

  // Form scheduling states
  const [targetAppId, setTargetAppId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<"Online" | "Offline">("Online");
  const [locationOrLink, setLocationOrLink] = useState("https://meet.google.com/abc-defg-hij");
  const [interviewer, setInterviewer] = useState("");

  // Google Calendar Integration State
  const [syncToGCal, setSyncToGCal] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

  // Feedback logging states
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(85);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAppId || !date || !time || !interviewer) {
      alert("Please specify candidate, interviewer, date, and timeslots.");
      return;
    }
    setIsSubmitting(true);

    try {
      const selectedApp = applications.find(a => a.id === targetAppId);
      if (!selectedApp) return;

      let googleEventId = "";
      
      // Attempt Google Calendar Sync if requested
      if (syncToGCal) {
        setIsConnectingCalendar(true);
        try {
          let token = getCalendarAccessToken();
          if (!token) {
            const authResult = await signInWithGoogleCalendar();
            if (authResult) {
              token = authResult.accessToken;
            }
          }

          if (token) {
            // Compile start/end ISO times for calendar event
            const startDateTime = new Date(`${date}T${convertTo24Hour(time)}`).toISOString();
            const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(); // Default 1 hour

            const gEvent = await GoogleCalendarService.createEvent(token, {
              summary: `Interview: ${selectedApp.candidateName} for ${selectedApp.jobTitle}`,
              description: `Automated AIJobs assessment interview panel hosted by ${interviewer}. Meeting link: ${locationOrLink}`,
              startTime: startDateTime,
              endTime: endDateTime,
              location: locationOrLink,
              attendeeEmail: selectedApp.candidateEmail || ""
            });

            if (gEvent && gEvent.id) {
              googleEventId = gEvent.id;
              console.log("Successfully synced with Google Calendar, Event ID:", googleEventId);
            }
          }
        } catch (err: any) {
          console.error("Google Calendar Sync failed:", err);
          alert(`⚠️ Google Calendar Sync Error: ${err.message || err}. Saving slot locally instead.`);
        } finally {
          setIsConnectingCalendar(false);
        }
      }

      const interviewId = `cint_${Math.random().toString(36).substr(2, 9)}`;
      const newInterview: CompanyInterview & { googleEventId?: string } = {
        id: interviewId,
        applicationId: selectedApp.id,
        candidateId: selectedApp.candidateId,
        candidateName: selectedApp.candidateName,
        jobId: selectedApp.jobId,
        jobTitle: selectedApp.jobTitle,
        date,
        time,
        type,
        locationOrLink,
        interviewer,
        status: "Scheduled",
        ...(googleEventId ? { googleEventId } : {})
      };

      // 1. Save to Firestore
      await setDoc(doc(db, "company_interviews", interviewId), newInterview);

      // 2. Automatically advance application stage to "Interview Scheduled"
      const updatedApp: CompanyApplication = {
        ...selectedApp,
        status: "Interview Scheduled"
      };
      await setDoc(doc(db, "company_applications", selectedApp.id), updatedApp);

      // standard sync
      await setDoc(doc(db, "applications", selectedApp.id), {
        status: "interviewing"
      }, { merge: true });

      // Log activity
      const activityId = "clog_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "company_activity_logs", activityId), {
        id: activityId,
        companyId: userId,
        type: "interview",
        description: `Scheduled "${type}" interview for ${selectedApp.candidateName} with ${interviewer}.${googleEventId ? " Synced to Google Calendar." : ""}`,
        createdAt: new Date().toISOString()
      });

      // 3. Trigger a 'Candidate Notification' for the interview in notifications collection
      const notifId = "notif_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: selectedApp.candidateId,
        title: "Interview Scheduled 📅",
        message: `Your interview for "${selectedApp.jobTitle}" has been scheduled. Type: ${type} on ${date} at ${time}.`,
        event: "AI_INTERVIEW_SCHEDULED",
        read: false,
        type: "info",
        createdAt: new Date().toISOString()
      });

      alert(`🎉 Scheduled ${type} interview successfully!${googleEventId ? " Synced to Google Calendar." : ""}`);
      setIsFormOpen(false);
      setSyncToGCal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error scheduling interview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to convert standard user AM/PM strings to 24-hour HH:MM strings
  function convertTo24Hour(timeStr: string) {
    const [timeVal, modifier] = timeStr.trim().split(" ");
    let [hours, minutes] = timeVal.split(":");
    if (hours === "12") {
      hours = "00";
    }
    if (modifier && modifier.toUpperCase() === "PM") {
      hours = String(parseInt(hours, 10) + 12);
    }
    if (!minutes) {
      minutes = "00";
    }
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTarget) return;
    setIsSubmitting(true);

    try {
      const updatedInterview: CompanyInterview = {
        ...feedbackTarget,
        status: "Completed",
        feedback,
        score: Number(score)
      };

      // 1. Save feedback to interview
      await setDoc(doc(db, "company_interviews", feedbackTarget.id), updatedInterview);

      // 2. Sync to company_applications to show evaluated interviewScore
      const appRef = doc(db, "company_applications", feedbackTarget.applicationId);
      await setDoc(appRef, {
        interviewScore: Number(score)
      }, { merge: true });

      // Log activity
      const activityId = "clog_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "company_activity_logs", activityId), {
        id: activityId,
        companyId: userId,
        type: "interview",
        description: `Interview feedback recorded for ${feedbackTarget.candidateName} (Rating: ${score}/100).`,
        createdAt: new Date().toISOString()
      });

      alert("🎉 Interview evaluation feedback registered successfully!");
      setFeedbackTarget(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInterview = async (id: string, name: string) => {
    if (!confirm(`Cancel and delete interview slot for "${name}"?`)) return;

    try {
      // 1. Fetch to see if there is a linked Google Calendar Event ID
      const docSnap = await getDoc(doc(db, "company_interviews", id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.googleEventId) {
          const token = getCalendarAccessToken();
          if (token) {
            console.log("Found linked Google Calendar Event, deleting...", data.googleEventId);
            await GoogleCalendarService.deleteEvent(token, data.googleEventId);
          }
        }
      }

      await deleteDoc(doc(db, "company_interviews", id));
      alert("Interview canceled and successfully deleted locally (and from Google Calendar if synced).");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error cancelling interview slot.");
    }
  };

  const upcomingInterviews = interviews.filter(i => i.status === "Scheduled");
  const pastInterviews = interviews.filter(i => i.status === "Completed");

  return (
    <div className="space-y-6" id="interview-management-portal">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Interview Coordination Suite</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Coordinate virtual screenings, onsite boards, and capture technical and cultural ratings.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Interview</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduled List Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Upcoming Scheduled Checkpoints ({upcomingInterviews.length})</span>
            </h4>

            <div className="space-y-3">
              {upcomingInterviews.length > 0 ? (
                upcomingInterviews.map((int) => (
                  <div key={int.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{int.candidateName}</span>
                        <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                          int.type === "Online" ? "bg-indigo-500/15 text-indigo-400" : "bg-purple-500/15 text-purple-400"
                        }`}>
                          {int.type}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 font-mono">Job: <strong className="text-white">{int.jobTitle}</strong></p>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {int.date} at {int.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                          Host: {int.interviewer}
                        </span>
                      </div>

                      <div className="text-[10px] bg-neutral-950/40 p-2 rounded border border-white/5 flex items-center gap-1.5">
                        {int.type === "Online" ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <MapPin className="w-3.5 h-3.5 text-purple-400" />}
                        <span className="text-gray-300 font-mono text-ellipsis overflow-hidden max-w-sm block">
                          {int.locationOrLink}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => setFeedbackTarget(int)}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all cursor-pointer shadow-sm"
                      >
                        Log Feedback
                      </button>
                      <button
                        onClick={() => handleDeleteInterview(int.id, int.candidateName)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg text-center"
                        title="Cancel Slot"
                      >
                        Cancel Slot
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-xl">
                  No upcoming interview sessions. Use the scheduler above to establish one.
                </div>
              )}
            </div>
          </div>

          {/* Past History Logs */}
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Completed Interview Logs & History</span>
            </h4>

            <div className="space-y-3">
              {pastInterviews.length > 0 ? (
                pastInterviews.map((int) => (
                  <div key={int.id} className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-xs text-white">{int.candidateName} • <span className="text-gray-400">{int.jobTitle}</span></h5>
                        <p className="text-[10px] text-gray-400 font-mono">Conducted on {int.date} by {int.interviewer}</p>
                      </div>

                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 font-mono text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Score: {int.score}/100</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-300 italic bg-neutral-950/20 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                      &ldquo;{int.feedback}&rdquo;
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-gray-500 italic">
                  No evaluation histories completed.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic scheduling forms / context info */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-indigo-400" />
              <span>Directives & Tips</span>
            </h4>
            <div className="space-y-3.5 text-[11px] text-gray-400 leading-relaxed">
              <p>
                Scheduling an interview automatically shifts the candidate to <strong className="text-indigo-400">"Interview Scheduled"</strong>, instantly notifying them.
              </p>
              <p>
                Submitting feedback recalculates the candidates overall Match index on the dashboard for executive approvals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Schedule Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={handleScheduleSubmit} className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 space-y-4 text-xs">
            <div className="border-b border-white/5 pb-3 flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-white">Create Interview Checkpoint</h4>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white">X</button>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block">Select Candidate Pipeline Application *</label>
              <select
                required
                value={targetAppId}
                onChange={e => setTargetAppId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white"
              >
                <option value="">Choose candidate...</option>
                {applications.filter(a => a.status !== "Rejected" && a.status !== "Joined").map(a => (
                  <option key={a.id} value={a.id}>{a.candidateName} — {a.jobTitle}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-gray-400 block">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block">Time *</label>
                <input
                  type="text"
                  required
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  placeholder="e.g. 02:00 PM"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 space-y-1">
                <label className="text-gray-400 block">Meeting Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-gray-400 block">Interviewer Name *</label>
                <input
                  type="text"
                  required
                  value={interviewer}
                  onChange={e => setInterviewer(e.target.value)}
                  placeholder="e.g. VP Engineering"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block">Meeting Link / Corporate Boardroom Office Location *</label>
              <input
                type="text"
                required
                value={locationOrLink}
                onChange={e => setLocationOrLink(e.target.value)}
                placeholder="e.g. Google Meet Link, Boardroom C"
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
              />
            </div>

            {/* Google Calendar Sync Checkbox Option */}
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="gcal-sync-checkbox"
                checked={syncToGCal}
                onChange={e => setSyncToGCal(e.target.checked)}
                className="mt-0.5 accent-indigo-500 cursor-pointer h-4 w-4"
              />
              <div className="space-y-0.5">
                <label htmlFor="gcal-sync-checkbox" className="font-extrabold text-white cursor-pointer select-none flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sync to Google Calendar</span>
                </label>
                <p className="text-[10px] text-gray-400">
                  {isConnectingCalendar 
                    ? "Establishing secure connection..." 
                    : "Creates a real calendar event with attendee alerts and automatic reminders."}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isConnectingCalendar}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isConnectingCalendar ? "Syncing Calendar..." : "Confirm Schedule Slot"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Interactive Log Evaluation Feedback Overlay */}
      {feedbackTarget && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={handleFeedbackSubmit} className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 space-y-4 text-xs">
            <div className="border-b border-white/5 pb-3 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm text-white">Log Candidate Evaluation</h4>
                <p className="text-gray-500 text-[10px]">Evaluating Aryan {feedbackTarget.candidateName}</p>
              </div>
              <button type="button" onClick={() => setFeedbackTarget(null)} className="text-gray-400 hover:text-white">X</button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-gray-400">Overall Interview Rating ({score}/100)</label>
                <span className="font-bold text-indigo-400 font-mono">{score >= 80 ? "Pass • Excellent" : "Review Stage"}</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                value={score}
                onChange={e => setScore(Number(e.target.value))}
                className="w-full accent-indigo-500 mt-2"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block">Structured Technical & Cultural Interview Feedback *</label>
              <textarea
                required
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="List technical strengths, coding test performance, dynamic gaps, or architecture fit recommendations..."
                className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Log Evaluation & Seal checkpoint</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
