import React, { useState } from "react";
import { FileCheck, Download, Printer, Copy, Sparkles, Building, User, Calendar, DollarSign, CheckSquare, RefreshCw } from "lucide-react";
import { useGlobalMarketplace } from "../context/GlobalMarketplaceContext";

export default function DocumentAutomation() {
  const { formatCurrency } = useGlobalMarketplace();
  const [docType, setDocType] = useState<"offer" | "appointment" | "internship" | "experience" | "checklist">("offer");
  const [candidateName, setCandidateName] = useState("Alexander Wright");
  const [roleTitle, setRoleTitle] = useState("Senior Full-Stack Engineer");
  const [companyName, setCompanyName] = useState("Acme Enterprise AI Systems");
  const [ctcAmountUSD, setCtcAmountUSD] = useState(120000);
  const [joiningDate, setJoiningDate] = useState("2026-08-15");
  const [location, setLocation] = useState("San Francisco, CA (Hybrid)");
  const [generatedDocumentText, setGeneratedDocumentText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerateDocument = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/document-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          candidateName,
          roleTitle,
          companyName,
          ctcAmountUSD,
          formattedCtc: formatCurrency(ctcAmountUSD),
          joiningDate,
          location,
        }),
      });

      const data = await response.json();
      if (data.success && data.documentText) {
        setGeneratedDocumentText(data.documentText);
      } else {
        setGeneratedDocumentText(getFallbackDocumentText(docType));
      }
    } catch (err) {
      console.error("Document automation error:", err);
      setGeneratedDocumentText(getFallbackDocumentText(docType));
    } finally {
      setIsGenerating(false);
    }
  };

  const getFallbackDocumentText = (type: string) => {
    const formattedSalary = formatCurrency(ctcAmountUSD);

    switch (type) {
      case "offer":
        return `OFFER OF EMPLOYMENT
Date: ${new Date().toISOString().split("T")[0]}

To: ${candidateName}
Position: ${roleTitle}
Company: ${companyName}

Dear ${candidateName},

We are pleased to offer you the position of ${roleTitle} at ${companyName}. 

OFFER DETAILS:
• Base Annual Compensation: ${formattedSalary}
• Joining Date: ${joiningDate}
• Work Location: ${location}
• Reporting Manager: Director of Engineering

BENEFITS & PERKS:
• Comprehensive Health & Dental Insurance
• Annual Performance Bonus
• Remote Work Equipment Allowance

Please sign and return a copy of this letter by ${joiningDate} to confirm your acceptance.

Sincerely,
HR Director, ${companyName}`;

      case "appointment":
        return `FORMAL APPOINTMENT LETTER
Ref: ${companyName}/HR/${Date.now().toString().substring(6)}

Dear ${candidateName},

Sub: Formal Appointment as ${roleTitle}

Further to your acceptance of our offer letter, we take pleasure in appointing you as ${roleTitle} at ${companyName} with effect from ${joiningDate}.

TERMS AND CONDITIONS:
1. Compensation: Annual total compensation package of ${formattedSalary}.
2. Probation Period: 3 Months from joining date.
3. Code of Conduct & IP: You shall adhere to all enterprise compliance standards and data confidentiality policies.

Welcome to ${companyName}!

HR Lead
${companyName}`;

      case "internship":
        return `INTERNSHIP OFFER LETTER
Date: ${new Date().toISOString().split("T")[0]}

Dear ${candidateName},

We are pleased to offer you an AI Engineering Internship at ${companyName} starting from ${joiningDate}.

STIPEND & TERMS:
• Monthly Stipend: ${formatCurrency(ctcAmountUSD / 12)}
• Duration: 6 Months
• Mentorship: Direct 1-on-1 pairing with Senior Staff Engineers

Congratulations!

HR Team, ${companyName}`;

      case "experience":
        return `TO WHOM IT MAY CONCERN
EXPERIENCE & RELIEVING CERTIFICATE

This is to certify that ${candidateName} was employed with ${companyName} as ${roleTitle} from 2024-01-15 to ${new Date().toISOString().split("T")[0]}.

During their tenure, ${candidateName} displayed outstanding technical execution, leadership, and professional integrity. We wish them success in their future endeavors.

HR Department
${companyName}`;

      case "checklist":
        return `NEW JOINER ONBOARDING CHECKLIST
Candidate: ${candidateName} | Role: ${roleTitle} | Start: ${joiningDate}

DOCUMENTATION & COMPLIANCE:
[ ] Signed Offer & Appointment Letter
[ ] Government ID & Tax Documentation
[ ] Educational & Relieving Certificates

IT & INFRASTRUCTURE:
[ ] Enterprise Email & SSO Account Creation
[ ] Developer Laptop & Hardware Provisioning
[ ] GitHub & Cloud Access Grants

HR ORIENTATION:
[ ] Welcome Call with Hiring Manager
[ ] Benefits Enrollment & Policy Walkthrough`;

      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-black border border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold mb-3">
              <FileCheck className="w-3.5 h-3.5" />
              <span>AUTOMATED HR DOCUMENT ENGINE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Automated Legal & HR Document Generation</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              Instantly compile Offer Letters, Appointment Letters, Experience Certificates, and Joining Checklists with localized currency formatting.
            </p>
          </div>

          <button
            onClick={handleGenerateDocument}
            disabled={isGenerating}
            className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>Generate Document</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Variables Form */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-white/10 pb-3">
            Document Template & Variables
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-400 font-mono mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="offer">📄 Offer Letter</option>
                <option value="appointment">📜 Formal Appointment Letter</option>
                <option value="internship">🎓 Internship Letter</option>
                <option value="experience">💼 Experience Certificate</option>
                <option value="checklist">✅ Joining Checklist</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1">Candidate Full Name</label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1">Role Title</label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1">Annual CTC (USD Base)</label>
              <input
                type="number"
                value={ctcAmountUSD}
                onChange={(e) => setCtcAmountUSD(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Live Document Preview */}
        <div className="lg:col-span-2 bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Document Preview
            </h3>

            {generatedDocumentText && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigator.clipboard.writeText(generatedDocumentText)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-200 rounded-lg text-xs font-mono flex items-center space-x-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono flex items-center space-x-1 cursor-pointer shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Export PDF</span>
                </button>
              </div>
            )}
          </div>

          {generatedDocumentText ? (
            <div className="bg-black/80 border border-white/10 rounded-xl p-6 font-mono text-xs text-gray-200 whitespace-pre-wrap leading-relaxed shadow-inner">
              {generatedDocumentText}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-gray-500 font-mono">
              Click 'Generate Document' to auto-populate the customized template.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
