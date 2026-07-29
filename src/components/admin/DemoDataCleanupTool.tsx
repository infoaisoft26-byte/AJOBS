import React, { useState } from "react";
import { Trash2, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw, Layers } from "lucide-react";

export default function DemoDataCleanupTool({ adminUserId }: { adminUserId: string }) {
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDryRunScan = async () => {
    setLoading(true);
    setError(null);
    setDryRunResult(null);
    setExecutionResult(null);

    try {
      const res = await fetch("/api/cleanup-demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, adminUserId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to scan demo data.");
      }

      setDryRunResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to perform dry run scan.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (confirmInput !== "CONFIRM_DELETE_DEMO_DATA") {
      setError("Please type exactly 'CONFIRM_DELETE_DEMO_DATA' to authorize execution.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cleanup-demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: false,
          confirmToken: "CONFIRM_DELETE_DEMO_DATA",
          adminUserId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to execute demo data cleanup.");
      }

      setExecutionResult(data);
      setDryRunResult(null);
      setConfirmInput("");
    } catch (err: any) {
      setError(err.message || "Failed to execute cleanup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 glass p-6 rounded-2xl border border-red-500/20 bg-red-950/10 text-white" id="demo-data-cleanup-tool">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-red-400">
          <Trash2 className="w-5 h-5" />
          <span>Production Demo & Mock Data Cleanup Utility</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Scans and purges seeded demo records, test jobs, fake candidates, and mock applications across Firestore collections to prepare the platform for real live users.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {executionResult && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Demo Data Purge Executed Successfully!</span>
          </div>
          <p className="text-gray-300">Total documents deleted: <span className="font-mono text-emerald-400 font-bold">{executionResult.totalDeleted}</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 font-mono text-[11px]">
            {Object.entries(executionResult.details || {}).map(([col, count]) => (
              <div key={col} className="bg-black/40 p-2 rounded border border-white/5">
                <span className="text-gray-400">{col}: </span>
                <span className="text-white font-bold">{String(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={handleDryRunScan}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
          <span>1. Run Dry-Run Inspection Scan</span>
        </button>
      </div>

      {/* Dry Run Report */}
      {dryRunResult && (
        <div className="p-4 bg-gray-900/60 border border-white/10 rounded-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-amber-400">Dry-Run Inspection Results</span>
            <span className="font-mono text-gray-400">Total Identified: <strong className="text-white">{dryRunResult.totalIdentified}</strong> demo records</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            {Object.entries(dryRunResult.summary || {}).map(([col, count]) => (
              <div key={col} className="bg-black/50 p-2.5 rounded-lg border border-white/5 flex justify-between">
                <span className="text-gray-400">{col}:</span>
                <span className="text-amber-300 font-bold">{String(count)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/10 space-y-3">
            <label className="block text-gray-300 font-medium">To execute permanent deletion, type <code className="text-red-400 bg-red-950/50 px-1 py-0.5 rounded font-mono">CONFIRM_DELETE_DEMO_DATA</code> below:</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="CONFIRM_DELETE_DEMO_DATA"
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleExecuteCleanup}
                disabled={loading || confirmInput !== "CONFIRM_DELETE_DEMO_DATA"}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>2. Execute Permanent Cleanup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
