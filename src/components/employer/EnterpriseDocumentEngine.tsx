import { useState, useEffect } from "react";
import { 
  FileText, Download, Printer, Award, FileCheck, Bookmark, Briefcase, Calendar, 
  User, DollarSign, PenTool, CheckSquare, Sparkles 
} from "lucide-react";
import { motion } from "motion/react";

interface EnterpriseDocumentEngineProps {
  companyName: string;
}

type LetterType = "Offer Letter" | "Appointment Letter" | "Experience Letter" | "Joining Letter" | "Job Description" | "Email Template";

export default function EnterpriseDocumentEngine({ companyName }: EnterpriseDocumentEngineProps) {
  const [letterType, setLetterType] = useState<LetterType>("Offer Letter");
  
  // Custom letter parameters
  const [candidateName, setCandidateName] = useState("Aryan Sharma");
  const [jobTitle, setJobTitle] = useState("Senior Frontend Engineer");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [ctcPackage, setCtcPackage] = useState("₹18,50,000 PA");
  const [signatoryName, setSignatoryName] = useState("Ananya Rao");
  const [signatoryTitle, setSignatoryTitle] = useState("Chief Sourcing Officer");
  const [includeEmblem, setIncludeEmblem] = useState(true);
  const [includeSeal, setIncludeSeal] = useState(true);

  // Experience letter specific parameters
  const [relievingDate, setRelievingDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [conductRating, setConductRating] = useState("Exceptional");

  // AI automation parameters
  const [aiGeneratedText, setAiGeneratedText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState("");

  useEffect(() => {
    setAiGeneratedText(null);
  }, [letterType]);

  const handleAiGenerate = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-document-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: letterType,
          candidateName,
          position: jobTitle,
          companyName,
          salary: ctcPackage,
          signatoryName,
          signatoryTitle,
          extraInstructions: extraInstructions || "Make it highly professional and custom tailored."
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiGeneratedText(data.content);
      } else {
        console.error("AI Generation failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Dynamically generate the official text content based on parameters
  const generateDocumentText = () => {
    const formattedDate = new Date(effectiveDate).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    });
    
    const formattedRelievingDate = new Date(relievingDate).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    });

    switch (letterType) {
      case "Offer Letter":
        return `Date: ${formattedDate}
Ref: EXP/OFF/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}

TO,
MR./MS. ${candidateName.toUpperCase()}
Email: candidate@aijobs.io

SUB: LETTER OF OFFER FOR EMPLOYMENT

Dear ${candidateName},

Following our extensive technical assessments, system simulation rounds, and panel reviews, we are absolutely delighted to offer you employment with ${companyName.toUpperCase()} as a "${jobTitle.toUpperCase()}".

We believe that your skills, architecture foundations, and innovative drive will be highly instrumental in expanding our cloud engineering platforms.

TERMS & PROVISIONS OF SERVICE:
1. DESIGNATION & DIVISION: You shall join us as ${jobTitle} based out of our Bangalore Tech Core.
2. ANNUAL CTC: Your total gross salary package is structured at ${ctcPackage}, subject to necessary statutory deductions and taxes.
3. COMMENCEMENT: Your targeted date of joining shall be on or before ${formattedDate}.
4. LEAVE & HEALTH COMPLIANCES: You will be entitled to 24 paid leaves per fiscal year, alongside complete family medical care up to ₹8,00,000 coverage.

Please sign this letter as a token of acceptance and return a soft-copy to our HR division.

For ${companyName},

__________________________
Authorized Signatory,
${signatoryName}
${signatoryTitle}`;

      case "Appointment Letter":
        return `Date: ${formattedDate}
Ref: APPT/EMP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}

TO,
MR./MS. ${candidateName.toUpperCase()}
Resident Address: Tech Towers, Sec 4, Bangalore

SUB: FORMAL APPOINTMENT AS ${jobTitle.toUpperCase()}

Dear ${candidateName},

We are pleased to formally appoint you as "${jobTitle}" with ${companyName} effective from your actual Joining Date of ${formattedDate}.

This appointment is governed by the following core covenants of the enterprise:
- PROBATION PERIOD: You will be on probation for a period of six (6) months from the date of joining. Upon successful assessment of key milestones, your services will be confirmed in writing.
- CODE OF CONDUCT: You are expected to adhere strictly to our data safety, source code security, and internal compliance metrics. Any breach of corporate IP constitutes ground for immediate termination.
- NON-DISCLOSURE: You shall not during your tenure or thereafter, disclose any proprietary algorithm, prompt architectures, or secure customer telemetry.

Please confirm your acceptance of these terms by returning the signed duplicate copy.

For ${companyName},

__________________________
Authorized Signatory,
${signatoryName}
${signatoryTitle}`;

      case "Experience Letter":
        return `Date: ${formattedDate}
Ref: CERT/EXP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}

TO WHOMSOEVER IT MAY CONCERN

This is to certify that Mr./Ms. ${candidateName} was employed with ${companyName} from ${formattedDate} to ${formattedRelievingDate}.

During his/her tenure, he/she discharged his/her duties with exceptional caliber as a "${jobTitle}". His/her core technical accomplishments centered on platform scaling, database optimizations, and cross-team interface coordinate loops.

His/her overall character, conduct, and professional integrity during employment were rated as "${conductRating}".

We appreciate his/her valuable contributions and wish him/her immense success in all future professional endeavors.

For ${companyName},

__________________________
Authorized Signatory,
${signatoryName}
${signatoryTitle}`;

      case "Joining Letter":
        return `Date: ${formattedDate}
Ref: JOIN/EMP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}

TO,
The Executive Management Board,
${companyName}

SUB: FORMAL JOINING REPORT - ${candidateName.toUpperCase()}

Respected Sir/Ma'am,

I, ${candidateName}, hereby formally report for duty and join the services of ${companyName} today, ${formattedDate} (forenoon/afternoon), as "${jobTitle}" in accordance with the terms laid out in my Appointment Letter.

I have completed all statutory pre-onboarding checks, verified my identity credentials, and submitted original academic clearances and relief certifications from my previous employers.

I undertake to perform my duties to the best of my professional abilities and uphold the core tech values of the enterprise.

Submitted for official records.

Sincerely yours,

__________________________
Candidate Signature,
${candidateName}
Designation: ${jobTitle}`;

      case "Job Description":
        return `JOB TITLE: ${jobTitle.toUpperCase()}
COMPANY: ${companyName.toUpperCase()}
LOCATION: Bangalore, India (Hybrid)
TYPE: Full-time Employment

ABOUT US:
We are a premier, high-growth technology enterprise scaling our core developer workspace solutions. We foster an inclusive, innovation-first engineering culture.

CORE RESPONSIBILITIES:
- Design, build, and optimize critical state engines, React frontends, and backend microservices.
- Lead security audits, performance hardening, and bundle size reduction workflows.
- Partner with product leads to deliver polished user interfaces.

REQUIREMENTS:
- 3+ years experience with modern TypeScript, React, and server-side state integrations.
- Excellent system orchestration foundations.
- Strong communication and collaboration skills.

COMPENSATION & BENEFIT ROADMAPS:
- Gross Annual CTC: ${ctcPackage}
- Standard comprehensive health coverage for you and your family.`;

      case "Email Template":
        return `Subject: Interview Confirmation Cycle - ${jobTitle} at ${companyName}

Dear ${candidateName},

Thank you for your interest in joining ${companyName}. We have reviewed your resume matches and tech assessment telemetry.

We are delighted to confirm that you have been shortlisted for our panel review and system simulation rounds.

PROPOSED DETAILS:
- Position: ${jobTitle}
- CTC Range: ${ctcPackage}
- Interview Date: ${formattedDate}

Please reply to confirm your availability.

Best regards,
${signatoryName}
${signatoryTitle}
${companyName}`;
    }
  };

  const handlePrint = () => {
    // Triggers a native document print loop
    window.print();
  };

  return (
    <div className="space-y-6 text-xs text-white" id="document-generator-suite">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <span>Enterprise Corporate Document Generator</span>
          </h3>
          <p className="text-[10px] text-gray-400">
            Generate and export beautiful letterheads, employment certifications, joining, and appointment templates directly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Document Selector & Form Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-[10px] font-bold text-white uppercase font-mono tracking-wider">Document Template Configuration</h4>
            
            {/* Template selector buttons */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "Offer Letter", label: "Offer Letter", icon: FileText },
                { type: "Appointment Letter", label: "Appointment Letter", icon: FileCheck },
                { type: "Experience Letter", label: "Experience Letter", icon: Bookmark },
                { type: "Joining Letter", label: "Joining Letter", icon: Briefcase },
                { type: "Job Description", label: "Job Description", icon: Award },
                { type: "Email Template", label: "Email Template", icon: Sparkles }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setLetterType(item.type as LetterType)}
                  className={`p-2.5 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    letterType === item.type 
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10" 
                      : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Input controls */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-gray-400 block font-mono">Candidate Name *</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block font-mono">Position / Job Title *</label>
                <div className="relative">
                  <Briefcase className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Effective Date *</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                  />
                </div>

                {letterType === "Offer Letter" || letterType === "Appointment Letter" || letterType === "Job Description" || letterType === "Email Template" ? (
                  <div className="space-y-1">
                    <label className="text-gray-400 block font-mono">Gross CTC Package</label>
                    <input
                      type="text"
                      value={ctcPackage}
                      onChange={e => setCtcPackage(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                  </div>
                ) : letterType === "Experience Letter" ? (
                  <div className="space-y-1">
                    <label className="text-gray-400 block font-mono">Relieving Date</label>
                    <input
                      type="date"
                      value={relievingDate}
                      onChange={e => setRelievingDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                    />
                  </div>
                ) : null}
              </div>

              {letterType === "Experience Letter" && (
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Conduct Performance Rating</label>
                  <select
                    value={conductRating}
                    onChange={e => setConductRating(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                  >
                    <option value="Exceptional">Exceptional (Highly Recommended)</option>
                    <option value="Very Good">Very Good / Satisfactory</option>
                    <option value="Excellent">Excellent</option>
                  </select>
                </div>
              )}

              <div className="border-t border-white/5 pt-3.5 space-y-3">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Signatory Name</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={e => setSignatoryName(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Signatory Title</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={e => setSignatoryTitle(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              {/* Graphical Toggles */}
              <div className="border-t border-white/5 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono">Include Golden Letterhead Emblem</span>
                  <input
                    type="checkbox"
                    checked={includeEmblem}
                    onChange={e => setIncludeEmblem(e.target.checked)}
                    className="accent-indigo-500 cursor-pointer h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono">Include Virtual Official Corporate Seal</span>
                  <input
                    type="checkbox"
                    checked={includeSeal}
                    onChange={e => setIncludeSeal(e.target.checked)}
                    className="accent-indigo-500 cursor-pointer h-4 w-4"
                  />
                </div>
              </div>

              {/* Gemini AI Powered Generator Block */}
              <div className="border-t border-white/5 pt-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>Gemini AI Auto-Composer</span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">AI Drafting Prompt / Rules</label>
                  <textarea
                    value={extraInstructions}
                    onChange={e => setExtraInstructions(e.target.value)}
                    rows={3}
                    placeholder="e.g. Write an exciting offer letter emphasizing our team's AI-first milestones and immediate impact goals..."
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 text-[10px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>{aiLoading ? "Generating AI Draft..." : `Generate AI ${letterType}`}</span>
                </button>

                {aiGeneratedText && (
                  <button
                    type="button"
                    onClick={() => setAiGeneratedText(null)}
                    className="w-full py-1 text-[10px] text-gray-500 hover:text-white transition-all cursor-pointer text-center block font-mono"
                  >
                    ← Reset to Standard template
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Dynamic Letterhead Live Canvas (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="glass p-6 rounded-3xl border border-white/5 flex-1 flex flex-col bg-neutral-950/25">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <span className="text-[10px] font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Letterhead Live Preview</span>
              </span>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>

            {/* Letterhead Body */}
            <div 
              className="flex-1 p-8 bg-white text-neutral-900 rounded-2xl relative font-serif text-[11px] leading-relaxed select-text shadow-2xl border border-gray-100 max-h-[480px] overflow-y-auto whitespace-pre-line"
              id="printable-letterhead-canvas"
            >
              {/* Golden Emblem header block */}
              {includeEmblem && (
                <div className="border-b-2 border-indigo-900 pb-4 mb-6 flex justify-between items-center text-left">
                  <div>
                    <h2 className="font-extrabold font-sans text-base tracking-widest text-indigo-950 uppercase m-0 leading-none">
                      {companyName}
                    </h2>
                    <p className="text-[9px] font-sans text-indigo-700 uppercase font-bold tracking-wider mt-1.5">
                      Enterprise Solutions & Cloud Talent Registry Services
                    </p>
                  </div>
                  <div className="text-right font-sans text-[8px] text-gray-500 leading-normal">
                    <p>HQ: Tech Park, Ring Rd, Bangalore</p>
                    <p>GSTIN: 29AAFCA8140E1ZS • contact@aijobs.io</p>
                  </div>
                </div>
              )}

              {/* Main Content text stream */}
              <div className="text-neutral-800 tracking-wide font-medium whitespace-pre-line">
                {aiGeneratedText || generateDocumentText()}
              </div>

              {/* Official Seal and Sign block */}
              {includeSeal && (
                <div className="mt-8 flex justify-between items-end pt-4 font-sans text-[8px] uppercase font-bold text-gray-400">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-indigo-700/30 flex items-center justify-center text-center text-indigo-700/40 text-[7px] font-extrabold border-dashed transform -rotate-12 absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none select-none">
                      SECURED & VERIFIED AIJOBS
                    </div>
                    <p className="text-[7px]">Pre-Onboard cleared</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[9px] text-indigo-600 italic font-black mb-1 select-none pointer-events-none">
                      {signatoryName}
                    </div>
                    <p className="border-t border-gray-300 pt-1">Authorized Seal</p>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
