import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { db } from "../firebase";
import { useToast } from "./GlobalToast";

export interface UserAccessRecord {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: "candidate" | "recruiter" | "consultancy" | "employer" | "other";
  internalAccess?: boolean;
  isBetaTester?: boolean;
  accountStatus?: string;
  createdAt?: string;
  resumeURL?: string;
  companyName?: string;
  consultancyName?: string;
  source?: string;
}

type DirectoryTab = "candidate" | "recruiter" | "consultancy" | "employer" | "all";

function normalizeRole(value: unknown): UserAccessRecord["role"] {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["candidate", "job_seeker", "jobseeker", "user"].includes(role)) return "candidate";
  if (["recruiter", "hr", "recruitment"].includes(role)) return "recruiter";
  if (["consultancy", "consultant", "agency"].includes(role)) return "consultancy";
  if (["employer", "corporate", "company"].includes(role)) return "employer";
  return "other";
}

function pickName(data: any, fallback = "User") {
  return data?.fullName || data?.name || data?.displayName || data?.candidateName || data?.recruiterName || data?.companyName || data?.consultancyName || fallback;
}

function toRecord(uid: string, data: any, forcedRole?: UserAccessRecord["role"], source = "users"): UserAccessRecord {
  return {
    uid,
    name: pickName(data),
    email: data?.email || data?.accountEmail || data?.contactEmail || "",
    phone: data?.phone || data?.mobile || data?.phoneNumber || data?.contactPhone || "",
    role: forcedRole || normalizeRole(data?.role),
    internalAccess: data?.internalAccess ?? false,
    isBetaTester: data?.isBetaTester ?? false,
    accountStatus: data?.accountStatus || data?.status || (data?.isActive === false ? "inactive" : "active"),
    createdAt: data?.createdAt || data?.registeredAt || data?.registrationDate || data?.updatedAt || "",
    resumeURL: data?.resumeURL || data?.resumeUrl || "",
    companyName: data?.companyName || data?.organizationName || "",
    consultancyName: data?.consultancyName || data?.agencyName || "",
    source,
  };
}

