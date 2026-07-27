import { X, ShieldCheck, FileText, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export type LegalDocType = "privacy" | "terms" | "refund" | "cancellation" | "cookie" | "disclaimer";

interface LegalModalProps {
  docType: LegalDocType;
  onClose: () => void;
}

export default function LegalModal({ docType, onClose }: LegalModalProps) {
  const companyName = "The Flex Force Services";
  const platformName = "AIJOBS";
  const establishedYear = "2024";
  const website = "www.aijobs.in";
  const supportEmail = "infoaisoft26@gmail.com";

  const renderContent = () => {
    switch (docType) {
      case "privacy":
        return (
          <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Privacy Policy – AIJobs</span>
            </div>
            <p><strong>Operated by: The Flex Force Services | Last Updated: July 2026</strong></p>
            <p>
              Welcome to AIJobs, an AI-powered job search and recruitment platform operated by <strong>The Flex Force Services</strong>.
              This Privacy Policy explains how AIJobs collects, uses, stores, shares, and protects the personal information of candidates, recruiters, employers, consultancies, and other users who access our website, applications, advertisements, or services.
              By accessing AIJobs, registering an account, applying for a job, submitting a lead form, uploading a resume, or using our services, you agree to the practices described in this Privacy Policy.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">1. AIJobs Is Free for Job Seekers</h4>
            <p>
              AIJobs does not charge candidates any registration fee, application fee, interview fee, placement fee, joining fee, security deposit, or other payment for providing job opportunities.
              Job search, registration, job applications, and placement assistance offered directly by AIJobs are free of cost for candidates.
            </p>
            <p>
              AIJobs does not guarantee employment or final selection. A candidate’s selection and placement depend on factors including eligibility and qualifications, skills and experience, resume and profile information, interview performance, background or document verification, employer requirements, availability of suitable job vacancies, and the final approval and decision of the employer or recruiter.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">2. Information We Collect</h4>
            <p><strong>Personal and Contact Information:</strong> Full name, mobile number, email address, city/state/location, DOB, profile photograph, residential address.</p>
            <p><strong>Professional Information:</strong> Resume/CV, educational qualifications, work experience, skills/certifications, salary details, preferred job role and location, notice period, interview availability, and application history.</p>
            <p><strong>Verification Information:</strong> Identity proof, address proof, educational documents, experience documents, salary documents, and other employment records provided voluntarily.</p>
            <p><strong>Technical Information:</strong> IP address, browser type, device information, OS, usage logs, cookies, and referral campaign source.</p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">3. How We Use Your Information</h4>
            <p>
              AIJobs uses personal information to create and manage accounts, contact candidates regarding job opportunities, match candidate profiles with jobs using AI, process and track applications, schedule interviews, send email/SMS/WhatsApp/in-app notifications, detect fraud and fake profiles, improve platform recommendations, and comply with legal requirements.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">4. Sharing Candidate Information</h4>
            <p>
              AIJobs shares candidate information strictly with authorized employers, recruiters, recruitment consultancies, interviewers, background verification providers, and cloud infrastructure partners for job placement purposes. AIJobs does not sell personal information to third parties.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">5. Calls, SMS, WhatsApp, and Email Communication</h4>
            <p>
              By registering or applying, users consent to receiving job alerts, application updates, interview schedules, and security notifications via phone calls, SMS, WhatsApp, and email.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">6. Job Selection and Placement Disclaimer</h4>
            <p>
              AIJobs acts as a technology-enabled recruitment platform. AIJobs does not promise or guarantee job selection, offer-letter issuance, or specific joining conditions. Final hiring decisions rest solely with the employer.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">7. No Candidate Placement Charges</h4>
            <p>
              AIJobs does not charge candidates for job placement. Candidates must never pay money to anyone for guaranteed selection or job processing under the AIJobs name.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">8. Employer and Recruiter Services</h4>
            <p>
              AIJobs offers paid plans and subscriptions to employers and consultancies. Any charges paid by employers are business-service charges separate from free candidate services.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">9. Data Accuracy</h4>
            <p>
              Users are responsible for providing accurate and truthful information. Accounts containing false or fraudulent credentials may be suspended immediately.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">10. Data Security</h4>
            <p>
              AIJobs uses administrative, organizational, and technical safeguards (including Firestore security rules and encrypted transport) to protect personal data against unauthorized access.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">11. Data Retention</h4>
            <p>
              AIJobs retains personal information as long as necessary to fulfill recruitment services, process applications, prevent fraud, and comply with legal obligations.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">12. Cookies and Analytics</h4>
            <p>
              Cookies are used to maintain user sessions, record theme preferences, understand platform performance, and measure campaign effectiveness.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">13. Third-Party Services and Links</h4>
            <p>
              AIJobs integrates with cloud services (Firebase, Google Ads, WhatsApp communication gateways). Third-party providers operate under their respective privacy policies.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">14. User Rights</h4>
            <p>
              Users have the right to access, update, correct, or request deletion of their personal information by contacting AIJobs support.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">15. Account and Data Deletion</h4>
            <p>
              Account deletion requests can be submitted to info@aijobs.in along with registered contact details for identity verification.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">16. Children’s Privacy</h4>
            <p>
              AIJobs is intended for individuals legally eligible for employment. Minors should access the platform only under parental supervision.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">17. Fraud and Safety Warning</h4>
            <p>
              Candidates should independently verify employers and never share sensitive credentials (OTPs, PINs, or banking details).
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">18. Changes to This Privacy Policy</h4>
            <p>
              Updates to this policy will be published on this page with a revised date. Continued platform usage constitutes acceptance of updated terms.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">19. Grievance and Contact Information</h4>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1 font-mono text-[11px] text-gray-300">
              <p><strong>Platform:</strong> AIJobs</p>
              <p><strong>Operated by:</strong> The Flex Force Services</p>
              <p><strong>Website:</strong> https://aijobs-14.vercel.app/</p>
              <p><strong>Email:</strong> info@aijobs.in</p>
            </div>
          </div>
        );

      case "terms":
        return (
          <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
              <FileText className="w-5 h-5" />
              <span>Terms of Service & User Conduct Guidelines</span>
            </div>
            <p><strong>Effective Date: Established {establishedYear}</strong></p>
            <p>
              These Terms &amp; Conditions govern your use of the <strong>{platformName}</strong> platform available at <strong>{website}</strong>, managed by <strong>{companyName}</strong>. By accessing our services, you fully accept these terms.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">1. Eligible User Categories</h4>
            <p>
              The platform supports distinct workflows for Candidates, Recruiters, Employers, and Consultancies. You agree to register under a singular verified role and represent your qualifications or vacant corporate positions honestly.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">2. Prohibited Platform Activities</h4>
            <p>
              Users are strictly forbidden from:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Uploading malicious files, corrupted PDFs, or falsified credentials</li>
              <li>Scraping candidate profile contacts or system vacancy lists using automated bots</li>
              <li>Bypassing official PayU checkout gateways to obtain premium billing tiers</li>
              <li>Lying about recruiter affiliations or charging candidates secondary placement fees</li>
            </ul>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">3. Limitation of Liability</h4>
            <p>
              While {platformName} leverages advanced artificial intelligence tools (including Gemini AI models) to compile resume scores and suitability reports, all hiring outcomes remain the sole responsibility of the respective employer or consultancy agency.
            </p>
          </div>
        );

      case "refund":
        return (
          <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
              <RefreshCw className="w-5 h-5" />
              <span>Refund Policy & Billing Safeguards</span>
            </div>
            <p><strong>Latest Update: Established {establishedYear}</strong></p>
            <p>
              At <strong>{companyName}</strong>, we strive to ensure a pristine software experience for all our consultancy agencies and recruiting enterprises.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">1. No-Refund Subscription Tiers</h4>
            <p>
              Due to the immediate provisioning of recruiting credits, premium job posting slots, and candidate contact exports upon successful PayU checkout, all purchases for Starter, Professional, and Enterprise subscription tiers are non-refundable.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">2. System Downtime & Compensation</h4>
            <p>
              In the rare event of major platform downtime exceeding 24 consecutive hours, impacted consultancies can contact <strong>{supportEmail}</strong> to request active subscription validity extensions or pro-rated service credits.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">3. Transaction Disputes</h4>
            <p>
              All transaction billing disputes must be reported to our finance desk within 7 working days of payment. Unauthorized chargebacks initiated through third-party credit institutions without matching system tickets will result in immediate profile suspension.
            </p>
          </div>
        );

      case "cancellation":
        return (
          <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
              <AlertCircle className="w-5 h-5" />
              <span>Cancellation Policy</span>
            </div>
            <p><strong>Established: {establishedYear}</strong></p>
            <p>
              This section outlines subscription renewal terminations for recruiting agencies using <strong>{platformName}</strong> under <strong>{companyName}</strong>.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">1. On-Demand Cancellation</h4>
            <p>
              Consultancies and premium employers can cancel their recurring subscription cycles at any point directly from the <strong>Plan &amp; Billing Hub</strong> or by sending a cancellation notice to <strong>{supportEmail}</strong>.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">2. Post-Cancellation Access</h4>
            <p>
              Upon successful cancellation, your recruiter logins and active job postings will remain fully functional until the end of the current billing cycle. No further recurring charges will be initiated on your linked PayU account.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">3. Data Retention Policy</h4>
            <p>
              To safeguard your candidate lists, {platformName} preserves your CRM pipeline configs, resume scores, and live chat records for up to 90 days post-cancellation, allowing instant reactive restoration if you decide to upgrade back later.
            </p>
          </div>
        );

      case "cookie":
        return (
          <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
              <Sparkles className="w-5 h-5" />
              <span>Cookie Policy & Essential Preferences</span>
            </div>
            <p><strong>Policy Scope: {companyName} ({establishedYear})</strong></p>
            <p>
              Like almost all premium professional workspaces, <strong>{platformName}</strong> uses essential cookies to track your active login session, persist selected visual theme preferences (Premium Dark Mode), and secure PayU checkout logs.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">1. Essential Authentication Cookies</h4>
            <p>
              These cookies are mandatory to keep your candidate or recruiter credentials validated as you navigate across dashboard sections. Rejecting these cookies prevents successful logins.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">2. Analytics & Performance Cookies</h4>
            <p>
              We leverage safe telemetry (Google Analytics ready) to monitor active page performance, live chat latencies, and check if AI resume scoring pipelines execute smoothly. No personally identifiable data is stored or tracked.
            </p>
          </div>
        );

      case "disclaimer":
        return (
          <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
              <AlertCircle className="w-5 h-5" />
              <span>Platform Disclaimer & Warranty Exclusions</span>
            </div>
            <p><strong>Created: {establishedYear} | Owned By {companyName}</strong></p>
            <p>
              The information on <strong>{platformName}</strong> (<strong>{website}</strong>) is published in good faith and for general professional workspace coordination purposes only.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">1. AI Assessment Limits</h4>
            <p>
              All AI score outputs, resume keyword correlation models, suitability indexes, and interview evaluations are powered by automated algorithmic models. They should be utilized as analytical indicators and are not a replacement for human HR verification.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">2. No Guarantee of Placement</h4>
            <p>
              {platformName} does not guarantee job placements, salary upgrades, or successful hires. All communication channels (live chats, job applies, offers) are voluntary negotiations between independent corporate entities and candidates.
            </p>

            <h4 className="text-white font-bold text-sm mt-4 uppercase tracking-wider">3. External Gateway Disclaimer</h4>
            <p>
              All payment transactions are handled directly through standard secure PayU endpoints. <strong>{companyName}</strong> is not liable for temporary gateway downtime or bank clearance delay issues.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#09090f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-900/20 to-purple-900/20">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase font-sans flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                <FileText className="w-4 h-4" />
              </span>
              <span>{docType === "privacy" ? "Privacy Policy" : 
                    docType === "terms" ? "Terms & Conditions" : 
                    docType === "refund" ? "Refund Policy" : 
                    docType === "cancellation" ? "Cancellation Policy" : 
                    docType === "cookie" ? "Cookie Policy" : "Disclaimer"}</span>
            </h2>
            <p className="text-[10px] text-indigo-300/80 font-semibold font-mono tracking-wider uppercase">
              {platformName} Official Document • {companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center">
          <span className="text-[10px] text-gray-500 font-mono">
            &copy; {establishedYear} {companyName}. All Rights Reserved.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
