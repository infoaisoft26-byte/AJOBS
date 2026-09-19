import React from "react";
import {
  CircleAlert, CreditCard, Download, FileText, ReceiptIndianRupee, RefreshCw,
  ShieldCheck, UserRound, WalletCards
} from "lucide-react";

const fmt = (v: any) => {
  if (!v) return "—";
  if (typeof v?.toDate === "function") return v.toDate().toLocaleString("en-IN");
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const money = (v: any, currency = "INR") =>
  v == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(v) || 0);

const statusTone = (v: any) => {
  const s = String(v || "").toLowerCase();
  if (["approved", "verified", "active", "paid", "success", "accepted", "completed", "generated"].some(x => s.includes(x))) {
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  }
  if (["rejected", "failed", "expired", "suspended"].some(x => s.includes(x))) {
    return "bg-red-500/15 border-red-500/30 text-red-300";
  }
  return "bg-amber-500/15 border-amber-500/30 text-amber-300";
};

const Status = ({ children }: { children: any }) => (
  <span className={"inline-flex px-2.5 py-1 rounded-full border text-[10px] uppercase font-black tracking-wide " + statusTone(children)}>
    {children || "pending"}
  </span>
);

export default function RecruiterAccountCenter({
  data,
  loading,
  error,
  onRefresh
}: {
  data: any;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="p-10 rounded-3xl border border-purple-500/20 bg-[#17111F]/80 text-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3 text-cyan-400" />
        Loading your profile, KYC and billing records…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-3xl border border-red-500/30 bg-red-950/20">
        <div className="flex gap-3">
          <CircleAlert className="w-5 h-5 text-red-400" />
          <div>
            <div className="font-bold text-white">Could not load account details</div>
            <div className="text-xs text-red-200 mt-1">{error}</div>
            <button onClick={onRefresh} className="mt-3 px-3 py-2 rounded-xl bg-white/10 text-xs font-bold">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const p = data.profile || {};
  const k = data.kyc || {};
  const a = data.agreement;
  const pay = data.payment;
  const sub = data.subscription || {};
  const inv = data.invoice;
  const docs = k?.details?.documents || [];

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-r from-[#17111F] to-[#101729] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserRound className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-black text-white">Profile, KYC & Billing</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live account records from AIJOBS verification, agreement, payment, subscription and invoice systems.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Status>{k.status}</Status>
            <Status>{sub.status}</Status>
            <button onClick={onRefresh} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Summary icon={ShieldCheck} title="KYC" value={k.status || "Pending"} sub={k.approved ? "Identity verification approved" : data.onboarding?.currentStage || "Review pending"} />
        <Summary icon={FileText} title="Agreement" value={a?.status || "Pending"} sub={a?.acceptedAt ? "Accepted " + fmt(a.acceptedAt) : "Digital agreement status"} />
        <Summary icon={CreditCard} title="Payment" value={pay?.status || "Pending"} sub={pay?.paidAt ? "Paid " + fmt(pay.paidAt) : "Gateway verification status"} />
        <Summary icon={WalletCards} title="Current Plan" value={sub.name || "No active plan"} sub={sub.expiresAt ? "Valid until " + fmt(sub.expiresAt) : sub.status || "Inactive"} />
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <Card title="Recruiter Profile" icon={UserRound}>
          <Rows rows={[
            ["Name", p.name], ["Email", p.email], ["Phone", p.phone], ["Role", p.role], ["Company", p.companyName],
            ["Designation", p.designation], ["Location", [p.city, p.state].filter(Boolean).join(", ")],
            ["Account Status", p.accountStatus], ["Joined", fmt(p.createdAt)]
          ]} />
        </Card>

        <Card title="KYC & Verification" icon={ShieldCheck}>
          <Rows rows={[
            ["KYC Status", k.status], ["Submitted", fmt(k.submittedAt)], ["Reviewed", fmt(k.reviewedAt)],
            ["Reviewed By", k.reviewedBy], ["Risk Level", k?.details?.riskLevel],
            ["Rejection / Review Note", k?.details?.rejectionReason]
          ]} />
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-[11px] font-bold text-slate-300 mb-2">Verification Documents ({docs.length})</div>
            {docs.length === 0 ? (
              <div className="text-xs text-amber-300">No verification documents are visible in the canonical KYC record yet.</div>
            ) : (
              <div className="space-y-2">
                {docs.map((d: any, i: number) => (
                  <div key={d.id || i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-white/10">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{d.type || "Document " + (i + 1)}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {d.fileName || "Secure KYC file"} {d.uploadedAt ? "• " + fmt(d.uploadedAt) : ""}
                      </div>
                    </div>
                    {d.secureUrl && (
                      <a href={d.secureUrl} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Agreement Details" icon={FileText}>
          <Rows rows={[
            ["Agreement ID", a?.id], ["Agreement Number", a?.number], ["Status", a?.status],
            ["Generated", fmt(a?.generatedAt)], ["Accepted / Signed", fmt(a?.acceptedAt)],
            ["Accepted Name", a?.acceptedName], ["Plan", a?.planSummary?.planName]
          ]} />
          {a?.pdfUrl && (
            <a href={a.pdfUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex gap-2 items-center px-3 py-2 rounded-xl border border-purple-500/30 text-purple-300 text-xs font-bold">
              <Download className="w-3.5 h-3.5" />
              Download Agreement
            </a>
          )}
        </Card>

        <Card title="Payment & Invoice" icon={ReceiptIndianRupee}>
          <Rows rows={[
            ["Payment Status", pay?.status], ["Order ID", pay?.orderId], ["Transaction ID", pay?.transactionId],
            ["Gateway", pay?.gateway], ["Amount", pay ? money(pay.amount, pay.currency) : "—"],
            ["Paid At", fmt(pay?.paidAt)], ["Server Verified", pay?.verified ? "Yes" : "No"],
            ["Invoice No.", inv?.number || inv?.id], ["Invoice Status", inv?.status],
            ["Invoice Amount", inv ? money(inv.amount, inv.currency) : "—"], ["Issued", fmt(inv?.issuedAt)]
          ]} />
          {inv?.url && (
            <a href={inv.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex gap-2 items-center px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Download className="w-3.5 h-3.5" />
              Download Invoice
            </a>
          )}
        </Card>
      </div>

      <Card title="Plan Purchase / Subscription Details" icon={WalletCards}>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <Metric label="Plan" value={sub.name} />
          <Metric label="Status" value={sub.status} />
          <Metric label="Started" value={fmt(sub.startedAt)} />
          <Metric label="Expires" value={fmt(sub.expiresAt)} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Usage label="Candidate Views" used={sub.candidateViewsUsed} limit={sub.candidateViewsLimit} />
          <Usage label="Resume Downloads" used={sub.resumeDownloadsUsed} limit={sub.resumeDownloadsLimit} />
          <Usage label="Contact Unlocks" used={sub.contactUnlocksUsed} limit={sub.contactUnlocksLimit} />
          <Usage label="Job Posts" used={null} limit={sub.jobPostLimit} />
          <Usage label="Recruiter Seats" used={null} limit={sub.recruiterSeatLimit} />
        </div>
        <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-300">
          Existing paid plan details above are read directly from your subscription and payment records. New purchases must use AIJOBS secure checkout.
        </div>
      </Card>
    </div>
  );
}

function Summary({ icon: Icon, title, value, sub }: { icon: any; title: string; value: any; sub: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#17111F]/80 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><Icon className="w-4 h-4 text-cyan-400" />{title}</div>
      <div className="mt-2 text-sm font-black text-white break-words">{String(value || "—")}</div>
      <div className="text-[10px] text-slate-500 mt-1">{String(sub || "")}</div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: any }) {
  return (
    <div className="rounded-3xl border border-purple-500/20 bg-[#17111F]/75 p-5">
      <div className="flex items-center gap-2 mb-4"><Icon className="w-4 h-4 text-purple-400" /><h3 className="text-sm font-black text-white">{title}</h3></div>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: Array<[string, any]> }) {
  return (
    <div className="space-y-2">
      {rows.map(([l, v]) => (
        <div key={l} className="flex justify-between gap-4 py-2 border-b border-white/5 last:border-0 text-xs">
          <span className="text-slate-500">{l}</span>
          <span className="text-slate-200 text-right break-all">{v === null || v === undefined || v === "" ? "—" : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return <div className="rounded-xl bg-black/20 border border-white/10 p-3"><div className="text-[10px] text-slate-500 uppercase">{label}</div><div className="text-xs font-bold text-white mt-1">{String(value || "—")}</div></div>;
}

function Usage({ label, used, limit }: { label: string; used: any; limit: any }) {
  const hasLimit = limit !== null && limit !== undefined;
  return <div className="rounded-xl bg-black/20 border border-white/10 p-3"><div className="text-[10px] text-slate-500">{label}</div><div className="text-sm font-black text-white mt-1">{used !== null && used !== undefined ? used : "—"}{hasLimit ? " / " + limit : ""}</div></div>;
}
