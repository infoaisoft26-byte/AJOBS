import { useState } from "react";
import { 
  CheckCircle2, DollarSign, Users, Briefcase, Plus, Save, X, Trash2, 
  ChevronRight, Calendar, ArrowUpRight, TrendingUp, Sparkles, Building
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { PlacementModel, ClientModel } from "./CrmTypes";

interface CrmPlacementsViewProps {
  placements: PlacementModel[];
  clients: ClientModel[];
  onRefresh: () => void;
  userRole: "Admin" | "Manager" | "Recruiter" | "Viewer";
}

export default function CrmPlacementsView({
  placements,
  clients,
  onRefresh,
  userRole
}: CrmPlacementsViewProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlacementModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<"released" | "joined" | "rejected" | "hold" | "replacement">("released");
  const [invoiceStatus, setInvoiceStatus] = useState<"pending" | "paid" | "overdue">("pending");
  const [salaryText, setSalaryText] = useState("2400000"); // Standard annual salary 24 Lakhs
  const [feePercentText, setFeePercentText] = useState("8.33"); // Standard agency percentage

  const isReadOnly = userRole === "Viewer";

  const handleOpenAdd = () => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot create placement records.");
      return;
    }
    setCandidateName("Amit Patel");
    setJobTitle("Staff DevOps Engineer");
    setClientName(clients[0]?.companyName || "Google India");
    setStatus("released");
    setInvoiceStatus("pending");
    setSalaryText("3000000");
    setFeePercentText("8.33");
    setIsAdding(true);
  };

  const handleSavePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      const pId = "place_" + Math.random().toString(36).substr(2, 9);
      const salaryNum = parseFloat(salaryText) || 0;
      const feePercentNum = parseFloat(feePercentText) || 8.33;
      const revenue = Math.round(salaryNum * (feePercentNum / 100));

      const pObj: PlacementModel = {
        id: pId,
        jobTitle,
        clientName,
        candidateName,
        status,
        invoiceStatus,
        salary: salaryNum,
        feePercent: feePercentNum,
        revenue,
        date: new Date().toISOString().split("T")[0]
      };

      await setDoc(doc(db, "placements", pId), pObj);
      alert("Corporate placement finalized & invoice billed to client!");
      setIsAdding(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveStatus = async (id: string, newStatus: "released" | "joined" | "rejected" | "hold" | "replacement") => {
    if (isReadOnly) return;
    try {
      const original = placements.find(p => p.id === id);
      if (original) {
        await setDoc(doc(db, "placements", id), {
          ...original,
          status: newStatus
        });
        alert(`Placement pipeline status shifted to: ${newStatus.toUpperCase()}`);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvoiceStatusUpdate = async (id: string, newInv: "pending" | "paid" | "overdue") => {
    if (userRole !== "Admin" && userRole !== "Manager") {
      alert("Role Permission Restriction: Only Administrators or Managers can manage invoicing.");
      return;
    }
    try {
      const original = placements.find(p => p.id === id);
      if (original) {
        await setDoc(doc(db, "placements", id), {
          ...original,
          invoiceStatus: newInv
        });
        alert(`Placement billing invoice marked as ${newInv.toUpperCase()}!`);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlacement = async (id: string) => {
    if (userRole !== "Admin" && userRole !== "Manager") {
      alert("Role Permission Restriction: Only Administrators or Managers can delete placement records.");
      return;
    }
    if (!confirm("Are you sure you want to delete this placement record? This removes billing values from revenue charts.")) return;

    try {
      await deleteDoc(doc(db, "placements", id));
      alert("Placement deleted from database.");
      if (selectedPlace?.id === id) {
        setSelectedPlace(null);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-placements-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            <span>Placement & Invoicing CRM Panel</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Audit final candidate placements, release candidate offers, and log corporate agency commission fees.</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" />
            <span>Record Final Placement</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Placements Pipeline Horizontal Kanban Stages */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {placements.length > 0 ? (
              placements.map(item => (
                <div
                  key={item.id}
                  onClick={() => { setSelectedPlace(item); setIsAdding(false); }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                    selectedPlace?.id === item.id 
                      ? "bg-indigo-600/10 border-indigo-500/50" 
                      : "glass border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider block w-fit">
                        {item.status}
                      </span>
                      <h4 className="font-extrabold text-sm text-white pt-1">{item.candidateName}</h4>
                      <p className="text-[10px] text-gray-400">{item.jobTitle}</p>
                    </div>

                    <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                      item.invoiceStatus === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      item.invoiceStatus === "overdue" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      Invoice: {item.invoiceStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-indigo-400" />
                      <span>{item.clientName}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <strong>₹{item.revenue.toLocaleString()} Fee</strong>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-xs text-gray-500 italic glass rounded-xl">No active placements registered. Select match and place candidate.</div>
            )}
          </div>
        </div>

        {/* Invoicing, Fee Details and Quick Status Transition Drawer */}
        <div>
          {isAdding ? (
            <form onSubmit={handleSavePlacement} className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">Record Placement Details</h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Placed Candidate Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                    placeholder="e.g. Aryan Sharma"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Hiring Designation Title *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Fullstack Architect"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Corporate Client *</label>
                  <select
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.companyName}>{c.companyName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Pipeline Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    >
                      <option value="released">Offer Released</option>
                      <option value="joined">Joined</option>
                      <option value="hold">On Hold</option>
                      <option value="replacement">Replacement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Invoice Billed Stage</label>
                    <select
                      value={invoiceStatus}
                      onChange={e => setInvoiceStatus(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">CTC Salary (INR Annual)</label>
                    <input
                      type="number"
                      value={salaryText}
                      onChange={e => setSalaryText(e.target.value)}
                      placeholder="e.g. 2400000"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Agency Fee % (CTC)</label>
                    <input
                      type="text"
                      value={feePercentText}
                      onChange={e => setFeePercentText(e.target.value)}
                      placeholder="e.g. 8.33"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Issue Invoice & Save</span>
              </button>
            </form>
          ) : selectedPlace ? (
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-white/5 pb-3 space-y-1">
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">Invoicing Details</span>
                <h4 className="font-extrabold text-base text-white">{selectedPlace.candidateName}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">{selectedPlace.jobTitle} • {selectedPlace.clientName}</p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Auto Calculated Commission Panel */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                  <span className="text-[9px] font-mono text-emerald-400 font-extrabold uppercase tracking-wider block">Commission Calculations</span>
                  
                  <div className="space-y-1.5 font-mono text-[11px] text-gray-300">
                    <div className="flex justify-between">
                      <span>Annual CTC salary:</span>
                      <strong className="text-white">₹{selectedPlace.salary.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Agency margin fee:</span>
                      <strong className="text-white">{selectedPlace.feePercent}%</strong>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2 text-xs">
                      <span className="font-bold text-emerald-400">Calculated Revenue:</span>
                      <strong className="text-emerald-400 font-black">₹{selectedPlace.revenue.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-gray-400 font-medium">Pipeline Stage Shift:</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                    {["released", "joined", "rejected", "hold", "replacement"].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleMoveStatus(selectedPlace.id, st as any)}
                        disabled={isReadOnly}
                        className={`py-1 rounded border capitalize transition-all ${
                          selectedPlace.status === st 
                            ? "bg-indigo-600 border-indigo-500 text-white" 
                            : "border-white/5 hover:bg-white/5 text-gray-400"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mark Invoice States */}
                {(userRole === "Admin" || userRole === "Manager") && (
                  <div className="space-y-2 border-t border-white/5 pt-3.5">
                    <span className="text-gray-400 font-medium">Invoice Billed State:</span>
                    <div className="flex gap-1">
                      {["pending", "paid", "overdue"].map((inv) => (
                        <button
                          key={inv}
                          onClick={() => handleInvoiceStatusUpdate(selectedPlace.id, inv as any)}
                          className={`flex-1 py-1 text-[10px] font-bold capitalize rounded border transition-all ${
                            selectedPlace.invoiceStatus === inv 
                              ? "bg-emerald-600 border-emerald-500 text-white" 
                              : "border-white/5 text-gray-400 hover:bg-white/5"
                          }`}
                        >
                          {inv}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(userRole === "Admin" || userRole === "Manager") && (
                  <div className="pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleDeletePlacement(selectedPlace.id)}
                      className="w-full py-2 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/25 text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Placement Record</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="font-bold text-sm text-gray-300">Select Placement Card</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Choose an active placement record on the left grid directory to calculate billing commission margins, modify invoice stages, or shift pipeline stages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
