import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  PieChart,
  BookOpen,
  ShieldAlert,
  RefreshCw,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Printer,
  Eye,
  Lock,
  Scale,
  CreditCard,
  History,
  FileSpreadsheet
} from "lucide-react";

interface FinanceAndAccountingModuleProps {
  userRole?: string;
  adminUserId?: string;
}

export const FinanceAndAccountingModule: React.FC<FinanceAndAccountingModuleProps> = ({
  userRole = "admin",
  adminUserId = "admin"
}) => {
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  // Navigation State
  const [activeTab, setActiveTab] = useState<"overview" | "coa" | "journals" | "reports" | "gst" | "invoices" | "expenses" | "audit">("overview");
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [gstReport, setGstReport] = useState<any>(null);
  const [pnlReport, setPnlReport] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Ledger Modal State
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountLedger, setAccountLedger] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Invoice / Credit Note Print Modal
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docType, setDocType] = useState<"invoice" | "credit_note" | null>(null);

  // Expense Modal Form
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    vendor: "",
    category: "Software & Hosting",
    description: "",
    amount: "",
    gstAmount: "",
    paymentMethod: "Bank Transfer",
    referenceNumber: ""
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Refund Modal Form
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({
    paymentId: "",
    refundAmount: "",
    reason: ""
  });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Reconciliation State
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);

  // Load All Financial Data
  const fetchFinanceData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);

    try {
      const headers = { "x-user-role": userRole };

      const [
        dashRes,
        coaRes,
        jrnRes,
        invRes,
        cnRes,
        expRes,
        gstRes,
        pnlRes,
        bsRes,
        tbRes,
        auditRes
      ] = await Promise.all([
        fetch("/api/finance/dashboard", { headers }).then(r => r.json()),
        fetch("/api/finance/chart-of-accounts", { headers }).then(r => r.json()),
        fetch("/api/finance/journal-entries?limit=100", { headers }).then(r => r.json()),
        fetch("/api/finance/invoices", { headers }).then(r => r.json()),
        fetch("/api/finance/credit-notes", { headers }).then(r => r.json()),
        fetch("/api/finance/expenses", { headers }).then(r => r.json()),
        fetch("/api/finance/tax/gst-report", { headers }).then(r => r.json()),
        fetch("/api/finance/reports/pnl", { headers }).then(r => r.json()),
        fetch("/api/finance/reports/balance-sheet", { headers }).then(r => r.json()),
        fetch("/api/finance/reports/trial-balance", { headers }).then(r => r.json()),
        fetch("/api/finance/audit-logs", { headers }).then(r => r.json())
      ]);

      if (dashRes.success) setDashboardData(dashRes.summary);
      if (dashRes.chartOfAccounts) setChartOfAccounts(dashRes.chartOfAccounts);
      else if (coaRes.accounts) setChartOfAccounts(coaRes.accounts);

      if (jrnRes.journals) setJournalEntries(jrnRes.journals);
      if (invRes.invoices) setInvoices(invRes.invoices);
      if (cnRes.creditNotes) setCreditNotes(cnRes.creditNotes);
      if (expRes.expenses) setExpenses(expRes.expenses);
      if (gstRes.gstReport) setGstReport(gstRes.gstReport);
      if (pnlRes.pnl) setPnlReport(pnlRes.pnl);
      if (bsRes.balanceSheet) setBalanceSheet(bsRes.balanceSheet);
      if (tbRes.trialBalance) setTrialBalance(tbRes.trialBalance);
      if (auditRes.logs) setAuditLogs(auditRes.logs);
    } catch (err: any) {
      console.error("Error fetching finance data:", err);
      setError(err.message || "Failed to load financial records from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [isAdmin, userRole]);

  // Fetch Account Ledger Details
  const handleOpenLedger = async (accountId: string) => {
    setSelectedAccountId(accountId);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/finance/ledger/${accountId}`, {
        headers: { "x-user-role": userRole }
      }).then(r => r.json());

      if (res.success) {
        setAccountLedger(res);
      }
    } catch (err) {
      console.error("Failed to load account ledger:", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Submit Vendor Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.vendor || !expenseForm.amount) return;

    setSubmittingExpense(true);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole
        },
        body: JSON.stringify({
          ...expenseForm,
          adminUserId
        })
      }).then(r => r.json());

      if (res.success) {
        setShowExpenseModal(false);
        setExpenseForm({
          vendor: "",
          category: "Software & Hosting",
          description: "",
          amount: "",
          gstAmount: "",
          paymentMethod: "Bank Transfer",
          referenceNumber: ""
        });
        fetchFinanceData();
      } else {
        alert(res.error || "Failed to record expense");
      }
    } catch (err: any) {
      alert("Error creating expense: " + err.message);
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Submit Refund
  const handleIssueRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundForm.paymentId || !refundForm.refundAmount) return;

    setSubmittingRefund(true);
    try {
      const res = await fetch("/api/finance/refunds/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole
        },
        body: JSON.stringify({
          ...refundForm,
          adminUserId
        })
      }).then(r => r.json());

      if (res.success) {
        setShowRefundModal(false);
        setRefundForm({ paymentId: "", refundAmount: "", reason: "" });
        alert(`Refund issued successfully! Credit Note: ${res.creditNoteNumber}`);
        fetchFinanceData();
      } else {
        alert(res.error || "Failed to issue refund");
      }
    } catch (err: any) {
      alert("Error issuing refund: " + err.message);
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Run Accounting Reconciliation
  const handleRunReconciliation = async () => {
    setReconciling(true);
    setReconcileMessage(null);
    try {
      const res = await fetch("/api/finance/reconcile", {
        method: "POST",
        headers: { "x-user-role": userRole }
      }).then(r => r.json());

      if (res.success) {
        setReconcileMessage(`Reconciliation complete! Created ${res.stats?.journalsCreated || 0} missing journals and synced ${res.stats?.statusSynced || 0} payments.`);
        fetchFinanceData();
      } else {
        setReconcileMessage(`Reconciliation failed: ${res.error}`);
      }
    } catch (err: any) {
      setReconcileMessage(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  // Strict Access Guard
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-slate-300 text-sm max-w-lg mx-auto">
            The Production Accounting and Finance module is strictly restricted to authorized Admin and Super Admin roles. Your account ({userRole}) does not have permission to view or modify general ledger accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Module Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Finance & Double-Entry Accounting
                <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Production Engine
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Real-time general ledger, statutory GST accounting, double-entry journal balance enforcement, and audit logs.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setRefreshing(true); fetchFinanceData(); }}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            Refresh Ledger
          </button>

          <button
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-2 transition"
          >
            <Scale className={`w-3.5 h-3.5 ${reconciling ? "animate-spin text-indigo-400" : ""}`} />
            Run Reconciliation
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Record Expense
          </button>

          <button
            onClick={() => setShowRefundModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 transition"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
            Issue Refund
          </button>
        </div>
      </div>

      {/* Reconciliation Alert Banner */}
      {reconcileMessage && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 text-xs text-indigo-300 flex items-center justify-between">
          <span>{reconcileMessage}</span>
          <button onClick={() => setReconcileMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none gap-1 pb-1">
        {[
          { id: "overview", label: "Executive Overview", icon: PieChart },
          { id: "coa", label: "Chart of Accounts", icon: BookOpen },
          { id: "journals", label: "Journal Entries", icon: FileText },
          { id: "reports", label: "Financial Reports", icon: FileSpreadsheet },
          { id: "gst", label: "Tax & GST Compliance", icon: Receipt },
          { id: "invoices", label: "Invoices & Credit Notes", icon: CreditCard },
          { id: "expenses", label: "Vendor Expenses", icon: DollarSign },
          { id: "audit", label: "Audit Logs", icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition border-b-2 ${
                isActive
                  ? "bg-slate-900 text-emerald-400 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p>Fetching real double-entry general ledger records from Firestore...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl text-red-400 text-sm">
          <p className="font-semibold">Error Loading Financial Records:</p>
          <p className="mt-1 text-slate-300">{error}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && dashboardData && (
            <div className="space-y-6">
              {/* Top Key Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Gross Sales Revenue</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ₹{dashboardData.grossRevenue?.toLocaleString("en-IN") || "0"}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Recruiter: ₹{dashboardData.recruiterRevenue || 0}</span>
                    <span>Agency: ₹{dashboardData.consultancyRevenue || 0}</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Bank Gateway Clearing Cash</span>
                    <Building2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ₹{dashboardData.bankClearingCash?.toLocaleString("en-IN") || "0"}
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Real-time settled balance</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Output GST Liability</span>
                    <Receipt className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-amber-300">
                    ₹{dashboardData.totalGstLiability?.toLocaleString("en-IN") || "0"}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    SAC 998311 (CGST + SGST + IGST)
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Net Operating Margin</span>
                    <DollarSign className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ₹{dashboardData.netProfit?.toLocaleString("en-IN") || "0"}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Expenses: ₹{dashboardData.totalExpenses || 0}
                  </div>
                </div>
              </div>

              {/* Status & Integrity Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    General Ledger Account Balances
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                        <tr>
                          <th className="p-2.5">Code</th>
                          <th className="p-2.5">Account Name</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5 text-right">Debit Total</th>
                          <th className="p-2.5 text-right">Credit Total</th>
                          <th className="p-2.5 text-right">Net Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {chartOfAccounts.map(acc => (
                          <tr key={acc.accountId} className="hover:bg-slate-800/30">
                            <td className="p-2.5 font-mono text-emerald-400 font-medium">{acc.accountId}</td>
                            <td className="p-2.5 font-medium text-white">{acc.accountName}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {acc.category}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-400">₹{acc.debitTotal || 0}</td>
                            <td className="p-2.5 text-right font-mono text-slate-400">₹{acc.creditTotal || 0}</td>
                            <td className="p-2.5 text-right font-mono font-semibold text-white">
                              ₹{acc.currentBalance || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-400" />
                    Double-Entry System Health
                  </h3>
                  
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 flex items-center justify-between">
                      <span className="text-slate-300">Total Payments Recorded:</span>
                      <span className="font-bold text-white">{dashboardData.totalPaymentsCount || 0}</span>
                    </div>

                    <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 flex items-center justify-between">
                      <span className="text-slate-300">Successful Collections:</span>
                      <span className="font-bold text-emerald-400">{dashboardData.successfulPaymentsCount || 0}</span>
                    </div>

                    <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 flex items-center justify-between">
                      <span className="text-slate-300">Pending Reconciliations:</span>
                      <span className={`font-bold ${dashboardData.pendingReconciliationCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {dashboardData.pendingReconciliationCount || 0}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-slate-300 font-medium">
                        <span>Double-Entry Balance Rule:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Every transaction validates Total Debit == Total Credit prior to committing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHART OF ACCOUNTS */}
          {activeTab === "coa" && (
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Chart of Accounts (COA)</h3>
                  <p className="text-slate-400 text-xs">Standard double-entry accounts categorized under Assets, Liabilities, Equity, Income, and Expenses.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                    <tr>
                      <th className="p-3">Account Code</th>
                      <th className="p-3">Account Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit Total</th>
                      <th className="p-3 text-right">Credit Total</th>
                      <th className="p-3 text-right">Net Balance</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {chartOfAccounts.map(acc => (
                      <tr key={acc.accountId} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono text-emerald-400 font-bold">{acc.accountId}</td>
                        <td className="p-3 font-semibold text-white">{acc.accountName}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                            {acc.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">{acc.description || "N/A"}</td>
                        <td className="p-3 text-right font-mono text-slate-300">₹{acc.debitTotal || 0}</td>
                        <td className="p-3 text-right font-mono text-slate-300">₹{acc.creditTotal || 0}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ₹{acc.currentBalance || 0}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenLedger(acc.accountId)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition"
                          >
                            View Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: JOURNAL ENTRIES */}
          {activeTab === "journals" && (
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Double-Entry Journal Entries</h3>
                  <p className="text-slate-400 text-xs">Immutable chronological record of balanced accounting transactions.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                    <tr>
                      <th className="p-3">Journal ID</th>
                      <th className="p-3">Reference Key</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Lines Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {journalEntries.map(jrn => (
                      <tr key={jrn.journalId} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono text-indigo-400 font-semibold">{jrn.journalId}</td>
                        <td className="p-3 font-mono text-slate-300 text-[11px]">{jrn.reference}</td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">{jrn.transactionDate?.slice(0, 10)}</td>
                        <td className="p-3 font-medium text-white">{jrn.description}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ₹{jrn.totalAmount}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {jrn.status || "posted"}
                          </span>
                        </td>
                        <td className="p-3 text-xs">
                          <div className="space-y-1 bg-slate-950 p-2 rounded border border-slate-800 text-[11px] font-mono">
                            {jrn.lines?.map((line: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between gap-4">
                                <span>[{line.accountId}] {line.accountName}</span>
                                <span className={line.debit > 0 ? "text-emerald-400" : "text-amber-400"}>
                                  {line.debit > 0 ? `DR ₹${line.debit}` : `CR ₹${line.credit}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIAL REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Profit and Loss Statement */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Statement of Profit & Loss</h3>
                    <p className="text-slate-400 text-xs">Financial Year {pnlReport?.financialYear || "2026-27"}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Generated: {pnlReport?.generatedAt?.slice(0, 10)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Revenue Column */}
                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h4 className="font-semibold text-emerald-400 text-sm border-b border-slate-800 pb-2">Operating Revenue</h4>
                    <div className="space-y-2">
                      {pnlReport?.revenues?.map((r: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-slate-300">
                          <span>{r.name}</span>
                          <span className="font-mono font-semibold text-white">₹{r.amount}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold text-white text-sm">
                      <span>Total Revenue</span>
                      <span className="text-emerald-400 font-mono">₹{pnlReport?.totalRevenue || 0}</span>
                    </div>
                  </div>

                  {/* Expenses Column */}
                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h4 className="font-semibold text-rose-400 text-sm border-b border-slate-800 pb-2">Operating Expenses</h4>
                    <div className="space-y-2">
                      {pnlReport?.expenses?.map((e: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-slate-300">
                          <span>{e.name}</span>
                          <span className="font-mono font-semibold text-white">₹{e.amount}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold text-white text-sm">
                      <span>Total Expenses</span>
                      <span className="text-rose-400 font-mono">₹{pnlReport?.totalExpense || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-white">Net Operating Income (Profit)</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    ₹{pnlReport?.netOperatingIncome || 0}
                  </span>
                </div>
              </div>

              {/* Trial Balance */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Trial Balance Statement</h3>
                  <span className={`text-xs px-2.5 py-1 rounded font-semibold border ${
                    trialBalance?.isBalanced
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {trialBalance?.isBalanced ? "✓ Trial Balance Balanced" : "⚠ Unbalanced Warning"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Account Name</th>
                        <th className="p-2.5 text-right">Debit (₹)</th>
                        <th className="p-2.5 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {trialBalance?.rows?.map((row: any) => (
                        <tr key={row.accountId} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-mono text-emerald-400">{row.accountId}</td>
                          <td className="p-2.5 font-medium text-white">{row.accountName}</td>
                          <td className="p-2.5 text-right font-mono text-slate-300">{row.debit}</td>
                          <td className="p-2.5 text-right font-mono text-slate-300">{row.credit}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-800/80 font-bold text-white border-t border-slate-700">
                      <tr>
                        <td colSpan={2} className="p-3">TOTALS</td>
                        <td className="p-3 text-right font-mono text-emerald-400">₹{trialBalance?.sumDebit}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">₹{trialBalance?.sumCredit}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TAX & GST COMPLIANCE */}
          {activeTab === "gst" && gstReport && (
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  Statutory GST Accounting (India)
                </h3>
                <p className="text-slate-400 text-xs">SAC 998311 - Management consulting & recruitment services</p>
              </div>

              {/* GST Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400">Total Taxable Value</span>
                  <div className="text-xl font-bold text-white">₹{gstReport.totalTaxableValue || 0}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400">CGST (9%)</span>
                  <div className="text-xl font-bold text-amber-300">₹{gstReport.totalCgst || 0}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400">SGST (9%)</span>
                  <div className="text-xl font-bold text-amber-300">₹{gstReport.totalSgst || 0}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400">Net Statutory GST Payable</span>
                  <div className="text-xl font-bold text-emerald-400">₹{gstReport.netTaxPayable || 0}</div>
                </div>
              </div>

              {/* Tax Ledger Entries */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white">Tax Ledger Entries</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Entry ID</th>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5 text-right">Taxable Value</th>
                        <th className="p-2.5 text-right">CGST</th>
                        <th className="p-2.5 text-right">SGST</th>
                        <th className="p-2.5 text-right">IGST</th>
                        <th className="p-2.5 text-right">Total Tax</th>
                        <th className="p-2.5 text-center">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {gstReport.records?.map((rec: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-mono text-slate-400">{rec.id}</td>
                          <td className="p-2.5 font-mono text-emerald-400 font-semibold">{rec.invoiceNumber || rec.creditNoteNumber}</td>
                          <td className="p-2.5 text-right font-mono text-slate-200">₹{rec.taxableValue}</td>
                          <td className="p-2.5 text-right font-mono text-slate-300">₹{rec.cgst}</td>
                          <td className="p-2.5 text-right font-mono text-slate-300">₹{rec.sgst}</td>
                          <td className="p-2.5 text-right font-mono text-slate-300">₹{rec.igst}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-300">₹{rec.totalTax}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {rec.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: INVOICES & CREDIT NOTES */}
          {activeTab === "invoices" && (
            <div className="space-y-6">
              {/* Sequential Tax Invoices */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Sequential Tax Invoices
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                      <tr>
                        <th className="p-3">Invoice Number</th>
                        <th className="p-3">Payment ID</th>
                        <th className="p-3">User Email</th>
                        <th className="p-3">Plan</th>
                        <th className="p-3 text-right">Taxable Amount</th>
                        <th className="p-3 text-right">GST (18%)</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {invoices.map(inv => (
                        <tr key={inv.invoiceId} className="hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-bold text-emerald-400">{inv.invoiceNumber}</td>
                          <td className="p-3 font-mono text-slate-400 text-[11px]">{inv.paymentId}</td>
                          <td className="p-3 text-slate-300">{inv.userEmail || "Subscriber"}</td>
                          <td className="p-3 font-medium text-white">{inv.planName || "Database Access"}</td>
                          <td className="p-3 text-right font-mono text-slate-300">₹{inv.taxableAmount || inv.baseAmount}</td>
                          <td className="p-3 text-right font-mono text-amber-300">₹{inv.gstAmount}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{inv.totalAmount}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => { setSelectedDoc(inv); setDocType("invoice"); }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3 h-3 text-indigo-400" />
                              View Tax Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Credit Notes */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-amber-400" />
                  Credit Notes (Refunds)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                      <tr>
                        <th className="p-3">Credit Note #</th>
                        <th className="p-3">Original Invoice</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3 text-right">Taxable Reversed</th>
                        <th className="p-3 text-right">GST Reversed</th>
                        <th className="p-3 text-right">Total Refunded</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {creditNotes.map(cn => (
                        <tr key={cn.creditNoteId} className="hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-bold text-amber-400">{cn.creditNoteNumber}</td>
                          <td className="p-3 font-mono text-slate-400">{cn.originalInvoiceNumber || cn.paymentId}</td>
                          <td className="p-3 text-slate-300">{cn.reason}</td>
                          <td className="p-3 text-right font-mono text-slate-300">₹{cn.taxableAmountReversed}</td>
                          <td className="p-3 text-right font-mono text-amber-300">₹{cn.gstReversed}</td>
                          <td className="p-3 text-right font-mono font-bold text-amber-400">₹{cn.totalReversed}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => { setSelectedDoc(cn); setDocType("credit_note"); }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3 h-3 text-indigo-400" />
                              View Credit Note
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: VENDOR EXPENSES */}
          {activeTab === "expenses" && (
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Vendor & Business Expenses</h3>
                  <p className="text-slate-400 text-xs">Recorded business operational costs and software hosting expenses.</p>
                </div>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" /> Add Expense
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                    <tr>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3 text-right">GST Input</th>
                      <th className="p-3 text-right">Total Amount</th>
                      <th className="p-3 text-center">Journal #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenses.map(exp => (
                      <tr key={exp.expenseId} className="hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-white">{exp.vendor}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{exp.description}</td>
                        <td className="p-3 text-slate-400">{exp.paymentMethod}</td>
                        <td className="p-3 text-right font-mono text-amber-300">₹{exp.gstAmount || 0}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">₹{exp.amount}</td>
                        <td className="p-3 text-center font-mono text-indigo-400 text-[11px]">{exp.journalId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  Immutable Financial Audit Trail
                </h3>
                <p className="text-slate-400 text-xs">Append-only audit log tracking all journal postings, reconciliation runs, and admin adjustments.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Reference Key</th>
                      <th className="p-3">Journal ID</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Performed By</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">{log.timestamp?.replace("T", " ").slice(0, 19)}</td>
                        <td className="p-3 font-semibold text-emerald-400">{log.action}</td>
                        <td className="p-3 font-mono text-slate-300">{log.reference}</td>
                        <td className="p-3 font-mono text-indigo-400">{log.journalId || "N/A"}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">₹{log.amount || 0}</td>
                        <td className="p-3 text-slate-300">{log.performedBy}</td>
                        <td className="p-3 text-slate-400 text-[11px]">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ACCOUNT LEDGER MODAL */}
      {selectedAccountId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Account Ledger: [{accountLedger?.account?.accountId}] {accountLedger?.account?.accountName}
                </h3>
                <p className="text-xs text-slate-400">Current Balance: ₹{accountLedger?.currentBalance || 0}</p>
              </div>
              <button onClick={() => setSelectedAccountId(null)} className="text-slate-400 hover:text-white p-2">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingLedger ? (
                <div className="text-center py-8 text-slate-400">Loading ledger lines...</div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Journal Ref</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Debit</th>
                      <th className="p-2.5 text-right">Credit</th>
                      <th className="p-2.5 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {accountLedger?.ledgerLines?.map((line: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">{line.transactionDate?.slice(0, 10)}</td>
                        <td className="p-2.5 font-mono text-indigo-400">{line.reference}</td>
                        <td className="p-2.5 text-white">{line.description}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-400">₹{line.debit}</td>
                        <td className="p-2.5 text-right font-mono text-amber-400">₹{line.credit}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-white">₹{line.runningBalance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> Record Business Expense
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={expenseForm.vendor}
                  onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                  placeholder="e.g. Google Cloud / Twilio / AWS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Software & Hosting">Software & Hosting (5030)</option>
                  <option value="Marketing Expense">Marketing & Ads (5020)</option>
                  <option value="Payment Gateway Charges">Payment Gateway Charges (5010)</option>
                  <option value="Professional Fees">Professional Fees (5040)</option>
                  <option value="Office & General Expense">Office & General Expense (5050)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. Monthly server hosting invoice"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Total Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="5000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">GST Input Credit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.gstAmount}
                    onChange={e => setExpenseForm({ ...expenseForm, gstAmount: e.target.value })}
                    placeholder="900"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2"
                >
                  {submittingExpense && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Post Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE REFUND MODAL */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-amber-400" /> Issue Refund & Credit Note
              </h3>
              <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleIssueRefund} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment ID *</label>
                <input
                  type="text"
                  required
                  value={refundForm.paymentId}
                  onChange={e => setRefundForm({ ...refundForm, paymentId: e.target.value })}
                  placeholder="e.g. pay_1723000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Refund Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refundForm.refundAmount}
                  onChange={e => setRefundForm({ ...refundForm, refundAmount: e.target.value })}
                  placeholder="588.82"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Reason for Refund</label>
                <input
                  type="text"
                  value={refundForm.reason}
                  onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })}
                  placeholder="e.g. Verified duplicate charge"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-2"
                >
                  {submittingRefund && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Process Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE TAX INVOICE / CREDIT NOTE MODAL */}
      {selectedDoc && docType && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                {docType === "invoice" ? `TAX INVOICE: ${selectedDoc.invoiceNumber}` : `CREDIT NOTE: ${selectedDoc.creditNoteNumber}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Document
                </button>
                <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-white px-2">✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-200 text-xs font-sans">
              {/* Header Seller Info */}
              <div className="flex justify-between border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">AIJOBS Technologies India Private Limited</h2>
                  <p className="text-slate-400">45 Cyber Tower, Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560103</p>
                  <p className="text-emerald-400 font-mono font-semibold">GSTIN: 29AAAAA0000A1Z5 | SAC: 998311</p>
                </div>
                <div className="text-right space-y-1 font-mono">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase">
                    {docType === "invoice" ? "TAX INVOICE" : "CREDIT NOTE"}
                  </h3>
                  <p className="text-white font-bold">{selectedDoc.invoiceNumber || selectedDoc.creditNoteNumber}</p>
                  <p className="text-slate-400 text-[11px]">{selectedDoc.invoiceDate || selectedDoc.createdAt?.slice(0, 10)}</p>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-semibold text-slate-400">Billed To (Buyer)</span>
                  <p className="font-bold text-white text-sm">{selectedDoc.userEmail || "Subscribed Agency / Recruiter"}</p>
                  <p className="text-slate-400">Role: {selectedDoc.role || "recruiter"}</p>
                </div>
                <div className="text-right space-y-1 font-mono text-[11px]">
                  <p className="text-slate-400">Payment ID: {selectedDoc.paymentId}</p>
                  <p className="text-slate-400">Place of Supply: Karnataka</p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">SAC Code</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">GST Rate</th>
                    <th className="p-3 text-right">GST Amount</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-3 font-medium text-white">{selectedDoc.planName || "AIJOBS Database Access Plan"}</td>
                    <td className="p-3 text-center font-mono">998311</td>
                    <td className="p-3 text-right font-mono">₹{selectedDoc.taxableAmount || selectedDoc.baseAmount || selectedDoc.taxableAmountReversed}</td>
                    <td className="p-3 text-right font-mono">18%</td>
                    <td className="p-3 text-right font-mono text-amber-300">₹{selectedDoc.gstAmount || selectedDoc.gstReversed}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{selectedDoc.totalAmount || selectedDoc.totalReversed}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tax Breakdown Summary */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>CGST (9%):</span>
                  <span>₹{selectedDoc.cgst || (selectedDoc.gstAmount ? selectedDoc.gstAmount / 2 : 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>SGST (9%):</span>
                  <span>₹{selectedDoc.sgst || (selectedDoc.gstAmount ? selectedDoc.gstAmount / 2 : 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>IGST (0%):</span>
                  <span>₹{selectedDoc.igst || 0}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white text-sm">
                  <span>Total Payable:</span>
                  <span className="text-emerald-400">₹{selectedDoc.totalAmount || selectedDoc.totalReversed}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center italic">
                This is a system-generated computer Tax Invoice / Credit Note issued by AIJOBS Technologies India Private Limited.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceAndAccountingModule;
