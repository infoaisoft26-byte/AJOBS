import React, { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, MapPin, Briefcase, UserCheck, MessageSquare, Loader2, Users, AlertCircle } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { RecruiterJob } from "./RecruiterTypes";

interface RecruiterFindCandidatesProps {
  userId: string;
  assignedJobs: RecruiterJob[];
  onAssigned?: () => void;
  onOpenLiveChat?: (id: string, name: string) => void;
}

interface RealCandidate {
  id: string;
  name: string;
  role: string;
  skills: string[];
  experience: string;
  location: string;
  email: string;
  resumeUrl: string;
  summary: string;
}

export default function RecruiterFindCandidates({ userId, assignedJobs, onAssigned, onOpenLiveChat }: RecruiterFindCandidatesProps) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [candidates, setCandidates] = useState<RealCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState("");
  const [assignedKeys, setAssignedKeys] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedJobId && assignedJobs.length) setSelectedJobId(assignedJobs[0].id);
  }, [assignedJobs, selectedJobId]);

  useEffect(() => {
    let active = true;
    const loadCandidates = async () => {
      setLoading(true);
      setError("");
      try {
        const merged = new Map<string, any>();
        for (const collectionName of ["candidateProfiles", "candidate_profiles", "candidates"]) {
          try {
            const snap = await getDocs(collection(db, collectionName));
            snap.forEach((item) => {
              const data = item.data() as any;
              const id = String(data.uid || data.userId || data.candidateId || item.id);
              merged.set(id, { ...(merged.get(id) || {}), ...data, id });
            });
          } catch (readError) {
            console.warn("[RecruiterFindCandidates] Candidate source skipped:", collectionName, readError);
          }
        }
        const rows: RealCandidate[] = Array.from(merged.values()).map((item: any) => ({
          id: item.id,
          name: item.fullName || item.name || item.displayName || "Candidate",
          role: item.currentTitle || item.targetRole || item.designation || "Role not specified",
          skills: Array.isArray(item.skills) ? item.skills.filter((v: any) => typeof v === "string") : Array.isArray(item.technicalSkills) ? item.technicalSkills.filter((v: any) => typeof v === "string") : [],
          experience: String(item.experience ?? item.totalExperience ?? item.experienceYears ?? "Not provided"),
          location: item.location || item.currentLocation || "Not provided",
          email: item.email || item.candidateEmail || "",
          resumeUrl: item.resumeUrl || item.resumeURL || "",
          summary: item.professionalSummary || item.summary || item.about || ""
        })).filter(item => item.id && item.name !== "Candidate");
        if (active) setCandidates(rows);
      } catch (err: any) {
        if (active) setError(err?.message || "Unable to load candidate profiles.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCandidates();
    return () => { active = false; };
  }, [userId]);

  const selectedJob = assignedJobs.find(job => job.id === selectedJobId);
  const visibleCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter(candidate => {
      const matchesSearch = !q || [candidate.name, candidate.role, candidate.email, candidate.skills.join(" ")].some(value => value.toLowerCase().includes(q));
      const matchesLocation = location === "all" || candidate.location.toLowerCase().includes(location.toLowerCase());
      return matchesSearch && matchesLocation;
    }).map(candidate => {
      const required = selectedJob?.skillsRequired || [];
      const candidateSkills = candidate.skills.map(skill => skill.toLowerCase());
      const matchedSkills = required.filter(skill => candidateSkills.some(value => value.includes(skill.toLowerCase()) || skill.toLowerCase().includes(value)));
      return { ...candidate, matchedSkills, requiredSkills: required };
    });
  }, [candidates, search, location, selectedJob]);

  const assignCandidate = async (candidate: RealCandidate) => {
    if (!selectedJob || !userId) return;
    const key = selectedJob.id + ":" + candidate.id;
    setAssigningId(key);
    setError("");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Please sign in again.");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/recruiter/live-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ candidateId: candidate.id, jobId: selectedJob.id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || data.error || "Candidate could not be assigned.");
      setAssignedKeys(previous => [...previous, key]);
      onAssigned?.();
    } catch (err: any) {
      setError(err?.message || "Candidate assignment failed.");
    } finally {
      setAssigningId("");
    }
  };

  return (
    <div className="space-y-6" id="recruiter-find-candidates-page">
      <div className="flex flex-col gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /><span>LIVE CANDIDATE DATABASE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Find & Assign Candidates</h2>
          <p className="text-xs text-slate-400">Profiles are loaded from candidate records. Skill overlap is calculated against the selected real job posting; no AI score is invented.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search candidate, role, email or skills..." className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400" />
          </div>
          <select value={selectedJobId} onChange={event => setSelectedJobId(event.target.value)} className="w-full px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs">
            <option value="">Select an assigned job posting</option>
            {assignedJobs.map(job => <option key={job.id} value={job.id}>{job.title} · {job.companyName}</option>)}
          </select>
        </div>
        <select value={location} onChange={event => setLocation(event.target.value)} className="w-full sm:w-64 px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs">
          <option value="all">All Locations</option><option value="Bengaluru">Bengaluru</option><option value="Pune">Pune</option><option value="Hyderabad">Hyderabad</option><option value="Delhi">Delhi NCR</option>
        </select>
      </div>
      {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
      {!assignedJobs.length ? <div className="p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 text-sm text-slate-400">No real job postings are assigned to your recruiter account yet. Ask the admin to assign a published job mandate.</div>
      : loading ? <div className="p-12 text-center text-slate-400 text-xs"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />Loading real candidate profiles…</div>
      : !visibleCandidates.length ? <div className="p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 text-sm text-slate-400"><Users className="w-6 h-6 mb-2" />No candidate profiles match this search in the database.</div>
      : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCandidates.map(candidate => {
          const key = selectedJobId + ":" + candidate.id;
          const assigned = assignedKeys.includes(key);
          return <div key={candidate.id} className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-base font-extrabold text-white">{candidate.name}</h3><p className="text-xs text-slate-300">{candidate.role}</p><span className="text-[10px] text-slate-400">{candidate.experience} · {candidate.location}</span></div>
              <span className="text-[10px] text-slate-400 border border-white/10 rounded-lg px-2 py-1">Database profile</span>
            </div>
            {candidate.summary && <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{candidate.summary}</p>}
            <div className="flex flex-wrap gap-1">{candidate.skills.map(skill => <span key={skill} className="px-2 py-0.5 rounded-md bg-[#0e0a14] text-slate-300 text-[10px]">{skill}</span>)}</div>
            {selectedJob && <div className="p-3 rounded-xl bg-[#0e0a14] border border-purple-500/20 space-y-1">
              <div className="text-[10px] text-cyan-300 font-bold uppercase">Selected job: {selectedJob.title}</div>
              <div className="text-[11px] text-slate-300">Required skills matched: {candidate.matchedSkills.length} of {candidate.requiredSkills.length || "not specified"}</div>
              <div className="text-[10px] text-slate-500">{candidate.matchedSkills.length ? "Matched: " + candidate.matchedSkills.join(", ") : "No overlapping required skills found in the saved profile."}</div>
            </div>}
            <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2">
              <button disabled={!selectedJob || assigned || assigningId === key} onClick={() => assignCandidate(candidate)} className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
                {assigningId === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}{assigned ? "Assigned to Job" : "Assign to Selected Job"}
              </button>
              <button onClick={() => onOpenLiveChat?.(candidate.id, candidate.name)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300" title="Message candidate"><MessageSquare className="w-4 h-4" /></button>
            </div>
          </div>;
        })}
      </div>}
    </div>
  );
}
