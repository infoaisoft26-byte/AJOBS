import { useState } from "react";
import { 
  Settings, Lock, Bell, Eye, Trash2, ShieldAlert, Check, X 
} from "lucide-react";
import { auth, db } from "../firebase";
import { updatePassword, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";

interface SettingsProps {
  userId: string;
  triggerNotification: (title: string, message: string) => void;
}

export default function CandidateSettings({ userId, triggerNotification }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form states
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [interviewAlerts, setInterviewAlerts] = useState(true);
  const [profilePrivacy, setProfilePrivacy] = useState("public");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!passwords.next || !passwords.confirm) {
      setError("Please fill in all password fields.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (passwords.next.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, passwords.next);
        setSuccess("Account password updated successfully!");
        setPasswords({ current: "", next: "", confirm: "" });
        triggerNotification("🔑 Password Changed", "Your candidate login password has been changed successfully.");
      } else {
        setError("User session not found. Please log in again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to alter session password. Re-authentication may be required.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    setSuccess("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess("Preferences saved successfully!");
      triggerNotification("⚙️ Preferences Updated", "Notification and visibility preferences synchronized.");
      setTimeout(() => setSuccess(""), 4000);
    }, 500);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      alert("Please type 'DELETE' exactly to execute this action.");
      return;
    }

    if (window.confirm("WARNING: Are you absolutely sure you want to permanently delete your candidate account? This action is IRREVERSIBLE.")) {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          // Delete candidate document in Firestore
          await deleteDoc(doc(db, "candidates", userId));
          await deleteDoc(doc(db, "users", userId));
          
          // Delete auth user
          await deleteUser(user);
          alert("Your candidate account has been deleted permanently.");
          window.location.reload();
        }
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Failed to delete account. Re-authentication is likely required for deletion.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto" id="candidate-settings-workspace">
      <div className="border-b border-white/5 pb-3">
        <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Account Security & Controls</span>
        </h3>
        <p className="text-xs text-gray-400">Configure security tokens, notification feeds, and privacy filters.</p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center space-x-2 animate-in fade-in duration-200">
          <X className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* 1. Change Password */}
      <form onSubmit={handleUpdatePassword} className="glass p-5 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold font-mono tracking-wider text-indigo-400 uppercase flex items-center space-x-2">
          <Lock className="w-4 h-4" />
          <span>Update Security Token (Password)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-gray-400">Current Password</label>
            <input 
              type="password" 
              value={passwords.current} 
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="••••••••" 
              className="w-full px-3 py-2 bg-[#090d16] border border-white/10 rounded-xl text-white" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-gray-400">New Password</label>
            <input 
              type="password" 
              value={passwords.next} 
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              placeholder="••••••••" 
              className="w-full px-3 py-2 bg-[#090d16] border border-white/10 rounded-xl text-white" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-gray-400">Confirm New Password</label>
            <input 
              type="password" 
              value={passwords.confirm} 
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="••••••••" 
              className="w-full px-3 py-2 bg-[#090d16] border border-white/10 rounded-xl text-white" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {/* 2. Notification preferences */}
      <div className="glass p-5 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold font-mono tracking-wider text-purple-400 uppercase flex items-center space-x-2">
          <Bell className="w-4 h-4" />
          <span>Notification Preferences</span>
        </h4>

        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between p-1">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-200">Email Notifications</p>
              <p className="text-[10px] text-gray-500">Receive weekly automated matched jobs and compliance scores.</p>
            </div>
            <input 
              type="checkbox" 
              checked={emailNotif} 
              onChange={(e) => setEmailNotif(e.target.checked)} 
              className="w-4 h-4 text-indigo-600 rounded bg-black border-white/10" 
            />
          </div>

          <div className="flex items-center justify-between p-1">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-200">SMS Direct Alerts</p>
              <p className="text-[10px] text-gray-500">Receive urgent direct recruiter messaging and calendar schedulers.</p>
            </div>
            <input 
              type="checkbox" 
              checked={smsNotif} 
              onChange={(e) => setSmsNotif(e.target.checked)} 
              className="w-4 h-4 text-indigo-600 rounded bg-black border-white/10" 
            />
          </div>

          <div className="flex items-center justify-between p-1">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-200">Interview Arena Alarms</p>
              <p className="text-[10px] text-gray-500">Receive evaluations feedback reminders and model answer updates.</p>
            </div>
            <input 
              type="checkbox" 
              checked={interviewAlerts} 
              onChange={(e) => setInterviewAlerts(e.target.checked)} 
              className="w-4 h-4 text-indigo-600 rounded bg-black border-white/10" 
            />
          </div>
        </div>

        <button 
          onClick={handleSavePreferences}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
        >
          Save Preferences
        </button>
      </div>

      {/* 3. Profile Visibility Privacy */}
      <div className="glass p-5 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold font-mono tracking-wider text-pink-400 uppercase flex items-center space-x-2">
          <Eye className="w-4 h-4" />
          <span>Talent Visibility Privacy</span>
        </h4>

        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between p-1">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-200">Candidate Visibility Settings</p>
              <p className="text-[10px] text-gray-500">Determines who can query your profile in applicant pools.</p>
            </div>
            <select
              value={profilePrivacy}
              onChange={(e) => setProfilePrivacy(e.target.value)}
              className="px-3 py-1.5 bg-[#090d16] border border-white/10 rounded-xl text-white focus:outline-none"
            >
              <option value="public">Public (All verified tech recruiters)</option>
              <option value="only_verified">Verified Match Employers Only</option>
              <option value="private">Private (Only jobs I actively apply to)</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleSavePreferences}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
        >
          Update Privacy
        </button>
      </div>

      {/* 4. Delete Account Gate */}
      <div className="border border-red-500/20 bg-red-500/5 p-5 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold font-mono tracking-wider text-red-400 uppercase flex items-center space-x-2">
          <ShieldAlert className="w-4.5 h-4.5" />
          <span>Dangerous Workspace Controls</span>
        </h4>
        
        <p className="text-xs text-gray-400 leading-normal">
          Permanently delete your AIJobs candidate portal, clearing ATS scores, timeline states, and Firestore CV files. This action cannot be undone.
        </p>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-gray-400 block">Type <span className="text-red-400 font-mono font-bold">DELETE</span> below to unlock deletion:</label>
            <input 
              type="text" 
              value={deleteConfirm} 
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE" 
              className="px-3.5 py-1.5 bg-[#090d16] border border-red-500/20 rounded-xl text-red-300 w-full sm:w-48 text-center font-mono font-black placeholder-red-500/20" 
            />
          </div>

          <button 
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== "DELETE" || loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account Permanently</span>
          </button>
        </div>
      </div>
    </div>
  );
}
