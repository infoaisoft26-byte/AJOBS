import { useState } from "react";
import { 
  Building, User, Mail, Globe, Phone, FileText, Plus, 
  Trash2, Edit, Save, X, Eye, FileCheck
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ClientModel } from "./CrmTypes";

interface CrmClientsViewProps {
  clients: ClientModel[];
  onRefresh: () => void;
  userRole: "Admin" | "Manager" | "Recruiter" | "Viewer";
  profile?: any;
  userId?: string;
}

export default function CrmClientsView({
  clients,
  onRefresh,
  userRole,
  profile,
  userId
}: CrmClientsViewProps) {
  const [selectedClient, setSelectedClient] = useState<ClientModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");

  const isReadOnly = userRole === "Viewer";

  const handleOpenAdd = () => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot create clients.");
      return;
    }

    // ABAC Client Limit Policy Check
    const plan = profile?.pricingPlan || "Free";
    const currentClients = clients.length;
    const limit = plan === "Free" ? 3 : plan === "Starter" ? 10 : Infinity;

    if (currentClients >= limit) {
      alert(`⚠️ ABAC Policy Restricton: Your agency's pricing plan (${plan}) restricts you to a maximum of ${limit} active client records in your database (Current total: ${currentClients}). Please upgrade your pricing plan tier using the ABAC Security Guard or the Billing section!`);
      return;
    }

    setCompanyName("");
    setIndustry("");
    setEmail("");
    setWebsite("");
    setContactPerson("");
    setMobile("");
    setNotes("");
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleOpenEdit = (client: ClientModel) => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot edit client profiles.");
      return;
    }
    setCompanyName(client.companyName);
    setIndustry(client.industry);
    setEmail(client.email);
    setWebsite(client.website);
    setContactPerson(client.contactPerson);
    setMobile(client.mobile);
    setNotes(client.notes);
    setSelectedClient(client);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Double check ABAC Client limits before committing to Firestore
    if (!isEditing) {
      const plan = profile?.pricingPlan || "Free";
      const currentClients = clients.length;
      const limit = plan === "Free" ? 3 : plan === "Starter" ? 10 : Infinity;

      if (currentClients >= limit) {
        alert(`⚠️ ABAC Policy Restriction: Save blocked. Your ${plan} Plan limit of ${limit} clients is reached.`);
        return;
      }
    }

    try {
      const clientId = isEditing && selectedClient 
        ? selectedClient.id 
        : "client_" + Math.random().toString(36).substr(2, 9);

      const clientObj: ClientModel = {
        id: clientId,
        companyName,
        industry,
        email,
        website,
        contactPerson,
        mobile,
        notes,
        agreementsCount: isEditing && selectedClient ? selectedClient.agreementsCount : 1,
        documentsCount: isEditing && selectedClient ? selectedClient.documentsCount : 3,
        createdAt: isEditing && selectedClient ? selectedClient.createdAt : new Date().toISOString()
      };

      await setDoc(doc(db, "clients", clientId), clientObj);
      alert(isEditing ? "Client partner updated in Firestore!" : "New Client added successfully to CRM!");
      setIsAdding(false);
      setIsEditing(false);
      setSelectedClient(null);
      onRefresh();
    } catch (err) {
      console.error("Save client error:", err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (userRole !== "Admin" && userRole !== "Manager") {
      alert("Role Permission Restriction: Only Administrators or Managers can delete client records.");
      return;
    }
    if (!confirm("Are you sure you want to delete this client? This action is irreversible.")) return;

    try {
      await deleteDoc(doc(db, "clients", id));
      alert("Client record removed from Firestore.");
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-clients-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-400" />
            <span>Corporate Client Directory</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Manage active corporate partners, accounts, signed contracts, and notes.</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client Account</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Clients Directory Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 text-gray-400 font-mono border-b border-white/5 uppercase tracking-wider text-[10px]">
                    <th className="p-4">Company Name</th>
                    <th className="p-4">Industry</th>
                    <th className="p-4">Primary Contact</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clients.length > 0 ? (
                    clients.map(client => (
                      <tr 
                        key={client.id}
                        onClick={() => { setSelectedClient(client); setIsAdding(false); setIsEditing(false); }}
                        className={`hover:bg-white/5 transition-all cursor-pointer ${
                          selectedClient?.id === client.id ? "bg-indigo-500/10" : ""
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-bold text-white">{client.companyName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{client.website}</div>
                        </td>
                        <td className="p-4 text-gray-300">{client.industry}</td>
                        <td className="p-4">
                          <div className="font-medium text-white">{client.contactPerson}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{client.email}</div>
                        </td>
                        <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(client)}
                              className="p-1.5 bg-white/5 hover:bg-indigo-600/20 text-gray-400 hover:text-indigo-400 rounded transition-all"
                              title="Edit Client"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-1.5 bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded transition-all"
                              title="Delete Client"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 italic">No corporate client accounts registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Client Detail or Form Panel */}
        <div>
          {isAdding || isEditing ? (
            <form onSubmit={handleSaveClient} className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">{isEditing ? "Edit Client Partner" : "Add Client Account"}</h4>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setIsEditing(false); }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Google India"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Industry Verticals</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. Internet, Fintech, Retail"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Company Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. info@client.com"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="e.g. https://client.com"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Key Contact Person</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={e => setContactPerson(e.target.value)}
                      placeholder="e.g. Siddharth Mehta"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Mobile / Phone</label>
                    <input
                      type="text"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      placeholder="e.g. +91 99999..."
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Account Notes & Preferences</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Enter special skill constraints, billing fee rules, etc."
                    className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-white resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Client Partner</span>
              </button>
            </form>
          ) : selectedClient ? (
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-5 animate-in fade-in duration-200">
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">Active Account</span>
                  <h4 className="font-extrabold text-base text-white">{selectedClient.companyName}</h4>
                  <p className="text-[10px] text-gray-400 italic">Registered on {new Date(selectedClient.createdAt).toLocaleDateString()}</p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleOpenEdit(selectedClient)}
                    className="p-1.5 bg-white/5 hover:bg-indigo-600 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <span className="text-gray-400 font-medium">Industry Classification:</span>
                  <p className="text-gray-200 font-bold bg-white/5 px-2.5 py-1 rounded w-fit">{selectedClient.industry || "General Services"}</p>
                </div>

                <div className="space-y-2 border-y border-white/5 py-3">
                  <h5 className="font-bold text-white text-[10px] uppercase font-mono tracking-wider text-gray-400">Account Contacts</h5>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-gray-300">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{selectedClient.contactPerson || "Primary HR Representative"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{selectedClient.email || "No email listed"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{selectedClient.mobile || "No phone listed"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <a href={selectedClient.website} target="_blank" rel="noreferrer" className="hover:underline text-indigo-400">
                        {selectedClient.website || "No website link"}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-gray-400 font-medium">Recruitment Constraints & Notes:</span>
                  <p className="p-3 bg-neutral-950/40 rounded-xl border border-white/5 text-gray-300 leading-relaxed italic text-[11px]">
                    {selectedClient.notes || "No special account notes recorded."}
                  </p>
                </div>

                {/* Simulated Agreements & Documents lists */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">Agreements</span>
                    <div className="flex items-center gap-1 text-white font-bold">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedClient.agreementsCount} Signed NDA</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider block">Documents</span>
                    <div className="flex items-center gap-1 text-white font-bold">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>{selectedClient.documentsCount} Enclosed PDF</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl text-center space-y-3">
              <Building className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="font-bold text-sm text-gray-300">Select Client Account</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Choose an active client partner from the table directory to view contacts, contract agreements, and recruiters notes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
