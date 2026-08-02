import { useEffect, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { CheckCircle2, FileText, Filter, Info, Link, RefreshCw, Search, ShieldCheck, Sparkles, User, Users, View, XCircle } from "lucide-react";
import { auth, db } from "../firebase";

import { useToast } from "./GlobalToast";

export interface UserAccessRecord {
  uid: string;
  name: string;
  email: string;
  role: string;
  internalAccess?: boolean;
  isBetaTester?: boolean;
  accountStatus?: string;
  createdAt?: string;
  resumeURL?: string;
}

export default function AdminInternalAccessManager() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "internal" | "beta" | "candidate">("all");
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const records: UserAccessRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        records.push({
          uid: docSnap.id,
          name: data.name || "User",
          email: data.email || "",
          role: data.role || "candidate",
          internalAccess: data.internalAccess ?? false,
          isBetaTester: data.isBetaTester ?? false,
          accountStatus: data.accountStatus || "active",
          createdAt: data.createdAt || new Date().toISOString(),
          resumeURL: data.resumeURL || data.resumeUrl || ""
        });
      });
      setUsers(records);
    } catch (err) {
      console.error("[Fetch Users Error]:", err);
      showToast("Failed to fetch user access directory.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleToggleAccess = async (uid: string, field: "internalAccess" | "isBetaTester", currentValue: boolean) => {
    setUpdatingUid(uid);
    try {
      const newValue = !currentValue;
      await updateDoc(doc(db, "users", uid), {
        [field]: newValue,
        updatedAt: new Date().toISOString()
      });

      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, [field]: newValue } : u))
      );

      showToast(`Updated ${field} permissions for user`, "success");
    } catch (err) {
      console.error("[Toggle Access Error]:", err);
      showToast("Failed to update access permission.", "error");
    } finally {
      setUpdatingUid(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "internal") return u.internalAccess === true;
    if (filterType === "beta") return u.isBetaTester === true;
    if (filterType === "candidate") return u.role === "candidate";
    return true;
  });

  const totalCandidates = users.filter((u) => u.role === "candidate").length;
  const totalInternal = users.filter((u) => u.internalAccess === true || u.role === "admin").length;
  const totalBeta = users.filter((u) => u.isBetaTester === true).length;

  return (
    <div className="space-y-6 text-left">
      
      {/* HEADER & STATS */}
      <div className="bg-gray-950/80 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Internal Access Governance</span>
            </div>
            <h2 className="text-xl font-black text-white">
              User Access & Pre-Launch Candidate Directory
            </h2>
            <p className="text-xs text-gray-400">
              Grant or revoke internal testing access (`internalAccess` / `isBetaTester`) for registered candidate accounts.
            </p>
          </div>

          <button
            onClick={fetchAllUsers}
            disabled={loading}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh Directory</span>
          </button>
        </div>

        {/* STATS BADGES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[10px] uppercase">Pre-Registered Candidates</span>
            <p className="text-2xl font-black text-blue-400">{totalCandidates}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[10px] uppercase">Internal Access Enabled</span>
            <p className="text-2xl font-black text-emerald-400">{totalInternal}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[10px] uppercase">Active Beta Testers</span>
            <p className="text-2xl font-black text-purple-400">{totalBeta}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, role..."
            className="w-full bg-gray-950/80 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-amber-500 text-black shadow-md"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setFilterType("candidate")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "candidate"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Candidates ({totalCandidates})
          </button>
          <button
            onClick={() => setFilterType("internal")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "internal"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Internal Access ({totalInternal})
          </button>
          <button
            onClick={() => setFilterType("beta")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === "beta"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Beta Testers ({totalBeta})
          </button>
        </div>

      </div>

      {/* USER TABLE */}
      <div className="bg-gray-950/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User Info</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Internal Access</th>
                <th className="py-3.5 px-4">Beta Tester</th>
                <th className="py-3.5 px-4">Resume</th>
                <th className="py-3.5 px-4 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                    Loading user access directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                    No users matched the search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                    
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-xs font-bold text-blue-300">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold capitalize bg-white/5 border border-white/10 text-gray-300">
                        {u.role}
                      </span>
                    </td>

                    {/* Internal Access Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleAccess(u.uid, "internalAccess", !!u.internalAccess)}
                        disabled={updatingUid === u.uid}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          u.internalAccess
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {u.internalAccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Access Granted</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-gray-500" />
                            <span>Pre-Launch Only</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Beta Tester Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleAccess(u.uid, "isBetaTester", !!u.isBetaTester)}
                        disabled={updatingUid === u.uid}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          u.isBetaTester
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                            : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {u.isBetaTester ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>Beta Tester</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-gray-500" />
                            <span>Standard</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Resume Link */}
                    <td className="py-3.5 px-4">
                      {u.resumeURL ? (
                        <a
                          href={u.resumeURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Resume</span>
                        </a>
                      ) : (
                        <span className="text-gray-500 italic text-[10px]">No Resume</span>
                      )}
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-4 text-right font-mono text-[10px] text-gray-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
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
