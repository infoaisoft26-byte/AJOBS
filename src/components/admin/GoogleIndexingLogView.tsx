import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { AlertCircle, CheckCircle2, Clock, Code, ExternalLink, Globe, Logs, Monitor, RefreshCw, Search, Send, Table, Type, View } from "lucide-react";
import { IndexingLogRecord } from "../../../server/googleIndexingService";
import { parseJsonResponse } from "../../utils/apiHelper";

export function GoogleIndexingLogView() {
  const [logs, setLogs] = useState<IndexingLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/indexing/logs");
      const data = await parseJsonResponse(resp);
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn("Failed to fetch Google Indexing logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRetry = async (logId: string) => {
    setRetryingLogId(logId);
    setMsg("");
    try {
      const resp = await fetch("/api/indexing/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId })
      });
      const data = await parseJsonResponse(resp);
      if (data.success) {
        setMsg(`Successfully resubmitted log ${logId} to Google Indexing API!`);
        fetchLogs();
      } else {
        setMsg(`Retry result: ${data.message || data.error || "Submission attempted."}`);
        fetchLogs();
      }
    } catch (err: any) {
      setMsg(`Retry error: ${err?.message || err}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.jobTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.jobId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.jobUrl || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && log.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Google Jobs Organic Indexing Logs</h2>
              <p className="text-sm text-slate-400">
                Monitor organic indexing submissions, response codes, and manual retries via Google Indexing API
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-sm flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-sky-400 hover:text-sky-200">✕</button>
        </div>
      )}

      {/* Domain Verification Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs leading-relaxed space-y-1">
        <div className="font-semibold text-sky-400 text-sm flex items-center gap-2">
          <span>Primary Domain Configured:</span>
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white">https://aijobs1.vercel.app</span>
        </div>
        <p>
          All published job postings automatically generate a public SEO canonical URL (<code className="text-sky-300">https://aijobs1.vercel.app/jobs/&#123;slug&#125;</code>) with Schema.org JobPosting JSON-LD.
          When service account credentials are provided in <code className="text-amber-300">GOOGLE_INDEXING_CLIENT_EMAIL</code> & <code className="text-amber-300">GOOGLE_INDEXING_PRIVATE_KEY</code>, real-time push notifications are transmitted directly to Google's indexing pipeline.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by job title, ID, or canonical URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="SKIPPED_MISSING_CREDENTIALS">SKIPPED (Missing Keys)</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Job Details</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Status & Code</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Submitted By</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Fetching Indexing Logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No indexing logs recorded yet. Create or publish a job to trigger automated indexing!
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{log.jobTitle}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-slate-500">ID: {log.jobId}</span>
                        <a
                          href={log.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1"
                        >
                          View Canonical Page <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                        log.requestType === "URL_UPDATED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {log.requestType}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {log.status === "SUCCESS" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {log.status === "FAILED" && <AlertCircle className="w-4 h-4 text-rose-400" />}
                        {log.status === "SKIPPED_MISSING_CREDENTIALS" && <Clock className="w-4 h-4 text-amber-400" />}
                        
                        <span className={`text-xs font-semibold ${
                          log.status === "SUCCESS" ? "text-emerald-400" : log.status === "FAILED" ? "text-rose-400" : "text-amber-400"
                        }`}>
                          {log.status}
                        </span>
                        {log.responseCode > 0 && (
                          <span className="text-xs font-mono text-slate-500">({log.responseCode})</span>
                        )}
                      </div>
                      {log.error && (
                        <p className="text-xs text-rose-400/80 mt-1 max-w-xs truncate" title={log.error}>
                          {log.error}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs font-mono text-slate-400">
                      {new Date(log.submittedAt).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-400 font-mono">
                      {log.submittedBy}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleRetry(log.id)}
                        disabled={retryingLogId === log.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-medium transition disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        {retryingLogId === log.id ? "Retrying..." : "Retry Indexing"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
