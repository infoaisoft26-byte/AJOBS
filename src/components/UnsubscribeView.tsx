import {
  AlertCircle,
  BellOff,
  CheckCircle2,
  RefreshCw,
  Save,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";

import AIJobsLogo from "./AIJobsLogo";

export default function UnsubscribeView() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [jobAlerts, setJobAlerts] = useState(false);
  const [promotionalEmails, setPromotionalEmails] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tok = searchParams.get("token") || "";
    setToken(tok);

    if (!tok) {
      setErrorMsg("No unsubscribe token provided in link URL.");
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/email/unsubscribe-info?token=${encodeURIComponent(tok)}`);
        const data = await res.json();

        if (data.success) {
          setEmail(data.email || "");
          if (data.preferences) {
            setJobAlerts(!!data.preferences.jobAlerts);
            setPromotionalEmails(!!data.preferences.promotionalEmails);
            setWeeklyDigest(!!data.preferences.weeklyDigest);
          }
        } else {
          setErrorMsg(data.error || "Failed to load unsubscribe settings for this token.");
        }
      } catch (err: any) {
        setErrorMsg("Failed to connect to email preferences server.");
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, []);

  const handleSavePreferences = async (unsubscribeAll: boolean = false) => {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = unsubscribeAll
        ? { token, unsubscribeAll: true }
        : { token, jobAlerts, promotionalEmails, weeklyDigest };

      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        if (unsubscribeAll) {
          setJobAlerts(false);
          setPromotionalEmails(false);
          setWeeklyDigest(false);
          setSuccessMsg("You have successfully unsubscribed from all marketing emails and job alerts.");
        } else {
          setSuccessMsg("Your email preferences have been updated successfully.");
        }
      } else {
        setErrorMsg(data.error || "Failed to save preferences.");
      }
    } catch (err: any) {
      setErrorMsg("An error occurred while updating preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-gray-900/90 border border-blue-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center mb-2">
            <AIJobsLogo className="h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Manage Email Preferences
          </h1>
          {email && (
            <p className="text-xs text-blue-400 font-mono bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 inline-block">
              {email}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs text-gray-400 font-mono">Loading subscription settings...</p>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
              <p className="mt-1 text-[11px] text-red-400">If you believe this is an error, contact support at infoaisoft26@gmail.com</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="font-semibold">{successMsg}</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-6">
            
            {/* Preferences Toggles */}
            <div className="space-y-4">
              
              {/* Job Alerts */}
              <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Job Alerts</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Instant alerts when new admin-approved jobs match your profile.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={jobAlerts}
                  onChange={(e) => setJobAlerts(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500/40 cursor-pointer"
                />
              </div>

              {/* Weekly Recommendations */}
              <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all">
                <div>
                  <div className="text-sm font-bold text-white">
                    Weekly Job Digest
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Weekly roundup of top curated active opportunities.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500/40 cursor-pointer"
                />
              </div>

              {/* Promotional Updates */}
              <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all">
                <div>
                  <div className="text-sm font-bold text-white">
                    Platform Updates & Career Tips
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    New AI features, resume benchmarks, and career guidance.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={promotionalEmails}
                  onChange={(e) => setPromotionalEmails(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500/40 cursor-pointer"
                />
              </div>

              {/* Account Transactional - LOCKED */}
              <div className="flex items-center justify-between p-4 bg-blue-950/20 border border-blue-500/20 rounded-2xl">
                <div>
                  <div className="text-sm font-bold text-blue-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Transactional Account Emails</span>
                  </div>
                  <p className="text-xs text-blue-300/70 mt-0.5">
                    Registration receipts, application status changes, interview invites, and security resets.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md border border-blue-500/30 shrink-0">
                  Required
                </span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleSavePreferences(false)}
                disabled={saving}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Preferences...</span>
                  </>
                ) : (
                  <span>Save Email Preferences</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSavePreferences(true)}
                disabled={saving}
                className="w-full py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-xs font-semibold text-gray-400 hover:text-red-300 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BellOff className="w-4 h-4 text-red-400" />
                <span>Unsubscribe from All Marketing Emails</span>
              </button>
            </div>

            {/* Back to AIJobs */}
            <div className="text-center pt-4 border-t border-white/5">
              <a
                href="/"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
              >
                ← Return to AIJobs Main Platform
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
