import { useState } from "react";
import { 
  TrendingUp, FileSpreadsheet, Download, FileText, BarChart3, 
  ChevronRight, Sparkles, Building, Users, Printer 
} from "lucide-react";
import { PlacementModel, ClientModel, ConsultancyJobModel } from "./CrmTypes";

interface CrmReportsViewProps {
  placements: PlacementModel[];
  clients: ClientModel[];
  jobs: ConsultancyJobModel[];
}

export default function CrmReportsView({
  placements,
  clients,
  jobs
}: CrmReportsViewProps) {
  const [selectedReport, setSelectedReport] = useState<"revenue" | "client" | "recruiter">("revenue");

  // Calculations
  const totalRevenue = placements.reduce((sum, p) => p.invoiceStatus === "paid" ? sum + p.revenue : sum, 0);
  const projectedRevenue = placements.reduce((sum, p) => sum + p.revenue, 0);

  // Client Performance Metrics
  const clientPerf = clients.map(cl => {
    const clientPlacements = placements.filter(p => p.clientName === cl.companyName);
    const clientJobs = jobs.filter(j => j.companyName === cl.companyName);
    const billing = clientPlacements.reduce((sum, p) => sum + p.revenue, 0);
    return {
      companyName: cl.companyName,
      jobsCount: clientJobs.length,
      placementsCount: clientPlacements.length,
      billing
    };
  }).sort((a, b) => b.billing - a.billing);

  // Recruiter metrics
  const recruiterStats = [
    { name: "Amit Roy", placements: 2, totalBilling: 616420 },
    { name: "Kunal Sen", placements: 1, totalBilling: 383180 },
    { name: "Preeti Nair", placements: 0, totalBilling: 0 }
  ];

  // Excel CSV Exporter logic (creates actual browser file download!)
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (selectedReport === "revenue") {
      csvContent += "Placement ID,Candidate Name,Client Company,Job Title,Placed Date,Invoice CTC,Margin Fee %,Consultancy Margin Revenue,Billing Status\r\n";
      placements.forEach(p => {
        csvContent += `"${p.id}","${p.candidateName}","${p.clientName}","${p.jobTitle}","${p.date}",${p.salary},${p.feePercent},${p.revenue},"${p.invoiceStatus}"\r\n`;
      });
    } else if (selectedReport === "client") {
      csvContent += "Client Company,Active Vacancies,Hired Count,Aggregate Billed Revenue\r\n";
      clientPerf.forEach(c => {
        csvContent += `"${c.companyName}",${c.jobsCount},${c.placementsCount},${c.billing}\r\n`;
      });
    } else {
      csvContent += "Lead Recruiter,Placements Completed,Total Recruited Fee Revenue\r\n";
      recruiterStats.forEach(r => {
        csvContent += `"${r.name}",${r.placements},${r.totalBilling}\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_${selectedReport}_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("Excel-compatible CSV generated and downloaded successfully!");
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-reports-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <span>Consultancy Analytics & Reports Hub</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Audit operational placement indices, monthly revenue curves, and team output ratios.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 rounded-xl transition-all cursor-pointer border border-white/5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/15"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Report Nav Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        <button
          onClick={() => setSelectedReport("revenue")}
          className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            selectedReport === "revenue" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-gray-400 hover:text-white"
          }`}
        >
          Billing & Placements
        </button>
        <button
          onClick={() => setSelectedReport("client")}
          className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            selectedReport === "client" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-gray-400 hover:text-white"
          }`}
        >
          Client Margin Contribution
        </button>
        <button
          onClick={() => setSelectedReport("recruiter")}
          className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            selectedReport === "recruiter" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-gray-400 hover:text-white"
          }`}
        >
          Recruiter Placements Speed
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Metric tables */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center text-xs">
              <span className="font-mono uppercase font-extrabold text-white">Active Report Worksheet</span>
              <span className="text-[10px] text-gray-400 font-mono">Simulated Real-Time Calculations</span>
            </div>

            <div className="p-2">
              {selectedReport === "revenue" && (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-400 font-mono text-[10px] uppercase border-b border-white/5">
                        <th className="p-3">Candidate</th>
                        <th className="p-3">Client Company</th>
                        <th className="p-3">Placing CTC</th>
                        <th className="p-3 text-right">Acquired Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-200">
                      {placements.map(p => (
                        <tr key={p.id} className="hover:bg-white/5 transition-all">
                          <td className="p-3 font-bold">{p.candidateName}</td>
                          <td className="p-3 text-gray-400">{p.clientName}</td>
                          <td className="p-3 font-mono">₹{(p.salary / 100000).toFixed(1)}L</td>
                          <td className="p-3 text-right font-bold text-emerald-400 font-mono">₹{p.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReport === "client" && (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-400 font-mono text-[10px] uppercase border-b border-white/5">
                        <th className="p-3">Client Partner</th>
                        <th className="p-3 text-center">Reqs Vacancies</th>
                        <th className="p-3 text-center">Placed Hires</th>
                        <th className="p-3 text-right">Commission Billing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-200">
                      {clientPerf.map((c, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-all">
                          <td className="p-3 font-bold">{c.companyName}</td>
                          <td className="p-3 text-center font-mono text-indigo-400 font-bold">{c.jobsCount}</td>
                          <td className="p-3 text-center font-mono text-purple-400 font-bold">{c.placementsCount}</td>
                          <td className="p-3 text-right font-bold text-emerald-400 font-mono">₹{c.billing.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReport === "recruiter" && (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-400 font-mono text-[10px] uppercase border-b border-white/5">
                        <th className="p-3">Staff Recruiter</th>
                        <th className="p-3 text-center">Hired Placements</th>
                        <th className="p-3 text-right">Total Aggregate Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-200">
                      {recruiterStats.map((r, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-all">
                          <td className="p-3 font-bold">{r.name}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-400">{r.placements}</td>
                          <td className="p-3 text-right font-bold text-emerald-400 font-mono">₹{r.totalBilling.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Summary Totals */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-bold text-xs text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span>KPI Summary Cards</span>
            </h4>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-400 text-[11px]">Realized Revenue (Invoices Paid)</span>
                <p className="text-2xl font-black text-emerald-400 font-mono">₹{totalRevenue.toLocaleString()}</p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-400 text-[11px]">Projected Invoiced Revenue</span>
                <p className="text-2xl font-black text-indigo-400 font-mono">₹{projectedRevenue.toLocaleString()}</p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-400 text-[11px]">Outstanding Client Debts</span>
                <p className="text-2xl font-black text-amber-400 font-mono">₹{(projectedRevenue - totalRevenue).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
