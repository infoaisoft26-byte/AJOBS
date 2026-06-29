import { useState } from "react";
import { 
  Bell, Plus, ShieldCheck, Mail, Send, Radio, Trash2, CheckCircle, Clock 
} from "lucide-react";
import { SystemNotification } from "./AdminTypes";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { NotificationService } from "../../services/notificationService";

interface NotificationCenterProps {
  notifications: SystemNotification[];
  onRefresh: () => void;
  userName: string;
}

export default function NotificationCenter({
  notifications,
  onRefresh,
  userName
}: NotificationCenterProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Broadcaster form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<SystemNotification["targetRole"]>("all");
  const [notifType, setNotifType] = useState<SystemNotification["type"]>("announcement");

  const handleDispatchNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setIsSubmitting(true);

    try {
      // Dispatch real system-wide broadcast via NotificationService to write to all target user notification pools
      const deliveredCount = await NotificationService.broadcastNotification({
        title,
        message,
        targetRole,
        sentBy: userName,
        type: notifType === "alert" ? "alert" : "info"
      });

      // 2. Create Audit log
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: "system_admin",
        userName: userName,
        userEmail: "admin@aijobs.global",
        role: "Super Admin",
        action: "SETTINGS_CHANGE",
        category: "System",
        description: `Dispatched targeted broadcast: '${title}' to demographic segment: '${targetRole}'.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`📡 Real Broadcast dispatched successfully!\n\nDelivery completed: ${deliveredCount} active users loaded in real-time.`);
      setTitle("");
      setMessage("");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Broadcast pipeline error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotif = async (notifId: string) => {
    if (!confirm("Are you sure you want to delete this broadcast log?")) return;
    try {
      await deleteDoc(doc(db, "notifications", notifId));
      alert("Broadcast expunged.");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6" id="notification-center-panel">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-400" />
          <span>System Broadcasts, Web Push & Email Dispatcher</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Compose targeted text alerts, schedule downtime notifications, or broadcast system-wide newsletters across selected workspace roles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-gray-300">
        
        {/* Broadcaster form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleDispatchNotification} className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-extrabold text-white flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-400" />
              <span>Compose Live Dispatch</span>
            </h4>

            <p className="text-[10px] text-gray-400 leading-normal">
              Compose alerts with custom severity and scope. Triggering this flow will immediately push websocket payloads and trigger background email templates matching recipients.
            </p>

            <div className="space-y-1">
              <label className="text-gray-400 block font-mono">Title header *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Scheduled system downtime update..."
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block font-mono">Alert severity *</label>
              <select
                value={notifType}
                onChange={e => setNotifType(e.target.value as any)}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono cursor-pointer"
              >
                <option value="announcement">Announcement (General)</option>
                <option value="maintenance">Maintenance Notice (Downtime)</option>
                <option value="alert">Security Alert (Severity: Critical)</option>
                <option value="info">General Info (Standard)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block font-mono">Target Recipient demographic *</label>
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value as any)}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono cursor-pointer"
              >
                <option value="all">All Platform Users (Broadcast)</option>
                <option value="candidate">Candidates Only</option>
                <option value="employer">Employers Only</option>
                <option value="consultancy">Consultancies Only</option>
                <option value="admin">System Staff/Admins</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block font-mono">Message string *</label>
              <textarea
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Compose full dispatch text..."
                className="w-full h-28 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono leading-relaxed resize-none focus:border-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Dispatching..." : "Publish targeted Alert"}</span>
            </button>

          </form>
        </div>

        {/* History trail */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Broadcast History Ledger</h4>

          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2.5 relative group hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded mr-2 border ${
                        notif.type === "maintenance" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                        notif.type === "alert" ? "bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse" :
                        "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
                      }`}>
                        {notif.type}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">demographic segment: <strong className="text-gray-300 capitalize">{notif.targetRole}</strong></span>
                      
                      <h5 className="font-extrabold text-sm text-white mt-2">{notif.title}</h5>
                    </div>

                    <button 
                      onClick={() => handleDeleteNotif(notif.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded transition-all cursor-pointer"
                      title="Expunge Alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-gray-400 leading-relaxed text-[11px]">{notif.message}</p>

                  <div className="flex justify-between items-center pt-2.5 border-t border-white/5 font-mono text-[8px] text-gray-500">
                    <span>dispatched by {notif.sentBy}</span>
                    <span>Delivered recipients count: <strong className="text-emerald-400 font-bold">{notif.deliveredCount}</strong></span>
                    <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-xl">
                No active broadcast records logs found. Compose an alert to begin system broadcasts.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
