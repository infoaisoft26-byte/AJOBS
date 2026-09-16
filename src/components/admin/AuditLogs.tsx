import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Download, RefreshCw, Search, ShieldAlert, Terminal } from "lucide-react";
import { db } from "../../firebase";
import { useToast } from "../GlobalToast";

interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  role?: string;
  action?: string;
  details?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: any;
  ipAddress?: string;
  deviceInfo?: string;
}

interface AuditLogsProps {
  logs?: any;
  onRefresh?: any;
}

function asIso(value: any) {
  if (!value) return "";
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export default function AuditLogs({}: AuditLogsProps = {}) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [securityOnly, setSecurityOnly] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, "activity_logs"), orderBy("createdAt", "desc")));
      } catch {
        snap = await getDocs(collection(db, "activity_logs"));
      }
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
      rows.sort((a, b) => new Date(asIso(b.createdAt) || 0).getTime() - new Date(asIso(a.createdAt) || 0).getTime());
      setLogs(rows);
    } catch (error) {
      console.error("[AuditLogs] Firestore load failed:", error);
      setLogs([]);
      showToast("Could not load live audit records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const action = String(log.action || "").toUpperCase();
      if (securityOnly && !["ROLE", "ELEVAT", "ABAC", "POLICY", "SECURITY", "PERMISSION", "AUTH"].some((term) => action.includes(term))) return false;
      if (!q) return true;
      return [log.id, log.userName, log.role, log.action, log.details, log.entityId]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [logs, searchQuery, securityOnly]);

  const exportCsv = () => {
    if (!filtered.length) {
      showToast("No live audit records to export.", "warning");
      return;
    }
    const rows = filtered.map((log) => [
      log.id,
      asIso(log.createdAt),
      log.userName || "",
      log.role || "",
      log.action || "",
      String(log.details || "").replace(/"/g, '""'),
      log.entityType || "",
      log.entityId || "",
      log.ipAddress || ""
    ]);
    const csv = [
      ["ID", "Created At", "User", "Role", "Action", "Details", "Entity Type", "Entity ID", "IP"],
      ...rows
    ].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aijobs_live_audit_${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="system-audit-logs-portal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Terminal className="w-5 h-5 text-indigo-400" /> Live Audit Logs</h3>
          <p className="text-xs text-gray-400 mt-1">Only records stored in Firestore are displayed. Seeded security events and demo operators have been removed.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} disabled={loading} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCsv} className="px-3 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search real audit records..." className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white" />
        </div>
        <button onClick={() => setSecurityOnly((v) => !v)} className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${securityOnly ? "bg-red-500/15 border-red-500/30 text-red-300" : "bg-white/5 border-white/10 text-gray-300"}`}>
          <ShieldAlert className="w-4 h-4" /> {securityOnly ? "Security only" : "All live logs"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading live Firestore audit records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><p className="text-sm text-gray-300">No live audit records found.</p><p className="text-xs text-gray-500 mt-1">Nothing synthetic will be shown as a fallback.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 text-gray-400 uppercase"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Details</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]"><td className="px-4 py-3 text-gray-400 whitespace-nowrap">{asIso(log.createdAt) ? new Date(asIso(log.createdAt)).toLocaleString() : "N/A"}</td><td className="px-4 py-3"><div className="text-white font-semibold">{log.userName || log.userId || "System"}</div><div className="text-gray-500">{log.role || ""}</div></td><td className="px-4 py-3 text-indigo-300 font-mono">{log.action || "EVENT"}</td><td className="px-4 py-3 text-gray-300 max-w-xl">{log.details || ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
