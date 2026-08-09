import React, { useEffect, useState } from "react";
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Lock, 
  Download, 
  CreditCard, 
  Eye, 
  RefreshCw, 
  Users, 
  Play, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Papa from "papaparse";
import { EmployeePayroll, PayrollRun } from "../../types/employeeTypes";
import { 
  approvePayrollRun, 
  generatePayrollRun, 
  getEmployeePayrollsByRun, 
  getPayrollRuns, 
  markSalaryPaid 
} from "../../services/employeeService";
import PayslipModal from "../employee/PayslipModal";

export default function PayrollManagementModule() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [payrollItems, setPayrollItems] = useState<EmployeePayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);

  // Month & Year selection for generation
  const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(new Date().getFullYear());

  // Payslip view modal
  const [viewPayslip, setViewPayslip] = useState<EmployeePayroll | null>(null);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payTarget, setPayTarget] = useState<EmployeePayroll | null>(null);
  const [payForm, setPayForm] = useState({
    paymentMethod: "NEFT / Bank Transfer",
    bankReference: "HDFC-CORP-0192",
    utrReference: "UTR" + Math.floor(100000000000 + Math.random() * 900000000000)
  });

  const [message, setMessage] = useState<string | null>(null);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const list = await getPayrollRuns();
      setRuns(list);
      if (list.length > 0 && !selectedRun) {
        setSelectedRun(list[0]);
        const items = await getEmployeePayrollsByRun(list[0].runId);
        setPayrollItems(items);
      }
    } catch (err) {
      console.error("Error loading payroll runs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleSelectRun = async (run: PayrollRun) => {
    setSelectedRun(run);
    setLoading(true);
    try {
      const items = await getEmployeePayrollsByRun(run.runId);
      setPayrollItems(items);
    } catch (err) {
      console.error("Error fetching run items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRun = async () => {
    setGenLoading(true);
    setMessage(null);
    try {
      const run = await generatePayrollRun(genMonth, genYear);
      setMessage(`Successfully generated payroll draft for ${run.monthYearString}!`);
      await loadRuns();
      setSelectedRun(run);
      const items = await getEmployeePayrollsByRun(run.runId);
      setPayrollItems(items);
    } catch (err: any) {
      setMessage(`Generation error: ${err.message || "Failed to generate payroll"}`);
    } finally {
      setGenLoading(false);
    }
  };

  const handleApproveRun = async () => {
    if (!selectedRun) return;
    try {
      await approvePayrollRun(selectedRun.runId);
      setMessage(`Payroll run ${selectedRun.monthYearString} approved and locked!`);
      await loadRuns();
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;

    try {
      await markSalaryPaid(payTarget.payrollId, payForm);
      setShowPaymentModal(false);
      setMessage(`Salary marked PAID for ${payTarget.employeeName} (UTR: ${payForm.utrReference})`);
      if (selectedRun) {
        const items = await getEmployeePayrollsByRun(selectedRun.runId);
        setPayrollItems(items);
      }
    } catch (err) {
      console.error("Payment mark error:", err);
    }
  };

  const handleExportCsv = () => {
    if (payrollItems.length === 0) return;
    const csvData = payrollItems.map(p => ({
      "Employee ID": p.employeeId,
      "Employee Name": p.employeeName,
      "Department": p.department,
      "Designation": p.designation,
      "Month Year": p.monthYearString,
      "Calendar Days": p.calendarDays,
      "Present Days": p.presentDays,
      "Unpaid LOP Days": p.unpaidLeaveDays,
      "Gross Salary (INR)": p.monthlyGrossSalary,
      "Basic Pay": p.basicPay,
      "HRA": p.hraPay,
      "PF Deduction": p.pfDeduction,
      "ESI Deduction": p.esiDeduction,
      "Professional Tax": p.professionalTax,
      "TDS Deduction": p.tdsDeduction,
      "LOP Deduction": p.lopDeductionAmount,
      "Total Deductions": p.totalDeductions,
      "Net Payable Salary (INR)": p.netSalary,
      "Payment Status": p.paymentStatus,
      "UTR Reference": p.utrReference || "N/A"
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AIJOBS_Salary_Register_${selectedRun?.monthYearString.replace(/\s+/g, "_") || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-xs text-gray-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/80 p-5 rounded-2xl border border-gray-800 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-400" /> Automatic Employee Payroll Engine
          </h2>
          <p className="text-gray-400">Generate monthly payroll from real attendance & LOP data, approve runs, and issue verified payslips.</p>
        </div>

        {/* Generate Controls */}
        <div className="flex items-center gap-2">
          <select
            value={genMonth}
            onChange={(e) => setGenMonth(Number(e.target.value))}
            className="bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("en", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            value={genYear}
            onChange={(e) => setGenYear(Number(e.target.value))}
            className="bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>

          <button
            disabled={genLoading}
            onClick={handleGenerateRun}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Play className="w-4 h-4" /> {genLoading ? "Calculating..." : "Calculate Payroll"}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 rounded-xl font-mono text-xs">
          {message}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Payroll Runs History List Sidebar */}
        <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-3">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Payroll Run Batches</h3>
          {runs.length > 0 ? (
            <div className="space-y-2">
              {runs.map((r) => (
                <div
                  key={r.runId}
                  onClick={() => handleSelectRun(r)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedRun?.runId === r.runId
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md"
                      : "bg-gray-950/60 border-gray-800 text-gray-400 hover:bg-gray-900"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <strong className="text-white text-xs">{r.monthYearString}</strong>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono mt-1 text-gray-300">
                    Net: ₹{r.totalNetSalary.toLocaleString("en-IN")} ({r.totalEmployees} Emps)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-6 text-center">No payroll batches generated yet.</p>
          )}
        </div>

        {/* Selected Payroll Batch Detail & Employee Table */}
        <div className="lg:col-span-3 p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-6 shadow-xl">
          {selectedRun ? (
            <>
              {/* Batch Overview Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedRun.monthYearString} Payroll Register
                  </h3>
                  <p className="text-gray-400 text-[11px]">
                    Total Employees: <strong className="text-white">{selectedRun.totalEmployees}</strong> • Total Net Payout: <strong className="text-emerald-400 font-mono">₹{selectedRun.totalNetSalary.toLocaleString("en-IN")}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer border border-gray-700"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV Register
                  </button>
                  {selectedRun.status !== "approved" && (
                    <button
                      onClick={handleApproveRun}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Lock className="w-3.5 h-3.5" /> Approve & Lock Batch
                    </button>
                  )}
                </div>
              </div>

              {/* Employee Salary List Table */}
              {payrollItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Present / LOP</th>
                        <th className="p-3">Gross Salary</th>
                        <th className="p-3">Deductions</th>
                        <th className="p-3">Net Salary</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {payrollItems.map((p) => (
                        <tr key={p.payrollId} className="hover:bg-gray-800/40">
                          <td className="p-3 font-bold text-white">
                            {p.employeeName}
                            <span className="block text-[10px] text-gray-500 font-mono">{p.employeeId} • {p.department}</span>
                          </td>
                          <td className="p-3 font-mono">
                            <span className="text-emerald-400 font-bold">{p.presentDays}d</span> / <span className="text-rose-400 font-bold">{p.unpaidLeaveDays}d LOP</span>
                          </td>
                          <td className="p-3 font-mono">₹{p.monthlyGrossSalary.toLocaleString("en-IN")}</td>
                          <td className="p-3 font-mono text-rose-400">₹{p.totalDeductions.toLocaleString("en-IN")}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">₹{p.netSalary.toLocaleString("en-IN")}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.paymentStatus === "paid" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewPayslip(p)}
                                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-indigo-300 hover:text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                              >
                                Payslip
                              </button>
                              {p.paymentStatus !== "paid" && (
                                <button
                                  onClick={() => {
                                    setPayTarget(p);
                                    setShowPaymentModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 font-mono">Loading payroll items...</div>
              )}
            </>
          ) : (
            <div className="text-center py-16 space-y-3">
              <DollarSign className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">Select a payroll run batch or calculate a new batch above.</p>
            </div>
          )}
        </div>
      </div>

      {/* MARK SALARY PAID MODAL */}
      {showPaymentModal && payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Record Salary Disbursal</h3>
            <p className="text-xs text-gray-400">Employee: <strong className="text-white">{payTarget.employeeName}</strong> (Net ₹{payTarget.netSalary.toLocaleString("en-IN")})</p>

            <form onSubmit={handleMarkPaidSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Payment Method</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                >
                  <option value="NEFT / Bank Transfer">NEFT / Bank Transfer</option>
                  <option value="IMPS / RTGS">IMPS / RTGS</option>
                  <option value="Corporate Direct Deposit">Corporate Direct Deposit</option>
                  <option value="UPI Corporate Payout">UPI Corporate Payout</option>
                </select>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Bank Reference Account</label>
                <input
                  type="text"
                  value={payForm.bankReference}
                  onChange={(e) => setPayForm({ ...payForm, bankReference: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">UTR / Bank Transaction Reference Number *</label>
                <input
                  type="text"
                  required
                  value={payForm.utrReference}
                  onChange={(e) => setPayForm({ ...payForm, utrReference: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYSLIP VIEW MODAL */}
      {viewPayslip && (
        <PayslipModal
          payroll={viewPayslip}
          onClose={() => setViewPayslip(null)}
        />
      )}
    </div>
  );
}
