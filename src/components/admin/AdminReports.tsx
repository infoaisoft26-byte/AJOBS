import { useCallback, useEffect, useState } from "react";
import { auth } from "../../firebase";
import { Activity, BriefcaseBusiness, Download, RefreshCw, Users, Video } from "lucide-react";

type ReportData = {
  summary: Record<string, number>;
  byStage: Record<string, number>;
  interviewStatus: Record<string, number>;
  recruiterPerformance: any[];
  employerPerformance: any[];
  jobPerformance: any[];
  applications: any[];
  auditEvents: any[];
  screeningResults: any[];
  neonSync: string;
  source: string;
  generatedAt: string;
  filters: Record<string, any>;
};

const number = (value: any) => Number(value || 0).toLocaleString("en-IN");
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [jobId, setJobId] = useState("");
  const [recruiterId, setRecruiterId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [page, setPage] = useState(1);

  const queryString = () => {
    const p = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (jobId.trim()) p.set("jobId", jobId.trim());
    if (recruiterId.trim()) p.set("recruiterId", recruiterId.trim());
    if (employerId.trim()) p.set("employerId", employerId.trim());
    return p.toString();
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in with an active Admin account.");
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/reports?" + queryString(), {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Reports could not be loaded.");
      setData(result);
    } catch (e: any) {
      setError(e?.message || "Reports could not be loaded.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, jobId, recruiterId, employerId, page]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Admin sign-in required.");
      const response = await fetch("/api/admin/reports?" + queryString() + "&format=csv", {
        headers: { Authorization: "Bearer " + await user.getIdToken() },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("CSV export failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "aijobs-applications-report.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e?.message || "CSV export failed."); }
  };

  const cards = [
    ["Total Users", data?.summary.totalUsers, Users],
    ["Candidates", data?.summary.candidates, Users],
    ["Recruiters", data?.summary.recruiters, Users],
    ["Employers", data?.summary.employers, BriefcaseBusiness],
    ["Live Jobs", data?.summary.activeJobs, BriefcaseBusiness],
    ["Applications", data?.summary.totalApplications, Activity],
    ["Interviews", data?.summary.totalInterviews, Video],
    ["Screening Evaluations", data?.summary.screeningEvaluations, Activity],
  ] as const;

  return <div className="space-y-5 text-slate-100">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950 p-5">
      <div><h2 className="text-xl font-bold">AIJOBS Complete Reports</h2><p className="mt-1 text-xs text-slate-400">Live records • candidate, recruiter, employer and hiring activity</p></div>
      <div className="flex gap-2">
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15}/>Refresh</button>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold"><Download size={15}/>Export CSV</button>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([title,value,Icon]) => <div key={title} className="rounded-xl border border-white/10 bg-slate-900 p-4"><div className="flex items-center justify-between text-slate-400"><span className="text-xs">{title}</span><Icon size={16}/></div><div className="mt-2 text-2xl font-bold">{loading ? "—" : number(value)}</div></div>)}
    </div>
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-slate-950 p-4 md:grid-cols-5">
      <label className="text-xs text-slate-400">From date<input type="date" value={startDate} onChange={e=>{setPage(1);setStartDate(e.target.value)}} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label>
      <label className="text-xs text-slate-400">To date<input type="date" value={endDate} onChange={e=>{setPage(1);setEndDate(e.target.value)}} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label>
      <label className="text-xs text-slate-400">Job ID<input value={jobId} onChange={e=>{setPage(1);setJobId(e.target.value)}} placeholder="All jobs" className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label>
      <label className="text-xs text-slate-400">Recruiter ID<input value={recruiterId} onChange={e=>{setPage(1);setRecruiterId(e.target.value)}} placeholder="All recruiters" className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label>
      <label className="text-xs text-slate-400">Employer ID<input value={employerId} onChange={e=>{setPage(1);setEmployerId(e.target.value)}} placeholder="All employers" className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label>
    </div>
    {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}
    {loading && <div className="rounded-xl border border-white/10 p-8 text-center text-slate-400">Loading live reports…</div>}
    {!loading && data && <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-slate-950 p-4"><h3 className="mb-3 font-semibold">Application Pipeline</h3>{Object.entries(data.byStage || {}).length ? Object.entries(data.byStage).sort((a,b)=>b[1]-a[1]).map(([k,v])=><div key={k} className="mb-2 flex justify-between border-b border-white/5 py-2 text-sm"><span>{label(k)}</span><b>{number(v)}</b></div>) : <p className="text-sm text-slate-500">No application records for this filter.</p>}</section>
        <section className="rounded-xl border border-white/10 bg-slate-950 p-4"><h3 className="mb-3 font-semibold">Interview Status</h3>{Object.entries(data.interviewStatus || {}).length ? Object.entries(data.interviewStatus).map(([k,v])=><div key={k} className="mb-2 flex justify-between border-b border-white/5 py-2 text-sm"><span>{label(k)}</span><b>{number(v)}</b></div>) : <p className="text-sm text-slate-500">No interview records found.</p>}</section>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {[[ "Recruiter Performance", data.recruiterPerformance, ["applications","interviews","shortlisted","hired"] ],[ "Employer Performance", data.employerPerformance, ["applications","interviews","hired"] ],[ "Job Performance", data.jobPerformance, ["applications","shortlisted","interviews","hired"] ]] .map(([title,rows,fields]:any)=><section key={title} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-4"><h3 className="mb-3 font-semibold">{title}</h3>{rows.length ? rows.slice(0,12).map((row:any)=><div key={row.id} className="mb-2 border-b border-white/5 pb-2"><div className="truncate text-xs text-slate-300">{row.title || row.id}</div><div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">{fields.map((field:string)=><span key={field}>{label(field)}: <b className="text-white">{number(row[field])}</b></span>)}</div></div>) : <p className="text-sm text-slate-500">No matching records.</p>}</section>)}
      </div>
      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-950"><div className="border-b border-white/10 p-4 font-semibold">Recent Applications</div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-white/5 text-slate-400"><tr>{["Candidate","Job","Recruiter ID","Employer ID","Status","Applied"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{data.applications.map((a:any)=><tr key={a.id} className="border-t border-white/5"><td className="p-3">{a.candidateName || a.candidateId || "—"}</td><td className="p-3">{a.jobTitle || a.jobId || "—"}</td><td className="p-3">{a.recruiterId || "—"}</td><td className="p-3">{a.employerId || "—"}</td><td className="p-3">{label(a.status)}</td><td className="p-3">{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{!data.applications.length && <p className="p-5 text-sm text-slate-500">No applications in this result page.</p>}</div><div className="flex items-center justify-end gap-3 p-3 text-xs"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded border border-white/15 px-3 py-1 disabled:opacity-30">Previous</button><span>Page {page}</span><button disabled={data.applications.length<25} onClick={()=>setPage(p=>p+1)} className="rounded border border-white/15 px-3 py-1 disabled:opacity-30">Next</button></div></section>
      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-950"><div className="border-b border-white/10 p-4 font-semibold">Real Audit Trail</div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-white/5 text-slate-400"><tr>{["Time","Action","Actor","Role","Details"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{data.auditEvents.map((a:any)=><tr key={a.id} className="border-t border-white/5"><td className="p-3">{a.occurredAt ? new Date(a.occurredAt).toLocaleString() : "—"}</td><td className="p-3">{a.action}</td><td className="p-3">{a.actorEmail || a.actorUid || "—"}</td><td className="p-3">{a.actorRole || "—"}</td><td className="max-w-sm truncate p-3">{a.details}</td></tr>)}</tbody></table>{!data.auditEvents.length && <p className="p-5 text-sm text-slate-500">No real audit events found. No sample events are shown.</p>}</div></section>
      <p className="text-[11px] text-slate-500">Source: {data.source}. Neon mirror: {data.neonSync}. Generated {new Date(data.generatedAt).toLocaleString()}.</p>
    </>}
  </div>;
}
