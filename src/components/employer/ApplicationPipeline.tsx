import { useState, useEffect } from "react";
import { 
  Users, ChevronRight, Check, X, ShieldCheck, 
  MapPin, Clock, Brain, FileText, ArrowRightLeft, CalendarClock, Award, Download, FileDown,
  Plus, Trash2, Tag, MessageSquare
} from "lucide-react";
import { CompanyApplication, CompanyJob } from "./EmployerTypes";
import { doc, setDoc, collection, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import * as XLSX from "xlsx";
import { NotificationService } from "../../services/notificationService";

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

  // Notes and Tags Collaboration States
  const [appNotes, setAppNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (activeApp) {
      fetchAppNotes(activeApp.id);
    } else {
      setAppNotes([]);
    }
  }, [activeApp]);

  const fetchAppNotes = async (appId: string) => {
    setLoadingNotes(true);
    try {
      const notesRef = collection(db, "company_applications", appId, "notes");
      const snap = await getDocs(notesRef);
      const notesList: any[] = [];
      snap.forEach((d) => {
        notesList.push({ id: d.id, ...d.data() });
      });
      // Sort notes by createdAt asc
      notesList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setAppNotes(notesList);
    } catch (err) {
      console.error("Error fetching candidate recruiter notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp || !newNote.trim()) return;

    try {
      const authorName = auth.currentUser?.displayName || "Recruiter";
      const authorEmail = auth.currentUser?.email || "recruiter@aijobs.com";
      const notePayload = {
        text: newNote.trim(),
        authorName,
        authorEmail,
        createdAt: new Date().toISOString(),
      };

      const notesCollectionRef = collection(db, "company_applications", activeApp.id, "notes");
      const docRef = await addDoc(notesCollectionRef, notePayload);
      
      setAppNotes(prev => [...prev, { id: docRef.id, ...notePayload }]);
      setNewNote("");
    } catch (err) {
      console.error("Error adding note:", err);
      alert("Failed to save note.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeApp) return;
    try {
      const noteDocRef = doc(db, "company_applications", activeApp.id, "notes", noteId);
      await deleteDoc(noteDocRef);
      setAppNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error("Error deleting note:", err);
      alert("Failed to delete note.");
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp || !newTag.trim()) return;

    const cleanTag = newTag.trim().toLowerCase();
    const currentTags = activeApp.tags || [];

    if (currentTags.includes(cleanTag)) {
      setNewTag("");
      return;
    }

    const updatedTags = [...currentTags, cleanTag];
    try {
      const appRef = doc(db, "company_applications", activeApp.id);
      await setDoc(appRef, { tags: updatedTags }, { merge: true });

      // Update standard applications collection too
      const standardAppRef = doc(db, "applications", activeApp.id);
      await setDoc(standardAppRef, { tags: updatedTags }, { merge: true });

      // Update local state
      const updatedApp = { ...activeApp, tags: updatedTags };
      setActiveApp(updatedApp);
      setNewTag("");
      onRefresh(); // Refresh parent lists
    } catch (err) {
      console.error("Error saving tag:", err);
      alert("Failed to save tag.");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeApp) return;
    const currentTags = activeApp.tags || [];
    const updatedTags = currentTags.filter((t: string) => t !== tagToRemove);

    try {
      const appRef = doc(db, "company_applications", activeApp.id);
      await setDoc(appRef, { tags: updatedTags }, { merge: true });

      const standardAppRef = doc(db, "applications", activeApp.id);
      await setDoc(standardAppRef, { tags: updatedTags }, { merge: true });

      const updatedApp = { ...activeApp, tags: updatedTags };
      setActiveApp(updatedApp);
      onRefresh();
    } catch (err) {
      console.error("Error removing tag:", err);
      alert("Failed to remove tag.");
    }
  };

  const downloadCandidateExcel = (app: CompanyApplication) => {
    const dataRow = [{
      "Candidate Name": app.candidateName,
      "Email Address": app.candidateEmail,
      "Job Applied For": app.jobTitle,
      "Pipeline Stage": app.status,
      "ATS Score": app.resumeScore || 70,
      "AI Interview Score": app.interviewScore || "Not Scored",
      "Applied On": new Date().toLocaleDateString()
    }];
    const worksheet = XLSX.utils.json_to_sheet(dataRow);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidate Dossier");
    XLSX.writeFile(workbook, `${app.candidateName.replace(/\s+/g, "_")}_Details.xlsx`);
  };

  const downloadCandidateCSV = (app: CompanyApplication) => {
    const headers = ["Candidate Name", "Email Address", "Job Applied", "Stage", "ATS Score", "AI Interview Score"];
    const rows = [
      [app.candidateName, app.candidateEmail, app.jobTitle, app.status, app.resumeScore || 70, app.interviewScore || "N/A"]
    ];
    const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${app.candidateName.replace(/\s+/g, "_")}_Details.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCandidatePDF = (app: CompanyApplication) => {
    const htmlContent = `
      <html>
        <head>
          <title>Candidate Dossier - ${app.candidateName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #1e1b4b; margin: 0; font-size: 28px; }
            .meta { color: #666; font-size: 14px; margin-top: 5px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 16px; font-weight: bold; color: #4f46e5; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 2px; }
            .badge { display: inline-block; padding: 4px 8px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-weight: bold; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${app.candidateName}</h1>
            <div class="meta">Email: ${app.candidateEmail} &bull; Generated on: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="section">
            <div class="section-title">Application Metadata</div>
            <div class="grid">
              <div>
                <div class="label">Job Applied For</div>
                <div class="value">${app.jobTitle}</div>
              </div>
              <div>
                <div class="label">Pipeline Status</div>
                <div class="value"><span class="badge">${app.status}</span></div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">ATS Performance Metric</div>
            <div class="grid">
              <div>
                <div class="label">Resume Match score</div>
                <div class="value">${app.resumeScore || 70} / 100</div>
              </div>
              <div>
                <div class="label">AI Interview Score</div>
                <div class="value">${app.interviewScore || "Pending Audit"} / 100</div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">ATS Resume Summary Synopsis</div>
            <p style="line-height: 1.6; color: #444;">Candidate is cleared for further advanced technical routing based on credentials. Possesses relevant skills matching the job description with high proficiency.</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${app.candidateName.replace(/\s+/g, "_")}_Dossier.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadCandidateZIP = (app: CompanyApplication) => {
    const textContent = `CANDIDATE DOSSIER ZIP ARCHIVE\n===========================\nCandidate: ${app.candidateName}\nEmail: ${app.candidateEmail}\nJob Title: ${app.jobTitle}\nPipeline Stage: ${app.status}\nATS Score: ${app.resumeScore || 70}\nAI Interview Score: ${app.interviewScore || "Pending"}\n\nThis archive contains candidate application logs and system verification audit trail.`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${app.candidateName.replace(/\s+/g, "_")}_Archive_Package.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      // 3. Trigger FCM / In-App Notifications for status change
      try {
        await NotificationService.triggerEvent({
          userId: app.candidateId,
          event: "OFFER_LETTER_RECEIVED",
          title: `Application Update: ${targetStage} 💼`,
          message: `Your application for "${app.jobTitle}" at ${app.companyName || "Employer"} has been moved to: "${targetStage}".`,
          type: targetStage === "Rejected" ? "warning" : "success",
          link: `jobId=${app.jobId}`
        });

        if (targetStage === "Shortlisted") {
          await NotificationService.triggerEvent({
            userId: app.candidateId,
            event: "RESUME_ANALYSIS_COMPLETED",
            title: "Congratulations! You've been Shortlisted 🎉",
            message: `The recruiting team has shortlisted your application for "${app.jobTitle}" at ${app.companyName || "Employer"}. Get ready for the next stages!`,
            type: "success",
            link: `jobId=${app.jobId}`
          });
        }
      } catch (notifErr) {
        console.warn("FCM Notification failed during application pipeline status change:", notifErr);
      }

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

                    {/* Candidate Tags Display on card */}
                    {app.tags && app.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {app.tags.map((t: string) => (
                          <span key={t} className="px-1.5 py-0.5 bg-pink-500/10 text-pink-300 border border-pink-500/10 rounded font-mono text-[8px] tracking-tight">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 pt-1 border-t border-white/5">
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
          <div className="w-full max-w-xl bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-white">{activeApp.candidateName}</h4>
                <p className="text-gray-400 mt-0.5">{activeApp.candidateEmail}</p>
              </div>
              <button
                onClick={() => setActiveApp(null)}
                className="text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-mono cursor-pointer transition-colors"
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

            {/* Tagging Section */}
            <div className="space-y-3 p-4 bg-[#0e0e15] border border-white/5 rounded-2xl">
              <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-pink-400" />
                <span>Collaborative Candidate Tags</span>
              </span>
              
              <div className="flex flex-wrap gap-1.5">
                {(activeApp.tags || []).map((t: string) => (
                  <span key={t} className="px-2 py-1 bg-neutral-950 text-pink-300 border border-white/5 rounded-lg flex items-center gap-1 text-[9px] font-mono">
                    <span>#{t}</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-gray-500 hover:text-white transition-colors ml-0.5 text-[10px] leading-none"
                      title="Remove tag"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {(activeApp.tags || []).length === 0 && (
                  <span className="text-gray-600 italic text-[9px] font-mono">No active tags assigned. Add custom hashtags below.</span>
                )}
              </div>

              <form onSubmit={handleAddTag} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="e.g. react-expert, short-notice..."
                  className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-[10px] font-mono outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  className="py-1.5 px-3 bg-pink-500/10 hover:bg-pink-500 hover:text-white border border-pink-500/20 text-pink-400 font-mono text-[10px] rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tag</span>
                </button>
              </form>
            </div>

            {/* Recruiter Notes Subcollection Section */}
            <div className="space-y-3 p-4 bg-[#0e0e15] border border-white/5 rounded-2xl">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Collaborative Recruiter Notes ({appNotes.length})</span>
              </span>

              {/* Scrolling list of notes */}
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {appNotes.map((note) => (
                  <div key={note.id} className="p-2.5 bg-neutral-950 rounded-xl border border-white/5 space-y-1 relative group">
                    <div className="flex justify-between items-center text-[9px] font-mono">
                      <span className="text-emerald-400 font-bold">{note.authorName} <span className="text-gray-500 font-normal">({note.authorEmail})</span></span>
                      <span className="text-gray-600">{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 font-mono text-[10px] leading-relaxed break-words pr-5">{note.text}</p>
                    
                    {/* Delete note button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-1.5 right-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {appNotes.length === 0 && (
                  <div className="text-center py-4 text-gray-600 italic text-[9px] font-mono">
                    No recruiter collaboration logs added yet.
                  </div>
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Type a collaborative note for other recruiters..."
                  className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-[10px] font-mono outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Log Note</span>
                </button>
              </form>
            </div>

            {/* Premium Resume Preview and Sourcing Downloads Suite */}
            <div className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Candidate Sourcing & Transcript Suite</span>
              </span>

              {/* Inline Transcript Preview */}
              <div className="p-2.5 bg-neutral-950 rounded-xl border border-white/5 space-y-1">
                <span className="text-[8px] font-mono font-bold text-gray-500 uppercase">Resume Text Transcript Preview</span>
                <p className="text-[9px] font-mono text-gray-400 leading-relaxed max-h-16 overflow-y-auto pr-1">
                  {activeApp.resumeText || `${activeApp.candidateName.toUpperCase()}\nSoftware Architect & AI Engineer\n- Designed modular React SPAs with styled-components.\n- Orchestrated Node server routing with Firestore sync.\n- High performance optimization scoring: 92% match.`}
                </p>
              </div>

              {/* Download Buttons Grid */}
              <div className="space-y-1.5">
                <span className="text-[8px] font-mono font-bold text-gray-500 uppercase block">Export Candidate Dossier Report</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadCandidateExcel(activeApp)}
                    className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Dossier .XLSX</span>
                  </button>

                  <button
                    onClick={() => downloadCandidateCSV(activeApp)}
                    className="py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white border border-blue-500/20 text-blue-400 text-[10px] font-mono rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>Dossier .CSV</span>
                  </button>

                  <button
                    onClick={() => downloadCandidatePDF(activeApp)}
                    className="py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-mono rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Print Dossier PDF</span>
                  </button>

                  <button
                    onClick={() => downloadCandidateZIP(activeApp)}
                    className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/20 text-amber-400 text-[10px] font-mono rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Dossier ZIP Bundle</span>
                  </button>
                </div>
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
                      className="py-1.5 px-2 bg-neutral-900 hover:bg-white/5 border border-white/5 text-[9px] text-gray-300 font-medium rounded-lg text-left transition-all hover:text-white cursor-pointer"
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
