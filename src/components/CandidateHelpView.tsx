import React, { useState } from "react";
import { HelpCircle, ShieldCheck, Mail, MessageSquare, ChevronDown, ChevronUp, CheckCircle, FileText, Search } from "lucide-react";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";

interface CandidateHelpViewProps {
  lang?: SupportedLanguage;
  onNavigateToJobs: () => void;
  onNavigateToResume: () => void;
}

export default function CandidateHelpView({ lang = "en", onNavigateToJobs, onNavigateToResume }: CandidateHelpViewProps) {
  const t = (key: string) => getTranslation(lang, key);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Does AIJobs charge candidates any money for job applications?",
      a: "No! AIJobs is 100% free for candidates. We NEVER charge candidates for job searching, resume uploads, skill assessments, or interviews. If anyone asks for money claiming to represent AIJobs, please report them immediately."
    },
    {
      q: "How do I search and apply for jobs?",
      a: "Go to the 'Find Jobs' tab from the menu. Enter your desired job title, key skills, or location in the search bar. Click 'Apply Now' on any job card. If your profile and resume are complete, your application will be submitted instantly."
    },
    {
      q: "How can I update or replace my resume?",
      a: "Go to the 'Resume' tab in the menu. Click 'Replace Resume' or 'Upload Resume' to upload your latest PDF/Word document. You can also preview or download your current resume anytime."
    },
    {
      q: "Where can I check my application status?",
      a: "Go to 'My Applications' in the menu. Every application displays a real-time status tracker (Applied → Under Review → Shortlisted → Interview → Selected/Joined)."
    },
    {
      q: "What should I do if an employer asks for processing fees?",
      a: "Do not pay any amount! Legitimate employers on AIJobs do not request money for interviews, job offers, or background verification. Report suspicious job listings through support."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("help")} & Support</h1>
            <p className="text-sm text-gray-500">Get quick answers and guidance on finding your next job on AIJobs.</p>
          </div>
        </div>

        {/* Safety Notice Banner */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-3 text-blue-900 text-sm">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">100% Free Candidate Safety Policy</span>
            <span>{t("safetyNotice")}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onNavigateToJobs}
          className="p-5 bg-white border border-gray-200 hover:border-blue-300 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer"
        >
          <Search className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-gray-900 text-base">{t("findJobs")}</h3>
          <p className="text-xs text-gray-500 mt-1">Browse verified active positions across technology, engineering, and remote roles.</p>
        </button>

        <button
          onClick={onNavigateToResume}
          className="p-5 bg-white border border-gray-200 hover:border-blue-300 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer"
        >
          <FileText className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-gray-900 text-base">Update Your {t("resume")}</h3>
          <p className="text-xs text-gray-500 mt-1">Upload your latest CV to improve job matching and employer visibility.</p>
        </button>
      </div>

      {/* FAQs */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <span>{t("faq")}</span>
        </h2>

        <div className="divide-y divide-gray-100 border-t border-gray-100 pt-2">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left py-2 font-semibold text-gray-800 text-sm hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {isOpen && (
                  <p className="text-xs text-gray-600 leading-relaxed mt-1 pl-1 pr-4">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Support Contact */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center space-y-3">
        <h3 className="font-bold text-gray-900 text-base">Still need assistance?</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">Our candidate support team is here to help you with job applications and profile guidance.</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="mailto:support@aijobs.app"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Mail className="w-4 h-4" />
            <span>Email Support</span>
          </a>
        </div>
      </div>
    </div>
  );
}
