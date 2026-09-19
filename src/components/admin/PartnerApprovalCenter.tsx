import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { AlertTriangle, BadgeCheck, BellRing, CheckCircle2, Clock3, CreditCard, FileCheck2, FileText, Mail, RefreshCw, Search, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { auth, db } from "../../firebase";
import { parseJsonResponse } from "../../utils/apiHelper";
import { normalizeRole } from "../../utils/roleUtils";

type AnyRow = Record<string, any> & { id?: string };

type PartnerRecord = {
  user: AnyRow;
  verification?: AnyRow;
  paymentOrder?: AnyRow;
  subscription?: AnyRow;
  invoice?: AnyRow;
  agreement?: AnyRow;
  latestMail?: AnyRow;
};

const toMs = (value: any) => {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const fmt = (value: any) => {
  if (!value) return "—";
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const statusClass = (status: string) => {
  const s = status.toLowerCase();
  if (["paid", "active", "approved", "verified", "success", "sent"].some(v => s.includes(v))) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (["rejected", "failed", "suspended", "expired"].some(v => s.includes(v))) return "bg-red-500/15 text-red-300 border-red-500/25";
  if (["pending", "review", "created", "processing", "resubmit"].some(v => s.includes(v))) return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  return "bg-slate-500/15 text-slate-300 border-slate-500/25";
};

const Pill = ({ label, value }: { label: string; value: any }) => (
  <div className="flex items-center gap-2 text-[11px]">
    <span className="text-slate-500">{label}</span>
    <span className={`px-2 py-0.5 rounded-full border font-semibold ${statusClass(String(value || "unknown"))}`}>
      {String(value || "unknown")}
    </span>
  </div>
);

export default function PartnerApprovalCenter({ adminUserId, adminUserName }: { adminUserId: string; adminUserName: string }) {
  const [users, setUsers] = useState<AnyRow[]>([]);
  const [verification, setVerification] = useState<AnyRow[]>([]);
  const [payments, setPayments] = useState<AnyRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<AnyRow[]>([]);
  const [invoices, setInvoices] = useState<AnyRow[]>([]);
  const [agreements, setAgreements] = useState<AnyRow[]>([]);
  const [mail, setMail] = useState<AnyRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"attention" | "all" | "approved">("attention");
  const [selected, setSelected] = useState<PartnerRecord | null>(null);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const collections: Array<[string, React.Dispatch<React.SetStateAction<AnyRow[]>>]> = [
      ["users", setUsers],
      ["verification_requests", setVerification],
      ["payment_orders", setPayments],
      ["subscriptions", setSubscriptions],
      ["invoices", setInvoices],
      ["agreements", setAgreements],
      ["mail", setMail],
    ];
    const unsubs = collections.map(([name, setter]) =>
      onSnapshot(collection(db, name), snap => setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => {
        console.warn(`[PartnerApprovalCenter] ${name} listener:`, err.message);
        setter([]);
      })
    );
    return () => unsubs.forEach(fn => fn());
  }, []);

  const partnerRows = useMemo<PartnerRecord[]>(() => {
    const partnerUsers = users.filter(u => ["recruiter", "consultancy", "employer"].includes(normalizeRole(u.role)));
    return partnerUsers.map(user => {
      const uid = user.uid || user.id;
      const byUser = (rows: AnyRow[]) => rows
        .filter(r => [r.userId, r.uid, r.ownerUid, r.recruiterId, r.consultancyId].includes(uid))
        .sort((a, b) => Math.max(toMs(b.updatedAt), toMs(b.createdAt), toMs(b.submittedAt), toMs(b.paidAt)) - Math.max(toMs(a.updatedAt), toMs(a.createdAt), toMs(a.submittedAt), toMs(a.paidAt)))[0];

      const latestMail = mail
        .filter(m => {
          const to = Array.isArray(m.to) ? m.to.join(" ") : String(m.to || "");
          return Boolean(user.email) && to.toLowerCase().includes(String(user.email).toLowerCase());
        })
        .sort((a, b) => Math.max(toMs(b.createdAt), toMs(b.updatedAt)) - Math.max(toMs(a.createdAt), toMs(a.updatedAt)))[0];

      return {
        user,
        verification: byUser(verification),
        paymentOrder: byUser(payments),
        subscription: byUser(subscriptions),
        invoice: byUser(invoices),
        agreement: byUser(agreements),
        latestMail,
      };
    }).sort((a, b) => {
      const at = Math.max(toMs(a.verification?.submittedAt), toMs(a.user.createdAt), toMs(a.paymentOrder?.createdAt));
      const bt = Math.max(toMs(b.verification?.submittedAt), toMs(b.user.createdAt), toMs(b.paymentOrder?.createdAt));
      return bt - at;
    });
  }, [users, verification, payments, subscriptions, invoices, agreements, mail]);

  const needsAttention = (row: PartnerRecord) => {
    const kyc = String(row.verification?.kycStatus || row.verification?.verificationStatus || row.user.kycStatus || "").toLowerCase();
    const payment = String(row.paymentOrder?.status || row.user.paymentStatus || "").toLowerCase();
    const subscription = String(row.subscription?.status || row.user.subscriptionStatus || "").toLowerCase();
    return !["verified", "approved", "active"].some(v => kyc === v) || !["paid", "success"].some(v => payment === v) || !["active"].includes(subscription);
  };

  const attentionCount = partnerRows.filter(needsAttention).length;

  useEffect(() => {
    if (!attentionCount) return;
    const key = `aijobs-admin-partner-alert-${new Date().toISOString().slice(0, 10)}`;
    if (!sessionStorage.getItem(key)) {
      setShowAlertPopup(true);
      sessionStorage.setItem(key, "1");
    }
  }, [attentionCount]);

  const filtered = partnerRows.filter(row => {
    const haystack = [row.user.name, row.user.companyName, row.user.agencyName, row.user.email, row.user.phone, row.user.uid, row.user.role].join(" ").toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (filter === "attention") return needsAttention(row);
    if (filter === "approved") return !needsAttention(row);
    return true;
  });

  const apiPost = async (url: string, body: any) => {
    const token = await auth.currentUser?.getIdToken(true);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Action failed.");
    return data;
  };

  const approveKyc = async (row: PartnerRecord) => {
    setWorking(true);
    try {
      await apiPost("/api/kyc/review-decision", {
        requestId: row.verification?.requestId || row.verification?.id,
        userId: row.user.uid || row.user.id,
        decision: "APPROVED",
        adminNotes: "Approved from Super Admin Partner Approval Center.",
        reviewedBy: adminUserName || adminUserId
      });
      setToast("KYC approved successfully.");
      setSelected(null);
    } catch (e: any) {
      setToast(e.message || "KYC approval failed.");
    } finally {
      setWorking(false);
      setTimeout(() => setToast(""), 4000);
    }
  };

  const approveSubscription = async (row: PartnerRecord) => {
    setWorking(true);
    try {
      await apiPost("/api/subscriptions/approve", {
        userId: row.user.uid || row.user.id,
        adminUserId
      });
      setToast("Subscription approved and access activation requested.");
      setSelected(null);
    } catch (e: any) {
      setToast(e.message || "Subscription approval failed.");
    } finally {
      setWorking(false);
      setTimeout(() => setToast(""), 4000);
    }
  };

  const fullyApprove = async (row: PartnerRecord) => {
    setWorking(true);
    try {
      const uid = row.user.uid || row.user.id;
      const kyc = String(row.verification?.kycStatus || row.user.kycStatus || "").toLowerCase();
      if (!["verified", "approved"].includes(kyc)) {
        await apiPost("/api/kyc/review-decision", {
          requestId: row.verification?.requestId || row.verification?.id,
          userId: uid,
          decision: "APPROVED",
          adminNotes: "Fully approved from Super Admin Partner Approval Center.",
          reviewedBy: adminUserName || adminUserId
        });
      }
      await apiPost("/api/subscriptions/approve", { userId: uid, adminUserId });
      setToast("Partner fully approved. KYC and subscription activation completed.");
      setSelected(null);
    } catch (e: any) {
      setToast(e.message || "Full approval failed.");
    } finally {
      setWorking(false);
      setTimeout(() => setToast(""), 4500);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-5 right-5 z-[100] max-w-md px-4 py-3 rounded-xl border border-indigo-500/30 bg-slate-950 text-white shadow-2xl text-sm">{toast}</div>}

      {showAlertPopup && attentionCount > 0 && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border border-amber-500/30 bg-[#0b1020] p-6 shadow-2xl">
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-amber-500/15 h-fit"><BellRing className="w-6 h-6 text-amber-300" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">Partner approvals need attention</h3>
                <p className="text-sm text-slate-400 mt-1">{attentionCount} recruiter / consultancy / employer account(s) have pending KYC, payment, document, or subscription steps.</p>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowAlertPopup(false)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Review now</button>
                  <button onClick={() => setShowAlertPopup(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 text-sm">Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">Partner Approval & Onboarding Command Center</h2>
              {attentionCount > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-bold">{attentionCount} need attention</span>}
            </div>
            <p className="text-xs text-slate-400 mt-1">Live recruiter, consultancy and employer onboarding status: KYC, documents, agreement, payment, subscription, invoice and email trail.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter("attention")} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${filter === "attention" ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-white/5 border-white/10 text-slate-300"}`}>Needs Attention</button>
            <button onClick={() => setFilter("all")} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${filter === "all" ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300"}`}>All Partners</button>
            <button onClick={() => setFilter("approved")} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${filter === "approved" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 text-slate-300"}`}>Approved</button>
          </div>
        </div>

        <div className="mt-4 relative max-w-lg">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recruiter, consultancy, email, company, UID..." className="w-full pl-9 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-indigo-500/50" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs text-slate-500">Total Partners</div><div className="text-2xl font-bold text-white mt-1">{partnerRows.length}</div></div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4"><div className="text-xs text-amber-300">Needs Attention</div><div className="text-2xl font-bold text-amber-200 mt-1">{attentionCount}</div></div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4"><div className="text-xs text-emerald-300">Fully Active</div><div className="text-2xl font-bold text-emerald-200 mt-1">{partnerRows.length - attentionCount}</div></div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4"><div className="text-xs text-indigo-300">Paid Orders</div><div className="text-2xl font-bold text-indigo-200 mt-1">{payments.filter(p => String(p.status || "").toLowerCase() === "paid").length}</div></div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-white/[0.04] border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">KYC / Documents</th>
                <th className="px-4 py-3">Agreement</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Invoice / Mail</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filtered.map(row => {
                const user = row.user;
                const lastActivity = Math.max(toMs(row.verification?.submittedAt), toMs(row.paymentOrder?.paidAt), toMs(row.paymentOrder?.updatedAt), toMs(row.subscription?.updatedAt), toMs(user.updatedAt), toMs(user.createdAt));
                return (
                  <tr key={user.uid || user.id} className="hover:bg-white/[0.025]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{user.name || user.companyName || user.agencyName || "Partner"}</div>
                      <div className="text-slate-400 mt-1">{user.email || "No email"}</div>
                      <div className="text-indigo-300 uppercase text-[10px] font-mono mt-1">{normalizeRole(user.role)} • {user.uid || user.id}</div>
                    </td>
                    <td className="px-4 py-4 space-y-1.5">
                      <Pill label="KYC" value={row.verification?.kycStatus || row.verification?.verificationStatus || user.kycStatus || "not submitted"} />
                      <Pill label="Docs" value={row.verification?.submittedDocuments?.length || row.verification?.documents?.length ? "submitted" : "pending"} />
                    </td>
                    <td className="px-4 py-4 space-y-1.5"><Pill label="Agreement" value={row.agreement?.status || user.agreementStatus || "pending"} /></td>
                    <td className="px-4 py-4 space-y-1.5">
                      <Pill label="Payment" value={row.paymentOrder?.status || user.paymentStatus || "pending"} />
                      <div className="text-[10px] text-slate-500">{row.paymentOrder?.paidAt ? `Paid ${fmt(row.paymentOrder.paidAt)}` : row.paymentOrder?.createdAt ? `Created ${fmt(row.paymentOrder.createdAt)}` : "No payment order"}</div>
                    </td>
                    <td className="px-4 py-4 space-y-1.5"><Pill label="Plan" value={row.subscription?.status || user.subscriptionStatus || "inactive"} /></td>
                    <td className="px-4 py-4 space-y-1.5">
                      <Pill label="Invoice" value={row.invoice ? "generated" : "pending"} />
                      <Pill label="Mail" value={row.latestMail?.status || row.latestMail?.deliveryStatus || (row.latestMail ? "queued" : "not sent")} />
                    </td>
                    <td className="px-4 py-4 text-slate-400">{lastActivity ? fmt(lastActivity) : "—"}</td>
                    <td className="px-4 py-4 text-right"><button onClick={() => setSelected(row)} className="px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-200 hover:text-white font-semibold">Inspect & Approve</button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No partner records match the current filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#090e1a] shadow-2xl">
            <div className="sticky top-0 bg-[#090e1a] border-b border-white/10 p-5 flex items-start justify-between z-10">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.user.name || selected.user.companyName || selected.user.agencyName || "Partner"} — Full Onboarding Audit</h3>
                <p className="text-xs text-slate-400 mt-1">{selected.user.email} • {normalizeRole(selected.user.role)} • {selected.user.uid || selected.user.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-4">
              <AuditCard icon={ShieldCheck} title="KYC & Documents" rows={[
                ["KYC Status", selected.verification?.kycStatus || selected.verification?.verificationStatus || selected.user.kycStatus || "Not submitted"],
                ["Risk", selected.verification?.riskLevel || "—"],
                ["Submitted", fmt(selected.verification?.submittedAt || selected.verification?.createdAt)],
                ["Reviewed", fmt(selected.verification?.reviewedAt)],
                ["Documents", String(selected.verification?.submittedDocuments?.length || selected.verification?.documents?.length || 0)]
              ]} />
              <AuditCard icon={FileText} title="Agreement" rows={[
                ["Status", selected.agreement?.status || selected.user.agreementStatus || "Pending"],
                ["Agreement ID", selected.agreement?.agreementId || selected.agreement?.id || selected.user.agreementId || "—"],
                ["Accepted", fmt(selected.agreement?.acceptedAt)],
                ["Plan", selected.agreement?.planSummary?.planName || selected.user.activePlanId || "—"]
              ]} />
              <AuditCard icon={CreditCard} title="Payment & Subscription" rows={[
                ["Payment", selected.paymentOrder?.status || selected.user.paymentStatus || "Pending"],
                ["Order", selected.paymentOrder?.orderId || selected.paymentOrder?.id || "—"],
                ["Amount", selected.paymentOrder?.amount ? `₹${selected.paymentOrder.amount}` : "—"],
                ["Paid At", fmt(selected.paymentOrder?.paidAt)],
                ["Subscription", selected.subscription?.status || selected.user.subscriptionStatus || "Inactive"],
                ["Expires", fmt(selected.subscription?.expiresAt)]
              ]} />
              <AuditCard icon={Mail} title="Invoice & Mail Trail" rows={[
                ["Invoice", selected.invoice ? "Generated" : "Pending"],
                ["Invoice No.", selected.invoice?.invoiceNumber || selected.invoice?.id || "—"],
                ["Invoice Date", fmt(selected.invoice?.createdAt || selected.invoice?.issuedAt)],
                ["Latest Mail", selected.latestMail?.message?.subject || selected.latestMail?.subject || "—"],
                ["Mail Status", selected.latestMail?.status || selected.latestMail?.deliveryStatus || (selected.latestMail ? "Queued" : "Not sent")],
                ["Mail Date", fmt(selected.latestMail?.createdAt || selected.latestMail?.updatedAt)]
              ]} />
            </div>

            <div className="p-5 border-t border-white/10 flex flex-wrap gap-2 justify-end">
              <button disabled={working} onClick={() => approveKyc(selected)} className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-200 font-semibold disabled:opacity-50">Approve KYC</button>
              <button disabled={working} onClick={() => approveSubscription(selected)} className="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 font-semibold disabled:opacity-50">Activate Plan</button>
              <button disabled={working} onClick={() => fullyApprove(selected)} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50">{working ? "Processing..." : "Approve All & Activate"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditCard({ icon: Icon, title, rows }: { icon: any; title: string; rows: Array<[string, any]> }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-indigo-400" /><h4 className="text-sm font-bold text-white">{title}</h4></div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-xs border-b border-white/5 pb-2 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="text-slate-200 text-right break-all">{String(value ?? "—")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
