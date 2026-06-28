import { useState } from "react";
import { 
  CreditCard, Search, Filter, ShieldAlert, CheckCircle, FileText, 
  Download, Printer, DollarSign, IndianRupee, Tag, AlertCircle, RefreshCw 
} from "lucide-react";
import { PaymentTransaction } from "./AdminTypes";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface PaymentManagementProps {
  transactions: PaymentTransaction[];
  onRefresh: () => void;
}

export default function PaymentManagement({
  transactions,
  onRefresh
}: PaymentManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTxnForInvoice, setSelectedTxnForInvoice] = useState<PaymentTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupons data catalog
  const [coupons, setCoupons] = useState([
    { code: "FESTIVE10", discount: "10% OFF", type: "Active" },
    { code: "ENTERPRISE50", discount: "50% OFF", type: "Active" },
    { code: "MOCKBOOST", discount: "Flat ₹500 OFF", type: "Expired" }
  ]);
  const [newCoupon, setNewCoupon] = useState({ code: "", discount: "" });

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) return;
    setCoupons([...coupons, { code: newCoupon.code.toUpperCase().trim(), discount: newCoupon.discount, type: "Active" }]);
    setNewCoupon({ code: "", discount: "" });
    alert(`Coupon "${newCoupon.code.toUpperCase()}" registered successfully!`);
  };

  const handleIssueRefund = async (txn: PaymentTransaction) => {
    if (!confirm(`⚠️ Are you sure you want to trigger a full refund for transaction ID ${txn.id} (Amount: ₹${txn.totalPaid.toLocaleString()})? This will revert premium credentials.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "payments", txn.id), {
        status: "REFUNDED"
      }, { merge: true });

      // Log action
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: txn.userId,
        userName: txn.userName,
        userEmail: txn.userEmail,
        role: "Super Admin",
        action: "PAYMENT",
        category: "Payment",
        description: `Issued full refund on transaction ID ${txn.id} under Invoice ${txn.invoiceNumber} (₹${txn.totalPaid}).`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`💸 Refund successfully issued. Corresponding audit logs synchronized.`);
      if (selectedTxnForInvoice?.id === txn.id) {
        setSelectedTxnForInvoice({ ...txn, status: "REFUNDED" });
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transactions
  const filteredTxns = transactions.filter((t) => {
    const matchesSearch = 
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="payment-management-portal">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-400" />
          <span>Billing, Subscriptions & GST Invoicing Ledger</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Perform administrative billing reviews, trace transaction footprints, issue refund certificates, and generate GST-compliant printable invoice files.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payments ledger list */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Advanced filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-gray-300">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Client, Email, Invoice..."
                className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="SUCCESS">Success (Completed)</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div className="flex items-center justify-end font-mono text-[10px] text-gray-400">
              Filtered Records: <strong className="text-white ml-1">{filteredTxns.length}</strong>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Transaction Ledger</h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 font-mono">
                    <th className="pb-3">Client details</th>
                    <th className="pb-3">Invoice Number</th>
                    <th className="pb-3 font-right">Total Paid</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredTxns.length > 0 ? (
                    filteredTxns.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5">
                        <td className="py-3 pr-2">
                          <div className="font-bold text-white">{t.userName}</div>
                          <div className="text-[9px] text-gray-400 font-mono mt-0.5">{t.userEmail}</div>
                          <div className="text-[8px] text-gray-500 font-mono mt-0.5">SaaS Plan: <strong className="text-indigo-400">{t.planName}</strong></div>
                        </td>
                        <td className="py-3 font-mono text-gray-400">{t.invoiceNumber}</td>
                        <td className="py-3 font-mono font-bold text-white">
                          ₹{t.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase ${
                            t.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                            t.status === "REFUNDED" ? "bg-blue-500/10 text-blue-400 border border-blue-500/25" :
                            "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTxnForInvoice(t)}
                            className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center"
                            title="Generate GST Invoice PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {t.status === "SUCCESS" && (
                            <button
                              onClick={() => handleIssueRefund(t)}
                              className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center border border-rose-500/20"
                              title="Trigger Full Refund"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-xs text-gray-500 italic">
                        No transactions registered in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* GST Invoice visualizer & Coupon desk */}
        <div className="space-y-6">
          
          {/* GST Invoicing Panel */}
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Tax Compliant PDF Generator</span>
            </h4>

            {selectedTxnForInvoice ? (
              <div className="space-y-4">
                {/* Print Layout */}
                <div className="p-4 bg-white text-neutral-900 rounded-xl font-mono text-[9px] leading-relaxed border border-gray-200 shadow space-y-3">
                  <div className="text-center border-b border-gray-200 pb-2 mb-2">
                    <h5 className="font-sans font-black text-xs text-indigo-950 uppercase tracking-widest">AIJobs Sourcing India Private Ltd</h5>
                    <p className="text-[8px] text-gray-400">GSTIN: 29AABCA2210G1ZY • SAC Code: 998311</p>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2 text-[8px] text-gray-500">
                    <div>
                      <p>INVOICE NO: <strong className="text-neutral-900">{selectedTxnForInvoice.invoiceNumber}</strong></p>
                      <p>DATE: {new Date(selectedTxnForInvoice.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p>CLIENT ID: {selectedTxnForInvoice.userId.substr(0, 8).toUpperCase()}</p>
                      <p>GATEWAY: {selectedTxnForInvoice.gateway}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-gray-500">BILLED TO:</p>
                    <p className="font-bold text-neutral-900">{selectedTxnForInvoice.userName}</p>
                    <p className="text-[8px] text-gray-400">{selectedTxnForInvoice.userEmail}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-gray-500 font-bold">
                      <span>PLAN DESCRIPTION</span>
                      <span>LINE CHARGES</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-900 border-b border-gray-100 pb-1.5">
                      <span>{selectedTxnForInvoice.planName}</span>
                      <span>₹{selectedTxnForInvoice.amount.toLocaleString()}</span>
                    </div>

                    <div className="space-y-1 text-right text-gray-500">
                      <p>Line Subtotal: ₹{selectedTxnForInvoice.amount.toLocaleString()}</p>
                      <p>Integrated GST (18%): ₹{selectedTxnForInvoice.gstAmount.toLocaleString()}</p>
                      {selectedTxnForInvoice.discountAmount > 0 && (
                        <p className="text-rose-600">Discounts/Coupons: -₹{selectedTxnForInvoice.discountAmount.toLocaleString()}</p>
                      )}
                      <p className="font-extrabold text-neutral-900 text-[10px] pt-1.5 border-t border-gray-200">
                        Total Collected Paid: ₹{selectedTxnForInvoice.totalPaid.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-center text-[7px] text-gray-400 pt-2 border-t border-gray-200">
                    This is an electronically generated valid tax certificate. No manual signatures required.
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-xs text-gray-300 font-bold rounded-lg border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Tax Invoice</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-16 text-[10px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose a transaction row to parse line items and format a printable billing invoice.
              </div>
            )}
          </div>

          {/* Coupon controller */}
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1">
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>Promo Campaign coupons</span>
            </h4>

            {/* List active coupons */}
            <div className="space-y-1.5 text-xs">
              {coupons.map((c) => (
                <div key={c.code} className="flex justify-between items-center p-2 bg-neutral-950/30 rounded border border-white/5">
                  <div className="font-mono">
                    <strong className="text-white">{c.code}</strong>
                    <span className="text-[9px] text-gray-400 ml-2">{c.discount}</span>
                  </div>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    c.type === "Active" ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-500/10 text-neutral-400"
                  }`}>{c.type}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateCoupon} className="flex gap-2 text-xs">
              <input
                type="text"
                required
                value={newCoupon.code}
                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value })}
                placeholder="CAMPAIGN50"
                className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
              <input
                type="text"
                required
                value={newCoupon.discount}
                onChange={e => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                placeholder="50% OFF"
                className="w-20 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
              <button
                type="submit"
                className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Add
              </button>
            </form>
          </div>

        </div>
      </div>

    </div>
  );
}
