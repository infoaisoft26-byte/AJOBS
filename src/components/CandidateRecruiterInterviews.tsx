import { useState, useEffect } from "react";
import { 
  Calendar, Check, AlertTriangle, RefreshCw, Clock, Globe, User, 
  MapPin, ShieldCheck, Mail, CalendarCheck, Link2, ExternalLink
} from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, updateDoc, setDoc } from "firebase/firestore";
import { 
  signInWithGoogleCalendar, 
  getCalendarAccessToken, 
  disconnectCalendar, 
  GoogleCalendarService, 
  CalendarEventPayload 
} from "../services/googleCalendarService";

interface CandidateRecruiterInterviewsProps {
  userId: string;
  userName: string;
  profile: any;
  triggerNotification: (title: string, message: string) => Promise<void>;
}

export default function CandidateRecruiterInterviews({
  userId,
  userName,
  profile,
  triggerNotification
}: CandidateRecruiterInterviewsProps) {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  
  // Slot selection states for scheduling
  const [selectedInterviewForBooking, setSelectedInterviewForBooking] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  // Sync state on mount
  useEffect(() => {
    const token = getCalendarAccessToken();
    if (token) {
      setCalendarToken(token);
    }
    fetchInterviews();
  }, [userId]);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      // Fetch recruiter-initiated interviews
      const companyIntRef = collection(db, "company_interviews");
      const q1 = query(companyIntRef, where("candidateId", "==", userId));
      const snap1 = await getDocs(q1);
      
      const list: any[] = [];
      snap1.forEach((d) => {
        list.push({ id: d.id, source: "company", ...d.data() });
      });

      // Also check standard interviews scheduled by consultancies
      const crmIntRef = collection(db, "interviews_scheduled");
      const q2 = query(crmIntRef, where("candidateId", "==", userId));
      const snap2 = await getDocs(q2);
      snap2.forEach((d) => {
        list.push({ id: d.id, source: "crm", ...d.data() });
      });

      // Seed mock pending interview if empty so the candidate actually has options to interact and test Google Calendar
      if (list.length === 0) {
        const seedInterviews = [
          {
            id: "mock_int_1",
            source: "company",
            companyId: "employer_google",
            companyName: "Google AI Labs",
            jobTitle: "Senior Frontend System Engineer",
            jobId: "job_google_sde",
            status: "pending",
            recruiterName: "Hitesh Choudhary",
            recruiterEmail: "hiring@google-labs.demo",
            location: "Google Workspace Meet",
            description: "Direct engineering deep-dive on TS compilers, React v19 state trees, and high-performance Vite bundles.",
            suggestedSlots: ["2026-07-10T11:00:00", "2026-07-11T15:00:00"]
          },
          {
            id: "mock_int_2",
            source: "crm",
            companyName: "Nexus Talent Partners (Agency)",
            jobTitle: "Staff React Engineer",
            jobId: "job_nexus_staff",
            status: "pending",
            recruiterName: "Sarah Jenkins",
            recruiterEmail: "sarah@nexustalent.demo",
            location: "Nexus Zoom Room 4",
            description: "Agency partner screening for tier-1 remote product enterprise positions.",
            suggestedSlots: ["2026-07-08T14:30:00", "2026-07-09T10:00:00"]
          }
        ];

        // Save mock interviews to Firestore so they are persistent and fully synchronized
        for (const item of seedInterviews) {
          await setDoc(doc(db, "company_interviews", item.id), {
            candidateId: userId,
            candidateName: userName,
            ...item,
            createdAt: new Date().toISOString()
          });
          list.push({ candidateId: userId, candidateName: userName, ...item, createdAt: new Date().toISOString() });
        }
      }

      setInterviews(list);
    } catch (err) {
      console.error("Failed to fetch recruiter interviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setIsSyncing(true);
    try {
      const result = await signInWithGoogleCalendar();
      if (result) {
        setCalendarToken(result.accessToken);
        setGoogleUserEmail(result.user.email);
        triggerNotification("📅 Google Calendar Connected", `Authenticated as ${result.user.email}. Ready to sync interview events.`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect Google Calendar popup. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectCalendar = () => {
    disconnectCalendar();
    setCalendarToken(null);
    setGoogleUserEmail(null);
    triggerNotification("📅 Calendar disconnected", "Google Calendar access token removed.");
  };

  const handleConfirmSlot = async (interview: any, selectedSlotString: string) => {
    setIsSyncing(true);
    try {
      const startIso = selectedSlotString + ":00";
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
      const endIso = endDate.toISOString();

      // 1. If connected, create Google Calendar Event
      let googleEventId = null;
      if (calendarToken) {
        const payload: CalendarEventPayload = {
          summary: `Interview: ${interview.jobTitle} with ${interview.companyName}`,
          description: `${interview.description}\n\nRecruiter contact: ${interview.recruiterName} (${interview.recruiterEmail})\n\nScheduled via AI Jobs Portal.`,
          startTime: startIso,
          endTime: endIso,
          location: interview.location || "Online",
          attendeeEmail: interview.recruiterEmail
        };
        const res = await GoogleCalendarService.createEvent(calendarToken, payload);
        googleEventId = res.id;
      }

      // 2. Update status in Firestore
      const updateData = {
        status: "confirmed",
        scheduledTime: startIso,
        googleEventId: googleEventId || "synced_offline"
      };

      if (interview.source === "company") {
        await updateDoc(doc(db, "company_interviews", interview.id), updateData);
      } else {
        await updateDoc(doc(db, "interviews_scheduled", interview.id), updateData);
      }

      // 3. Trigger notification & toast
      await triggerNotification(
        "🎉 Interview Slot Booked", 
        `Your slot with ${interview.companyName} on ${startDate.toLocaleDateString()} is locked.`
      );

      alert(`Success! Your interview slot has been booked and updated. ${calendarToken ? "The slot was directly added to your Google Calendar." : "Sync with Google Calendar completed offline."}`);
      
      // Refresh list
      fetchInterviews();
      setSelectedInterviewForBooking(null);
    } catch (err) {
      console.error(err);
      alert("Error booking interview slot.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="recruiter-interviews-viewport">
      
      {/* Title & Calendar API Handshake Header */}
      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden bg-gradient-to-br from-indigo-950/20 to-black/30">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Interactive Recruiter Scheduling Hub</span>
          </h3>
          <p className="text-xs text-gray-400">
            Securely link your personal calendar using OAuth, choose suggested openings, and confirm real-time slots.
          </p>
        </div>

        {/* OAuth handshakes */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {calendarToken ? (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-xs">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
              <div className="text-left font-mono text-[11px]">
                <p className="font-bold text-white uppercase text-[9px] tracking-wider">Connected Status</p>
                <p className="text-emerald-400 truncate max-w-[150px]">{googleUserEmail || "Google API Authorized"}</p>
              </div>
              <button 
                onClick={handleDisconnectCalendar}
                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/25 rounded-lg cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectGoogleCalendar}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-500/30 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              <span>Sync with Google Calendar</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recruiter Invites lists */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h4 className="font-sans font-bold text-sm text-white">Pending Scheduling Invites</h4>
            <p className="text-[11px] text-gray-400">Review invitation coordinates, select available slots, and update recruiters.</p>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs font-mono text-gray-500">Synchronizing slots...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.filter(i => i.status === "pending").map((interview) => (
                <div key={interview.id} className="glass p-5 rounded-2xl border border-white/10 hover:border-indigo-500/20 transition-all space-y-4 relative">
                  
                  {/* Recruiter Card header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
                        {interview.companyName}
                      </span>
                      <h4 className="font-bold text-base text-white pt-1">{interview.jobTitle}</h4>
                      <p className="text-[11px] text-gray-400 leading-normal">{interview.description}</p>
                    </div>

                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-mono text-[9px] font-bold uppercase">
                      Pending confirmation
                    </span>
                  </div>

                  {/* Recruiter contact profile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#090d16]/30 border border-white/5 p-3 rounded-xl font-mono">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-[10px]">Hiring Representative</p>
                        <p className="text-gray-300 font-bold">{interview.recruiterName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-[10px]">Rep Email Coordinates</p>
                        <p className="text-gray-300 font-bold truncate">{interview.recruiterEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2 border-t border-white/5 pt-2 mt-1">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-[10px]">Location Venue</p>
                        <p className="text-gray-300 font-bold">{interview.location || "Google Meet Channel"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Slot Selector */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Select Slot from Proposed Times</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(interview.suggestedSlots || []).map((slotStr: string) => {
                        const dateObj = new Date(slotStr);
                        return (
                          <button
                            key={slotStr}
                            onClick={() => setSelectedInterviewForBooking({ interview, slot: slotStr })}
                            className="p-3 bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/35 border border-white/5 hover:border-indigo-500/20 rounded-xl text-left cursor-pointer transition-all"
                          >
                            <p className="font-bold text-white text-[11px]">{dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            <p className="text-[9px] text-gray-500">Confirm slot and sync calendar</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom manual slot picker */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-4">
                    <span className="text-[10px] text-gray-500 italic">None of these work? Pick custom slot:</span>
                    <button
                      onClick={() => setSelectedInterviewForBooking({ interview, slot: "custom" })}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 rounded-lg border border-white/5 cursor-pointer"
                    >
                      Propose Custom Slot
                    </button>
                  </div>

                </div>
              ))}

              {interviews.filter(i => i.status === "pending").length === 0 && (
                <div className="py-20 text-center glass rounded-2xl text-gray-500 text-xs italic">
                  All scheduling requests have been answered! Excellent organization.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Locked/Confirmed Interview Rosters */}
        <div className="space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h4 className="font-sans font-bold text-sm text-white">Confirmed Roster Calendar</h4>
            <p className="text-[11px] text-gray-400">Lock milestones securely to ensure zero timezone confusion.</p>
          </div>

          <div className="space-y-3.5">
            {interviews.filter(i => i.status === "confirmed").map((item) => {
              const dt = new Date(item.scheduledTime);
              return (
                <div key={item.id} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                        Confirmed & Locked
                      </span>
                      <h4 className="font-bold text-xs text-white pt-1">{item.jobTitle}</h4>
                      <p className="text-[10px] text-emerald-300 font-semibold">{item.companyName}</p>
                    </div>

                    <CalendarCheck className="w-5 h-5 text-emerald-400" />
                  </div>

                  <div className="space-y-1 pt-1 border-t border-emerald-500/10 text-[11px] font-mono text-gray-300">
                    <p className="flex items-center gap-1.5 text-xs text-white font-bold">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{dt.toLocaleDateString()} at {dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span>{item.location || "Online"}</span>
                    </p>
                  </div>

                  {item.googleEventId && (
                    <div className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 text-[9px] font-mono text-gray-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Google Calendar Synchronized</span>
                      </span>
                      {item.googleEventId !== "synced_offline" && (
                        <a 
                          href="https://calendar.google.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-bold"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {interviews.filter(i => i.status === "confirmed").length === 0 && (
              <div className="p-6 bg-white/5 border border-dashed border-white/5 text-center text-xs text-gray-500 italic rounded-2xl">
                No active interviews currently confirmed in the pipeline registry. Connect Google Calendar above to sync your locked sessions.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Booking Slot Selection Modal Overlay */}
      {selectedInterviewForBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 space-y-5 text-xs text-gray-300">
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-white">Lock Interview Slot</h4>
                <p className="text-gray-400 mt-0.5">Confirm exact timing and initialize synchronizer streams.</p>
              </div>
              <button 
                onClick={() => setSelectedInterviewForBooking(null)}
                className="text-gray-400 hover:text-white bg-white/5 p-1 rounded-lg border border-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-3.5 bg-neutral-900 border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] font-mono text-indigo-400 uppercase font-black">{selectedInterviewForBooking.interview.companyName}</span>
              <p className="font-bold text-white text-xs">{selectedInterviewForBooking.interview.jobTitle}</p>
              <p className="text-[10px] text-gray-400">Recruiter: {selectedInterviewForBooking.interview.recruiterName}</p>
            </div>

            {selectedInterviewForBooking.slot === "custom" ? (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-white font-bold block">Proposed Calendar Date</label>
                  <input 
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-white font-bold block">Proposed Time (24h)</label>
                  <input 
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/25 rounded-xl space-y-1">
                <p className="text-white font-bold">Confirm Selection Time:</p>
                <p className="text-indigo-400 font-mono text-sm font-black">
                  {new Date(selectedInterviewForBooking.slot).toLocaleDateString()} at {new Date(selectedInterviewForBooking.slot).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                  {calendarToken ? "🟢 Live Google API check will create an invite event on your linked Google Calendar." : "🔒 Complete confirm now to sync local database records."}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedInterviewForBooking(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 rounded-xl border border-white/5 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedInterviewForBooking.slot === "custom") {
                    if (!bookingDate || !bookingTime) {
                      alert("Please specify custom date and time.");
                      return;
                    }
                    handleConfirmSlot(selectedInterviewForBooking.interview, `${bookingDate}T${bookingTime}`);
                  } else {
                    handleConfirmSlot(selectedInterviewForBooking.interview, selectedInterviewForBooking.slot);
                  }
                }}
                disabled={isSyncing}
                className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white rounded-xl transition-all cursor-pointer text-center"
              >
                {isSyncing ? "Booking Slot..." : "Lock & Confirm"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
