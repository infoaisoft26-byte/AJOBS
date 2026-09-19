import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  Target,
  UserPlus,
  Users
} from "lucide-react";
import { auth } from "../../firebase";
import { parseJsonResponse } from "../../utils/apiHelper";

type MarketingDashboardProps = {
  onOpenLeads?: () => void;
};

export default function MarketingGrowthDashboard({ onOpenLeads }: MarketingDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Admin login required.");
      const token = await user.getIdToken();
      const res = await fetch("/api/hire/admin/analytics-v2", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      const json = await parseJsonResponse(res);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Unable to load marketing analytics.");
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Unable to load marketing analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const campaigns = useMemo(() => {
    const rows = Array.isArray(data?.byCampaign) ? data.byCampaign : [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r: any) =>
      [r.source, r.medium, r.campaign, r.content].some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [data, query]);

  const t = data?.totals || {};

  const cards = [
    { label: "Candidate Registrations", value: t.candidateRegistrations || 0, sub: `Today: ${t.candidateRegistrationsToday || 0}`, icon: UserPlus },
    { label: "Google Candidate Registrations", value: t.googleCandidateRegistrations || 0, sub: `Today: ${t.googleCandidateRegistrationsToday || 0}`, icon: Target },
    { label: "Resume Uploaded", value: t.candidateResumesUploaded || 0, sub: "Candidate profiles with resume", icon: FileText },
    { label: "Candidate Applications", value: t.candidateApplications || 0, sub: "Real application records", icon: CheckCircle2 },
    { label: "Recruiter / Consultancy Leads", value: t.recruiterLeads || 0, sub: `New: ${t.newRecruiterLeads || 0}`, icon: Users },
    { label: "Hiring Registrations", value: t.registrations || 0, sub: `Recruiters: ${t.recruiterRegistrations || 0} • Consultancies: ${t.consultancyRegistrations || 0}`, icon: BriefcaseBusiness }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Google Growth & Marketing Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real candidate acquisition, recruiter leads, UTM/GCLID attribution, registrations and conversions from Firestore.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={onOpenLeads}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Open Lead CRM
          </button>
          <a
            href="/candidate/register?utm_source=google&utm_medium=cpc&utm_campaign=test_candidate_campaign"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-2"
          >
            Candidate Landing Test <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-slate-900/70 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">{label}</span>
              <Icon className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2">{loading ? "…" : value}</div>
            <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">UTM / GCLID Campaign Performance</h3>
            <p className="text-[11px] text-slate-400 mt-1">Source of truth combines first-party marketing events with saved candidate attribution.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search campaign/source..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Source</th>
                <th className="p-3">Medium</th>
                <th className="p-3">Campaign</th>
                <th className="p-3 text-right">Candidate Reg.</th>
                <th className="p-3 text-right">Resumes</th>
                <th className="p-3 text-right">Recruiter Reg.</th>
                <th className="p-3 text-right">Jobs Approved</th>
                <th className="p-3 text-right">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!loading && campaigns.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No campaign attribution records yet.</td></tr>
              ) : campaigns.map((r: any, index: number) => (
                <tr key={`${r.source}-${r.campaign}-${index}`} className="hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-semibold">{r.source || "direct"}</td>
                  <td className="p-3 text-slate-400">{r.medium || "none"}</td>
                  <td className="p-3 text-slate-300">{r.campaign || "none"}</td>
                  <td className="p-3 text-right font-mono text-cyan-300">{r.candidateRegistrations || 0}</td>
                  <td className="p-3 text-right font-mono">{r.resumesUploaded || 0}</td>
                  <td className="p-3 text-right font-mono">{r.registrations || 0}</td>
                  <td className="p-3 text-right font-mono">{r.jobsApproved || 0}</td>
                  <td className="p-3 text-right font-mono text-emerald-300">{r.paidConversions || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-white">Recent Google Candidate Registrations</h3>
          <p className="text-[11px] text-slate-400 mt-1">Candidates carrying GCLID or Google acquisition attribution.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Candidate</th>
                <th className="p-3">City</th>
                <th className="p-3">Campaign</th>
                <th className="p-3">Keyword</th>
                <th className="p-3">Resume</th>
                <th className="p-3">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(data?.recentGoogleCandidates || []).map((c: any) => (
                <tr key={c.uid}>
                  <td className="p-3">
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.email}</div>
                  </td>
                  <td className="p-3 text-slate-300">{c.city || "—"}</td>
                  <td className="p-3 text-slate-300">{c.campaign || "—"}</td>
                  <td className="p-3 text-slate-400">{c.term || "—"}</td>
                  <td className="p-3">{c.resumeUploaded ? <span className="text-emerald-300">Uploaded</span> : <span className="text-amber-300">Pending</span>}</td>
                  <td className="p-3 text-slate-400 font-mono">{c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {!loading && !(data?.recentGoogleCandidates || []).length && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No Google-attributed candidate registrations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
