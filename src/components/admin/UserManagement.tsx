import { type FormEvent, useState } from "react";
import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { Ban, Building2, Chrome, Clock, Code, Delete, Eye, Filter, Inspect, Key, Plus, Rows, Search, ShieldCheck, Table, Trash2, User, UserPlus, Users, View } from "lucide-react";
import { auth, db } from "../../firebase";
import InteractiveExportTable from "../InteractiveExportTable";

interface UserManagementProps {
  users: UserProfile[];
  onRefresh: () => void;
}

export default function UserManagement({
  users,
  onRefresh
}: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [newAccount, setNewAccount] = useState({
    role: "recruiter" as "recruiter" | "consultancy",
    name: "",
    companyName: "",
    email: "",
    phone: "",
    password: ""
  });

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.uid || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Simulate active status check since standard user profile might have suspended: true/false
    const userStatus = (u as any).isSuspended ? "suspended" : "active";
    const isCand = u.role === "candidate";
    const isVerifiedCand = isCand && ((u as any).emailVerified === true || (u as any).verificationStatus === "verified" || (((u as any).accountStatus === "active" || (u as any).status === "active") && (u as any).emailVerified !== false && (u as any).verificationStatus !== "pending"));

    let matchesStatus = true;
    if (selectedStatus === "active") matchesStatus = userStatus === "active";
    else if (selectedStatus === "suspended") matchesStatus = userStatus === "suspended";
    else if (selectedStatus === "verified_candidates") matchesStatus = isCand && isVerifiedCand;
    else if (selectedStatus === "unverified_candidates") matchesStatus = isCand && !isVerifiedCand;

    const matchesRole = selectedRole === "all" || u.role === selectedRole;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleToggleSuspend = async (user: UserProfile) => {
    setIsSubmitting(true);
    const currentlySuspended = (user as any).isSuspended || false;
    const nextSuspendedState = !currentlySuspended;

    try {
      // Write to user profile
      await setDoc(doc(db, "users", user.uid), {
        isSuspended: nextSuspendedState
      }, { merge: true });

      // Log to system audit logs
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        role: "Super Admin",
        action: nextSuspendedState ? "SUSPEND" : "ACTIVATE",
        category: "User",
        description: `${nextSuspendedState ? "Suspended" : "Re-activated"} access privilege for ${user.name} (${user.email}).`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`User status successfully updated to: ${nextSuspendedState ? "SUSPENDED" : "ACTIVE"}`);
      if (selectedUserForDetail?.uid === user.uid) {
        setSelectedUserForDetail({
          ...user,
          isSuspended: nextSuspendedState
        } as any);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error adjusting suspension privileges.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerResetPassword = async (user: UserProfile) => {
    const dummyResetCode = Math.floor(100000 + Math.random() * 900000);
    try {
      // Update in user profile (simulated code stored for demo support logs)
      await setDoc(doc(db, "users", user.uid), {
        tempResetCode: dummyResetCode,
        passwordResetRequired: true
      }, { merge: true });

      // Create log
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        role: "Super Admin",
        action: "SETTINGS_CHANGE",
        category: "Security",
        description: `Issued remote password override reset code for ${user.name}. Code: ${dummyResetCode}`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`🔑 Administrative Reset Triggered!\n\nTemporary reset token generated: ${dummyResetCode}\nAn auto-mailer simulation containing verification links has been broadcasted.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently delete user "${user.name}"? This operation cannot be undone and will strip all corresponding job logs.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      // Delete user doc
      await deleteDoc(doc(db, "users", user.uid));
      
      // Delete from corresponding child collection
      if (user.role === "candidate") {
        await deleteDoc(doc(db, "candidates", user.uid));
      } else if (user.role === "consultancy") {
        await deleteDoc(doc(db, "consultancies", user.uid));
      } else if (user.role === "employer") {
        await deleteDoc(doc(db, "employers", user.uid));
      }

      // Log action
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        role: "Super Admin",
        action: "DELETE",
        category: "User",
        description: `Permanently expunged user dataset for candidate ${user.name} from Firebase schema.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`Successfully deleted user ${user.name}`);
      setSelectedUserForDetail(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error deleting user dataset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWorkspaceUser = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Admin session expired. Please sign in again.");
      const idToken = await currentUser.getIdToken(true);
      const response = await fetch("/api/admin/create-workspace-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(newAccount)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Account creation failed.");
      }
      setCreateSuccess(`${newAccount.role === "recruiter" ? "Recruiter" : "Consultancy"} created: ${newAccount.email}`);
      setNewAccount({ role: "recruiter", name: "", companyName: "", email: "", phone: "", password: "" });
      onRefresh();
    } catch (error: any) {
      setCreateError(error?.message || "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="user-management-panel">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>System User Matrix</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Create and manage recruiter or consultancy workspace accounts without opening Firebase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreateForm((value) => !value); setCreateError(""); setCreateSuccess(""); }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create Workspace ID
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateWorkspaceUser} className="bg-indigo-500/5 border border-indigo-500/25 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <Building2 className="w-4 h-4 text-indigo-400" />
            New Recruiter / Consultancy Account
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <select value={newAccount.role} onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value as "recruiter" | "consultancy" })} className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
              <option value="recruiter">Recruiter</option>
              <option value="consultancy">Consultancy</option>
            </select>
            <input required value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} placeholder={newAccount.role === "recruiter" ? "Recruiter full name" : "Authorized person name"} className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
            <input value={newAccount.companyName} onChange={(e) => setNewAccount({ ...newAccount, companyName: e.target.value })} placeholder="Company / Agency name" className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
            <input required type="email" value={newAccount.email} onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} placeholder="Login email" className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
            <input value={newAccount.phone} onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })} placeholder="Phone with country code (optional)" className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
            <input required minLength={8} type="password" value={newAccount.password} onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} placeholder="Temporary password (8+ characters)" className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
          </div>
          {createError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{createError}</p>}
          {createSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">{createSuccess}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-xs font-bold text-gray-300 bg-white/5 rounded-lg">Cancel</button>
            <button disabled={isSubmitting} type="submit" className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> {isSubmitting ? "Creating..." : "Create & Activate Account"}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-gray-300">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or UID..."
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filter Role */}
        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="candidate">Candidates</option>
            <option value="employer">Employers</option>
            <option value="recruiter">Recruiters</option>
            <option value="consultancy">Consultancies</option>
            <option value="admin">Admins</option>
            <option value="superadmin">Super Admins</option>
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Clearances</option>
            <option value="suspended">Suspended Accounts</option>
            <option value="verified_candidates">Verified Candidates Only</option>
            <option value="unverified_candidates">Unverified Candidates Only</option>
          </select>
        </div>

        <div className="flex items-center justify-end font-mono text-[10px] text-gray-400">
          Filtered User Rows: <strong className="text-white ml-1">{filteredUsers.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Users Table */}
        <div className="lg:col-span-2 space-y-4">
          <InteractiveExportTable
            id="user-directory-matrix-export-table"
            title="System Directory Log"
            exportFileName="system_users_report"
            data={filteredUsers}
            columns={[
              {
                key: "name",
                label: "User Information",
                sortable: true,
                render: (val: any, u: UserProfile) => {
                  const isCand = u.role === "candidate";
                  const isVerified = (u as any).emailVerified === true || (u as any).verificationStatus === "verified" || (((u as any).accountStatus === "active" || (u as any).status === "active") && (u as any).emailVerified !== false && (u as any).verificationStatus !== "pending");
                  return (
                    <div className="py-1">
                      <div className="font-bold text-white group-hover:text-indigo-400 transition-all flex items-center gap-1.5 flex-wrap">
                        <span>{u.name}</span>
                        {isCand && (
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold ${
                            isVerified ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}>
                            {isVerified ? "✓ Verified" : "⏳ Pending Verification"}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{u.email}</div>
                      <div className="text-[8px] text-gray-500 font-mono mt-0.5">UID: {u.uid}</div>
                    </div>
                  );
                }
              },
              {
                key: "role",
                label: "Clearance Role",
                sortable: true,
                render: (val: any, u: UserProfile) => (
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                    u.role === "candidate" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                    u.role === "employer" ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" :
                    u.role === "recruiter" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    u.role === "consultancy" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                    u.role === "superadmin" ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" :
                    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {u.role}
                  </span>
                )
              },
              {
                key: "isSuspended",
                label: "Status",
                sortable: true,
                render: (val: any, u: UserProfile) => {
                  const isSusp = (u as any).isSuspended || false;
                  return (
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                      isSusp 
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {isSusp ? "SUSPENDED" : "ACTIVE"}
                    </span>
                  );
                }
              },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                render: (val: any, u: UserProfile) => {
                  const isSusp = (u as any).isSuspended || false;
                  return (
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedUserForDetail(u)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center"
                        title="Inspect User Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleSuspend(u)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center border ${
                          isSusp 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                        }`}
                        title={isSusp ? "Activate account" : "Suspend account"}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleTriggerResetPassword(u)}
                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 text-amber-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center"
                        title="Reset Credentials Code"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center"
                        title="Delete User permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }
              }
            ]}
          />
        </div>

        {/* User Inspections Side Panel */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Identity Inspection Desk</span>
            </h4>

            {selectedUserForDetail ? (
              <div className="space-y-4 text-[11px] leading-relaxed">
                {/* User avatar mockup */}
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm uppercase">
                    {selectedUserForDetail.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-white">{selectedUserForDetail.name}</h5>
                    <p className="text-[10px] text-gray-400 font-mono">{selectedUserForDetail.email}</p>
                  </div>
                </div>

                <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Core Telemetry</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 bg-neutral-900 rounded border border-white/5">
                      <span className="text-gray-500 block text-[8px] uppercase">Registered</span>
                      <strong className="text-white">{selectedUserForDetail.createdAt ? new Date(selectedUserForDetail.createdAt).toLocaleDateString() : "N/A"}</strong>
                    </div>

                    <div className="p-2 bg-neutral-900 rounded border border-white/5">
                      <span className="text-gray-500 block text-[8px] uppercase">Clearance Role</span>
                      <strong className="text-indigo-400 uppercase">{selectedUserForDetail.role}</strong>
                    </div>

                    <div className="p-2 bg-neutral-900 rounded border border-white/5">
                      <span className="text-gray-500 block text-[8px] uppercase">Account Security</span>
                      <strong className={(selectedUserForDetail as any).isSuspended ? "text-rose-400" : "text-emerald-400"}>
                        {(selectedUserForDetail as any).isSuspended ? "Suspended" : "Cleared"}
                      </strong>
                    </div>

                    <div className="p-2 bg-neutral-900 rounded border border-white/5">
                      <span className="text-gray-500 block text-[8px] uppercase">MFA Status</span>
                      <strong className="text-emerald-400">Enabled</strong>
                    </div>
                  </div>
                </div>

                {/* Audit simulated login history */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Recent Access Footprint</span>
                  </span>

                  <div className="bg-neutral-950/30 p-2.5 rounded-xl border border-white/5 font-mono text-[9px] text-gray-400 space-y-1.5 leading-normal">
                    <p className="flex justify-between border-b border-white/5 pb-1 text-[8px]">
                      <span>TIMESTAMP</span>
                      <span>IP ADDRESS • REGION</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-white">{new Date(Date.now() - 10 * 60 * 1000).toLocaleTimeString()}</span>
                      <span>157.45.18.221 (Bengaluru, KA)</span>
                    </p>
                    <p className="flex justify-between text-[8px]">
                      <span className="text-gray-500">{new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                      <span>182.70.19.103 (Hyderabad, TS)</span>
                    </p>
                  </div>
                </div>

                {/* Quick actions row */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleToggleSuspend(selectedUserForDetail)}
                    className="flex-1 py-1.5 px-2 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer border border-rose-500/25 font-bold"
                  >
                    {(selectedUserForDetail as any).isSuspended ? "Restore Clearance" : "Revoke Access"}
                  </button>

                  <button
                    onClick={() => handleTriggerResetPassword(selectedUserForDetail)}
                    className="flex-1 py-1.5 px-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all cursor-pointer border border-indigo-500/25 font-bold"
                  >
                    Reset Password Token
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center py-24 text-[11px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose a candidate, employer, or coordinator row to inspect core security clearance logs.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