export default function AdminInternalAccessManager() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<DirectoryTab>("candidate");
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const fetchRegistrationDatabases = async () => {
    setLoading(true);
    try {
      const merged = new Map<string, UserAccessRecord>();

      const merge = (record: UserAccessRecord) => {
        const existing = merged.get(record.uid);
        merged.set(record.uid, existing ? { ...existing, ...record, role: record.role !== "other" ? record.role : existing.role } : record);
      };

      // Master account directory. Every portal registration should create a users/{uid} record.
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach((docSnap) => merge(toRecord(docSnap.id, docSnap.data(), undefined, "users")));

      // Role-specific collections are merged as the source of truth for their role.
      const roleCollections: Array<[string, UserAccessRecord["role"]]> = [
        ["candidates", "candidate"],
        ["recruiters", "recruiter"],
        ["consultancies", "consultancy"],
        ["employers", "employer"],
      ];

      for (const [collectionName, role] of roleCollections) {
        try {
          const snap = await getDocs(collection(db, collectionName));
          snap.forEach((docSnap) => merge(toRecord(docSnap.id, docSnap.data(), role, collectionName)));
        } catch (roleErr) {
          // A missing/locked optional role collection must not blank the whole admin database.
          console.warn(`[AdminRegistrationDatabase] Could not read ${collectionName}:`, roleErr);
        }
      }

      const rows = Array.from(merged.values())
        .filter((u) => !["admin", "superadmin", "super_admin"].includes(String((u as any).role)))
        .sort((a, b) => {
          const at = a.createdAt ? Date.parse(a.createdAt) || 0 : 0;
          const bt = b.createdAt ? Date.parse(b.createdAt) || 0 : 0;
          return bt - at;
        });

      setUsers(rows);
    } catch (err) {
      console.error("[AdminRegistrationDatabase] Fetch error:", err);
      showToast("Failed to load portal registration databases.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrationDatabases();
  }, []);

  const handleToggleAccess = async (uid: string, field: "internalAccess" | "isBetaTester", currentValue: boolean) => {
    setUpdatingUid(uid);
    try {
      const newValue = !currentValue;
      await updateDoc(doc(db, "users", uid), {
        [field]: newValue,
        updatedAt: new Date().toISOString(),
      });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, [field]: newValue } : u)));
      showToast("Candidate access updated.", "success");
    } catch (err) {
      console.error("[AdminRegistrationDatabase] Update error:", err);
      showToast("Failed to update candidate access.", "error");
    } finally {
      setUpdatingUid(null);
    }
  };

  const counts = useMemo(() => ({
    candidate: users.filter((u) => u.role === "candidate").length,
    recruiter: users.filter((u) => u.role === "recruiter").length,
    consultancy: users.filter((u) => u.role === "consultancy").length,
    employer: users.filter((u) => u.role === "employer").length,
    all: users.length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (activeTab !== "all" && u.role !== activeTab) return false;
      if (!q) return true;
      return [u.name, u.email, u.phone, u.role, u.companyName, u.consultancyName, u.uid]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [users, activeTab, searchQuery]);

  const tabs: Array<{ id: DirectoryTab; label: string; count: number; icon: any }> = [
    { id: "candidate", label: "Candidates", count: counts.candidate, icon: UserRound },
    { id: "recruiter", label: "Recruiters", count: counts.recruiter, icon: BriefcaseBusiness },
    { id: "consultancy", label: "Consultancies", count: counts.consultancy, icon: UsersRound },
    { id: "employer", label: "Employers", count: counts.employer, icon: Building2 },
    { id: "all", label: "All Registrations", count: counts.all, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5 text-left" id="admin-registration-databases">
      <div className="rounded-3xl border border-blue-500/20 bg-gray-950 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Portal Registration Database
            </div>
            <h2 className="text-xl font-black text-white">Role-wise User Database</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-400">
              Candidate, Recruiter, Consultancy and Employer registrations are shown in separate ledgers. Data is merged from the master users collection and each role-specific Firestore collection so registrations do not get mixed together.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRegistrationDatabases}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Live Data
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4"><p className="text-[10px] uppercase text-gray-500">Candidates</p><p className="mt-1 text-2xl font-black text-blue-300">{counts.candidate}</p></div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4"><p className="text-[10px] uppercase text-gray-500">Recruiters</p><p className="mt-1 text-2xl font-black text-cyan-300">{counts.recruiter}</p></div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4"><p className="text-[10px] uppercase text-gray-500">Consultancies</p><p className="mt-1 text-2xl font-black text-purple-300">{counts.consultancy}</p></div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-[10px] uppercase text-gray-500">Employers</p><p className="mt-1 text-2xl font-black text-emerald-300">{counts.employer}</p></div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${selected ? "border-blue-400/40 bg-blue-500/15 text-blue-200" : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className="rounded-full bg-black/30 px-1.5 py-0.5 font-mono text-[9px]">{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeTab === "all" ? "all registrations" : `${activeTab}s`} by name, email, phone or UID...`}
          className="w-full rounded-2xl border border-white/10 bg-gray-950 py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gray-950 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-white/10 bg-white/5 text-[10px] uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3.5">Registered User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Phone</th>
                <th className="px-4 py-3.5">Organisation</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Resume</th>
                {activeTab === "candidate" && <th className="px-4 py-3.5">Candidate Access</th>}
                <th className="px-4 py-3.5 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center font-mono text-gray-500">Loading portal registration databases...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center font-mono text-gray-500">No {activeTab === "all" ? "registrations" : activeTab + " registrations"} found.</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={`${u.role}-${u.uid}`} className="hover:bg-white/[0.025]">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-white">{u.name || "Unnamed User"}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-gray-400">{u.email || "No email"}</div>
                    <div className="mt-0.5 max-w-[220px] truncate font-mono text-[9px] text-gray-600" title={u.uid}>UID: {u.uid}</div>
                  </td>
                  <td className="px-4 py-3.5"><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold capitalize">{u.role}</span></td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-gray-300">{u.phone || "-"}</td>
                  <td className="px-4 py-3.5 text-[11px] text-gray-300">{u.consultancyName || u.companyName || "-"}</td>
                  <td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${String(u.accountStatus).toLowerCase() === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{u.accountStatus || "active"}</span></td>
                  <td className="px-4 py-3.5">
                    {u.role === "candidate" && u.resumeURL ? (
                      <a href={u.resumeURL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-300 hover:underline"><FileText className="h-3.5 w-3.5" /> View Resume</a>
                    ) : u.role === "candidate" ? <span className="text-[10px] text-gray-600">Not uploaded</span> : <span className="text-gray-700">—</span>}
                  </td>
                  {activeTab === "candidate" && (
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        disabled={updatingUid === u.uid}
                        onClick={() => handleToggleAccess(u.uid, "internalAccess", !!u.internalAccess)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold ${u.internalAccess ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-gray-400"}`}
                      >
                        {u.internalAccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {u.internalAccess ? "Portal Enabled" : "Standard"}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right font-mono text-[10px] text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleString("en-IN") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
