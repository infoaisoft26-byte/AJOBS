import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  MessageSquare,
  RefreshCw,
  Briefcase,
  MapPin,
  FileText,
  AlertCircle,
  Loader2
} from "lucide-react";
import { auth } from "../../firebase";

interface RecruiterLeadsProps {
  onOpenLiveChat?: (id: string, name: string) => void;
}

type LeadStatus = "uncontacted" | "in_discussion" | "interested" | "converted";

interface LiveRecruiterLead {
  id: string;
  sourceType: "application" | "candidate_lead" | "lead" | string;
  sourceRefId: string;
  candidateId?: string | null;
  candidateName: string;
  email: string;
  phone: string;
  location?: string;
  experience?: string;
  qualification?: string;
  skills: string[];
  resumeUrl?: string;
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  source?: string;
  assignedBy?: string;
  assignedAt?: string;
  status: LeadStatus;
  applicationStatus?: string;
}

function formatDate(value?: string) {
  if (!value) return "Just now";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function RecruiterLeads({ onOpenLiveChat }: RecruiterLeadsProps) {
  const [leads, setLeads] = useState<LiveRecruiterLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");

  const loadLeads = async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again to load candidate leads.");
      const token = await user.getIdToken(true);
      const res = await fetch("/api/recruiter/live-leads", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || data.error || "Unable to load live leads.");
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (err: any) {
      setError(err?.message || "Unable to load live candidate leads.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeads();
    const timer = window.setInterval(() => loadLeads(true), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const updateLeadStatus = async (lead: LiveRecruiterLead, status: LeadStatus) => {
    const previous = lead.status;
    setLeads(current => current.map(item => item.id === lead.id ? { ...item, status } : item));
    setSavingId(lead.id);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const res = await fetch("/api/recruiter/live-leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: lead.sourceRefId || lead.id,
          sourceType: lead.sourceType,
          status
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || data.error || "Lead status update failed.");
    } catch (err: any) {
      setLeads(current => current.map(item => item.id === lead.id ? { ...item, status: previous } : item));
      setError(err?.message || "Lead status update failed.");
    } finally {
      setSavingId("");
    }
  };

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(lead => [
      lead.candidateName,
      lead.email,
      lead.phone,
      lead.jobTitle,
      lead.companyName,
      lead.location
    ].some(value => String(value || "").toLowerCase().includes(q)));
  }, [leads, search]);

  return (
    <div className="space-y-6" id="recruiter-leads-page">
      <div className="flex flex-col gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>LIVE CANDIDATE APPLICATION LEADS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">Job Apply Leads</h2>
            <p className="text-xs text-slate-400">Real candidates who applied to jobs owned by your recruiter workspace. No demo leads.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
              {leads.length} Live Leads
            </span>
            <button
              type="button"
              onClick={() => loadLeads(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search candidate, mobile, email, job or company..."
          className="w-full bg-[#0e0a14] border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-400" />
            Loading real candidate applications...
          </div>
        ) : visibleLeads.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-9 h-9 mx-auto mb-3 text-slate-600" />
            <div className="text-sm font-bold text-white">No live leads yet</div>
            <div className="text-xs text-slate-500 mt-1">As soon as a candidate applies to your live job, the lead will appear here automatically.</div>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300 min-w-[980px]">
            <thead className="border-b border-purple-500/20 text-[11px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="pb-3 font-semibold">Candidate</th>
                <th className="pb-3 font-semibold">Applied Job</th>
                <th className="pb-3 font-semibold">Profile</th>
                <th className="pb-3 font-semibold">Captured</th>
                <th className="pb-3 font-semibold">Lead Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {visibleLeads.map(lead => (
                <tr key={`${lead.sourceType}:${lead.id}`} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 pr-4 align-top">
                    <div className="font-extrabold text-white text-sm">{lead.candidateName}</div>
                    <div className="text-[11px] text-cyan-300">{lead.email || "Email not provided"}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{lead.phone || "Mobile not provided"}</div>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <div className="font-bold text-white inline-flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-purple-400" />{lead.jobTitle || "Job Application"}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{lead.companyName || "AIJOBS Partner"}</div>
                    <div className="text-[10px] text-emerald-300 mt-1 uppercase font-mono">{lead.source || lead.sourceType}</div>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <div className="text-slate-300 font-medium">{lead.experience || "Experience not added"}</div>
                    {lead.location && <div className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{lead.location}</div>}
                    {lead.resumeUrl && (
                      <div className="mt-1">
                        <a href={lead.resumeUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Resume
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="py-4 pr-4 align-top text-slate-400">
                    <div>{formatDate(lead.assignedAt)}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Application: {lead.applicationStatus || "new"}</div>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <select
                      value={lead.status}
                      disabled={savingId === lead.id}
                      onChange={e => updateLeadStatus(lead, e.target.value as LeadStatus)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-xs font-bold text-white capitalize focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="uncontacted">Uncontacted</option>
                      <option value="in_discussion">In Discussion</option>
                      <option value="interested">Interested</option>
                      <option value="converted">Converted to Pipeline</option>
                    </select>
                  </td>
                  <td className="py-4 text-right align-top">
                    <button
                      onClick={() => onOpenLiveChat?.(lead.candidateId || lead.id, lead.candidateName)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Contact
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
