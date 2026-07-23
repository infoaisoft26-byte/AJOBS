import React, { useState } from "react";
import { Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { downloadCsv, CsvData } from "../utils/csvExporter";
import { useToast } from "./GlobalToast";

export interface ExportActivityCsvButtonProps {
  role?: "candidate" | "employer" | "consultancy" | "admin" | string;
  customData?: CsvData;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "compact";
}

export function ExportActivityCsvButton({
  role = "candidate",
  customData,
  label,
  className = "",
  variant = "primary"
}: ExportActivityCsvButtonProps) {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      if (customData) {
        downloadCsv(customData);
        showToast(`Exported ${customData.title} CSV successfully`, "success");
      } else {
        const timestamp = new Date().toLocaleString();
        let csvConfig: CsvData;

        switch (role) {
          case "employer":
          case "recruiter":
            csvConfig = {
              filename: "recruitment_activity_summary",
              title: "Employer Recruitment Activity Summary",
              headers: [
                "Job ID",
                "Job Title",
                "Department",
                "Status",
                "Total Applicants",
                "Shortlisted",
                "Interviews Scheduled",
                "Offers Extended",
                "Last Updated"
              ],
              rows: [
                ["JOB-101", "Senior AI Solutions Engineer", "Engineering", "Active", 28, 6, 4, 1, timestamp],
                ["JOB-102", "Lead Fullstack React Developer", "Product", "Active", 42, 9, 5, 2, timestamp],
                ["JOB-103", "Principal Talent Acquisition Manager", "Human Resources", "Active", 15, 3, 2, 0, timestamp],
                ["JOB-104", "Data Science & NLP Architect", "AI Research", "Review", 34, 8, 3, 1, timestamp],
                ["JOB-105", "Product Marketing Lead", "Marketing", "Closed", 19, 4, 2, 1, timestamp]
              ]
            };
            break;

          case "consultancy":
          case "agency":
            csvConfig = {
              filename: "agency_recruitment_activity",
              title: "Consultancy Mandates & Placement Activity",
              headers: [
                "Mandate ID",
                "Client Organization",
                "Role Title",
                "Candidates Shortlisted",
                "Interview Stage",
                "Placements",
                "Est. Fee / Commission",
                "Activity Status",
                "Date Generated"
              ],
              rows: [
                ["MND-801", "Vertex Tech Global", "VP Engineering", 12, "Final Round", 1, "$18,500", "In Progress", timestamp],
                ["MND-802", "Aura Health Solutions", "Staff Product Designer", 8, "Technical Screen", 0, "$12,000", "Active", timestamp],
                ["MND-803", "Nexus Financial Group", "DevOps Cloud Lead", 15, "Offer Phase", 2, "$24,000", "Placement Closed", timestamp],
                ["MND-804", "Quantum Labs", "Senior ML Researcher", 6, "Initial Vetting", 0, "$16,000", "Sourcing", timestamp]
              ]
            };
            break;

          case "admin":
            csvConfig = {
              filename: "system_recruitment_audit",
              title: "Administrator Platform Activity Audit",
              headers: [
                "Audit Metric",
                "Total Count / Status",
                "Active Users / Jobs",
                "Security & ABAC Compliance",
                "System Health",
                "Audit Timestamp"
              ],
              rows: [
                ["Candidate Profiles", "1,240 Registered", "890 Active This Week", "Verified", "Optimal", timestamp],
                ["Employer Workspaces", "185 Companies", "142 Active Recruiter Slots", "ABAC Enforced", "Optimal", timestamp],
                ["Job Postings Engine", "320 Live Listings", "48 Under Verification", "Scan Cleared", "Optimal", timestamp],
                ["Twilio & SMS Gateway", "Connected", "99.4% Delivery Rate", "Encrypted", "Operational", timestamp],
                ["AI Matching Engine", "Active", "1,450 Match Evaluations", "Gemini 2.5", "Operational", timestamp]
              ]
            };
            break;

          case "candidate":
          default:
            csvConfig = {
              filename: "candidate_recruitment_activity",
              title: "Candidate Career & Application Activity",
              headers: [
                "Activity Type",
                "Company / Job Title",
                "Application Status",
                "Match Score",
                "Interview Date",
                "Action Taken",
                "Last Sync Date"
              ],
              rows: [
                ["Job Application", "Senior AI Engineer at Vertex AI", "Under Review", "94%", "2026-07-28 14:00", "Resume Sent", timestamp],
                ["Technical Screening", "Lead React Architect at TechCorp", "Interview Scheduled", "88%", "2026-07-25 11:30", "Confirmed Slot", timestamp],
                ["Saved Opportunity", "Principal Product Manager at Innovate", "Bookmarked", "91%", "N/A", "Saved to Favorites", timestamp],
                ["AI Resume Audit", "Full-Stack Profile Review", "Score 88/100", "N/A", "N/A", "Optimized Keywords", timestamp]
              ]
            };
            break;
        }

        downloadCsv(csvConfig);
        showToast(`Exported ${csvConfig.title} to CSV`, "success");
      }
    } catch (err: any) {
      showToast("Failed to export recruitment summary CSV", "error");
      console.error("CSV Export error:", err);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "outline":
        return "border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-400 bg-gray-900/40";
      case "secondary":
        return "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700";
      case "compact":
        return "px-2.5 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg";
      case "primary":
      default:
        return "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30";
    }
  };

  return (
    <button
      id={`btn-export-activity-csv-${role}`}
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-xs transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${getVariantStyles()} ${className}`}
      title="Export recruitment activity summary as a CSV spreadsheet"
    >
      {isExporting ? (
        <>
          <CheckCircle2 className="w-4 h-4 animate-bounce text-emerald-400" />
          <span>Generating CSV...</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <Download className="w-3.5 h-3.5 text-indigo-200" />
          <span>{label || "Export Activity CSV"}</span>
        </>
      )}
    </button>
  );
}

export default ExportActivityCsvButton;
