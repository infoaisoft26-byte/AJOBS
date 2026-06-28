import { useState } from "react";
import { 
  ShieldCheck, Shield, Users, Plus, X, Save, Key, Info, Check, AlertTriangle 
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { TeamMemberModel } from "./CrmTypes";

interface CrmTeamViewProps {
  team: TeamMemberModel[];
  onRefresh: () => void;
  currentUserRole: "Admin" | "Manager" | "Recruiter" | "Viewer";
  onChangeUserRole: (newRole: "Admin" | "Manager" | "Recruiter" | "Viewer") => void;
}

export default function CrmTeamView({
  team,
  onRefresh,
  currentUserRole,
  onChangeUserRole
}: CrmTeamViewProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMemberModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Manager" | "Recruiter" | "Viewer">("Recruiter");

  const isReadOnly = currentUserRole === "Viewer" || currentUserRole === "Recruiter";

  const handleOpenAdd = () => {
    if (currentUserRole !== "Admin" && currentUserRole !== "Manager") {
      alert("Role Permission Restriction: Only Admins or Managers can register new team members.");
      return;
    }
    setName("");
    setEmail("");
    setRole("Recruiter");
    setIsAdding(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      const teamId = "team_" + Math.random().toString(36).substr(2, 9);
      const teamObj: TeamMemberModel = {
        id: teamId,
        name,
        email,
        role
      };

      await setDoc(doc(db, "team_members", teamId), teamObj);
      alert(`Team member ${name} added successfully! Role set to ${role}.`);
      setIsAdding(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Define matrix of permissions
  const permissionMatrix = {
    Admin: {
      all: "Full Unlimited Access",
      delete: true,
      editClients: true,
      billing: true
    },
    Manager: {
      all: "Add/Edit All Records, Config Schema",
      delete: true,
      editClients: true,
      billing: false
    },
    Recruiter: {
      all: "Manage Candidates, Co-ordinate Jobs & Interviews",
      delete: false,
      editClients: false,
      billing: false
    },
    Viewer: {
      all: "Read-Only Dashboard View",
      delete: false,
      editClients: false,
      billing: false
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-team-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Recruitment Team & Role Administration</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Configure user logins, manage Recruiter access, and test role authorization scopes.</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" />
            <span>Register Team Member</span>
          </button>
        )}
      </div>

      {/* Role Switcher sandbox */}
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-2 text-xs">
          <Key className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="text-white block">Active Sandbox Simulator Logins</strong>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Your simulated login is currently authorized as: <strong className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase font-mono">{currentUserRole}</strong>.
              Choose any role below to test restrictions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["Admin", "Manager", "Recruiter", "Viewer"] as const).map(rl => (
            <button
              key={rl}
              onClick={() => {
                onChangeUserRole(rl);
                alert(`Switched active sandbox role to: ${rl.toUpperCase()}! CRM views and action forms will now adapt permissions.`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                currentUserRole === rl 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {rl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team Members List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 text-gray-400 font-mono border-b border-white/5 uppercase tracking-wider text-[10px]">
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Corporate Email</th>
                    <th className="p-4">Assigned CRM Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {team.map(member => (
                    <tr
                      key={member.id}
                      onClick={() => { setSelectedMember(member); setIsAdding(false); }}
                      className={`hover:bg-white/5 transition-all cursor-pointer ${
                        selectedMember?.id === member.id ? "bg-indigo-500/10" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>{member.name}</span>
                      </td>
                      <td className="p-4 text-gray-300 font-mono text-[11px]">{member.email}</td>
                      <td className="p-4 font-bold">
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                          member.role === "Admin" ? "bg-red-500/10 text-red-400" :
                          member.role === "Manager" ? "bg-purple-500/10 text-purple-400" :
                          member.role === "Recruiter" ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-gray-400"
                        }`}>
                          {member.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Permission breakdown panel or add form */}
        <div>
          {isAdding ? (
            <form onSubmit={handleSaveMember} className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">Register Staff Profile</h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Amit Patel"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="amit@nexusagency.com"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">System Authorization Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  >
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Manager">Manager (Edit Scope)</option>
                    <option value="Recruiter">Recruiter (Candidate focus)</option>
                    <option value="Viewer">Viewer (Read-only)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Staff Profile</span>
              </button>
            </form>
          ) : selectedMember ? (
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">Permission Breakdown</span>
                <h4 className="font-extrabold text-base text-white">{selectedMember.name}</h4>
                <p className="text-[11px] text-gray-400 font-mono">{selectedMember.email}</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3 bg-neutral-950/40 border border-white/5 rounded-xl space-y-1">
                  <span className="text-gray-400 font-medium block">Authorized Access Scope:</span>
                  <p className="text-white font-bold leading-relaxed">{permissionMatrix[selectedMember.role].all}</p>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-gray-400">Can delete Client accounts?</span>
                    <span className={permissionMatrix[selectedMember.role].delete ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {permissionMatrix[selectedMember.role].delete ? "Allowed" : "Restricted"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-gray-400">Can edit client parameters?</span>
                    <span className={permissionMatrix[selectedMember.role].editClients ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {permissionMatrix[selectedMember.role].editClients ? "Allowed" : "Restricted"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-gray-400">Can manage subscriptions?</span>
                    <span className={permissionMatrix[selectedMember.role].billing ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {permissionMatrix[selectedMember.role].billing ? "Allowed" : "Restricted"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    To test restrictions as {selectedMember.name}, select the <strong>{selectedMember.role}</strong> button in the active switcher sandbox above!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl text-center space-y-3">
              <Shield className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="font-bold text-sm text-gray-300">Select Staff Profile</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Choose an active staff member from the left table directory to audit detailed access scopes, security rules, and custom role assignments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
