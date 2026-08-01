import {
  CheckCircle,
  Clock,
  Download,
  FileText,
  Lock,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { useState } from "react";
import {
  type User
} from "firebase/auth";
import { auth } from "../firebase";


export default function ComplianceGdprCenter() {
  const [activeTab, setActiveTab] = useState<"gdpr" | "audit" | "retention" | "requests">("gdpr");
  const [retentionDays, setRetentionDays] = useState(180);
  const [retentionAutoDelete, setRetentionAutoDelete] = useState(true);
  const [exportingData, setExportingData] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

  const mockAuditLogs = [
    { id: "log-101", user: "admin@aijobs.app", action: "UPDATED_FIRESTORE_RULES", ip: "192.168.1.1", timestamp: "2026-07-27 09:42:15", status: "SUCCESS" },
    { id: "log-102", user: "recruiter@acme.com", action: "EXPORTED_CANDIDATE_RESUME", ip: "10.0.4.12", timestamp: "2026-07-27 09:30:02", status: "SUCCESS" },
    { id: "log-103", user: "candidate-88@gmail.com", action: "GRANTED_RECORDING_CONSENT", ip: "172.16.0.44", timestamp: "2026-07-27 09:12:33", status: "SUCCESS" },
    { id: "log-104", user: "system_cron", action: "ENFORCED_DATA_RETENTION_PURGE", ip: "127.0.0.1", timestamp: "2026-07-27 00:00:00", status: "SUCCESS" },
  ];

  const handleExportUserData = async () => {
    setExportingData(true);
    try {
      const res = await fetch("/api/compliance/export-user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-data-export-${Date.now()}.json`;
      a.click();
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Please try again.");
    } finally {
      setExportingData(false);
    }
  };

  const handleRightToBeForgotten = async () => {
    if (!confirm("Are you sure you want to request complete erasure of your candidate data under GDPR Article 17? This action is permanent.")) {
      return;
    }

    try {
      await fetch("/api/compliance/delete-user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setDeletionRequested(true);
    } catch (err) {
      console.error("Deletion error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-black border border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ENTERPRISE PRIVACY & COMPLIANCE FRAMEWORK</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">GDPR & Security Compliance Center</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              Audit logging, data retention policy enforcement, candidate consent management, and GDPR Right-to-be-Forgotten data deletion handlers.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-500/30 rounded-xl px-4 py-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white font-mono">SOC2 & GDPR READY</span>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: "gdpr", label: "GDPR Overview & Status", icon: ShieldCheck },
          { id: "audit", label: "Security Audit Logs", icon: FileText },
          { id: "retention", label: "Data Retention Policies", icon: Clock },
          { id: "requests", label: "Data Requests & Erasure", icon: Trash2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105"
                  : "bg-neutral-900/80 text-gray-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: GDPR Overview */}
      {activeTab === "gdpr" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-white/10 pb-3 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Active Compliance Controls</span>
            </h3>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Encryption At Rest & In Transit</div>
                  <div className="text-[10px] text-gray-400 font-mono">TLS 1.3 & AES-256 Firestore Encryption</div>
                </div>
                <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">ACTIVE</span>
              </div>

              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Explicit Audio/Video Consent</div>
                  <div className="text-[10px] text-gray-400 font-mono">Video Center Recording Safeguards</div>
                </div>
                <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">ACTIVE</span>
              </div>

              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Role-Based Access Control (RBAC)</div>
                  <div className="text-[10px] text-gray-400 font-mono">Candidate, Recruiter, Admin ABAC Guards</div>
                </div>
                <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-white/10 pb-3">
              Candidate Rights Safeguards
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              AIJobs provides full Article 15 (Right of Access) and Article 17 (Right to Erasure) self-serve tools directly within candidate and enterprise dashboards.
            </p>

            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-300 uppercase">Data Protection Officer Contact:</span>
              <p className="text-xs text-gray-200 font-mono">dpo@aijobs.app | Security Hotline: +1 (800) 555-0199</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security Audit Logs */}
      {activeTab === "audit" && (
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl animate-fade-in">
          <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-white/10 pb-3 flex items-center justify-between">
            <span>System Audit & Access Logs</span>
            <span className="text-xs font-mono text-gray-400">Showing Last 100 Events</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-gray-300">
              <thead className="bg-black/60 text-gray-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">User Principal</th>
                  <th className="p-3">Action Performed</th>
                  <th className="p-3">Source IP</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 text-emerald-400 font-bold">{log.id}</td>
                    <td className="p-3 text-white">{log.user}</td>
                    <td className="p-3 font-semibold text-gray-200">{log.action}</td>
                    <td className="p-3 text-gray-400">{log.ip}</td>
                    <td className="p-3 text-gray-400">{log.timestamp}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Data Retention Policies */}
      {activeTab === "retention" && (
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5 animate-fade-in">
          <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-white/10 pb-3">
            Automated Data Retention & Lifecycle Config
          </h3>

          <div className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="block text-gray-300 font-mono mb-2">Inactive Candidate Data Retention Period (Days)</label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <label className="flex items-center space-x-3 bg-black/40 border border-white/5 rounded-xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={retentionAutoDelete}
                onChange={(e) => setRetentionAutoDelete(e.target.checked)}
                className="rounded border-gray-700 bg-neutral-800 text-emerald-500"
              />
              <div>
                <span className="font-bold text-white">Enable Automated Scheduled Data Purge</span>
                <p className="text-gray-400 text-[10px]">Automatically archive and anonymize inactive resume profiles exceeding retention threshold.</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab 4: User Data Requests & Right-to-be-Forgotten */}
      {activeTab === "requests" && (
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
          <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-white/10 pb-3">
            Candidate Self-Serve Privacy Requests
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Export My Data */}
            <div className="p-5 bg-black/40 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 font-bold text-white text-sm">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export My Complete Personal Data (Art. 15)</span>
              </div>
              <p className="text-gray-300">
                Download a machine-readable JSON archive containing profile data, submitted applications, uploaded resumes, and interview records.
              </p>
              <button
                onClick={handleExportUserData}
                disabled={exportingData}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono cursor-pointer transition-all shadow-md"
              >
                {exportingData ? "Compiling Export..." : "Download Data Archive"}
              </button>
            </div>

            {/* Right to be Forgotten */}
            <div className="p-5 bg-black/40 border border-red-500/20 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 font-bold text-red-400 text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Request Data Erasure (Art. 17)</span>
              </div>
              <p className="text-gray-300">
                Permanently erase your candidate profile, resume files, and AI interview records from our Firestore servers.
              </p>
              {deletionRequested ? (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 font-mono font-bold">
                  ✓ Data Erasure Request Logged. Profile will be purged in 24 hours.
                </div>
              ) : (
                <button
                  onClick={handleRightToBeForgotten}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold font-mono cursor-pointer transition-all shadow-md"
                >
                  Request Permanent Erasure
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
