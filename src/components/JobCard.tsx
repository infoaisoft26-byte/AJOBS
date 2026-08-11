import React, { useState } from "react";
import { MapPin, Briefcase, Calendar, Heart, Eye, CheckCircle2, ShieldCheck, Sparkles, ChevronRight, X, Info } from "lucide-react";
import { JobPosting } from "../types";
import { calculateJobMatchScore, JobMatchResult } from "../services/jobMatchEngine";

interface JobCardProps {
  job: JobPosting;
  applied: boolean;
  isSaved: boolean;
  onApply: (job: JobPosting) => void;
  onSave: (jobId: string, currentSavedState: boolean) => void;
  onSelectDetails: (job: JobPosting) => void;
  profile?: any;
}

export default function JobCard({
  job,
  applied,
  isSaved,
  onApply,
  onSave,
  onSelectDetails,
  profile
}: JobCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const salaryDisplay = job.salary ? `₹${job.salary}` : "Not disclosed";
  const experienceDisplay = job.experience ? `${job.experience} yrs` : "0-2 yrs";
  const workTypeDisplay = job.workMode || job.type || "Full Time";
  const postedDate = job.createdAt 
    ? new Date(job.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : "Recently";

  // Calculate AI match score if profile exists
  const matchResult: JobMatchResult | null = profile ? calculateJobMatchScore(job, profile) : null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4 relative">
      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-blue-700 block">{job.companyName}</span>
              {matchResult && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBreakdown(true);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full border flex items-center space-x-1 cursor-pointer transition-transform hover:scale-105 ${matchResult.badgeColor}`}
                  title="Click to see AI Match score breakdown"
                >
                  <Sparkles className="w-3 h-3 text-current shrink-0" />
                  <span>{matchResult.totalScore}% Match</span>
                </button>
              )}
            </div>
            <h3 
              onClick={() => onSelectDetails(job)}
              className="font-bold text-base text-gray-900 hover:text-blue-600 transition-colors cursor-pointer line-clamp-1 mt-0.5"
            >
              {job.title}
            </h3>
          </div>

          <button 
            onClick={() => onSave(job.id, isSaved)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSaved 
                ? "bg-blue-50 border-blue-200 text-blue-600" 
                : "bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600"
            }`}
            title={isSaved ? "Saved" : "Save Job"}
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-blue-600 text-blue-600" : ""}`} />
          </button>
        </div>

        {/* Quick Details Chips */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
          <span className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{job.location || "Remote"}</span>
          </span>
          <span className="flex items-center space-x-1 font-medium text-gray-900">
            <span>💰 {salaryDisplay}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{experienceDisplay}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
            {workTypeDisplay}
          </span>
          <span className="flex items-center space-x-1 text-gray-400 text-[11px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>{postedDate}</span>
          </span>
        </div>

        {/* Description snippet */}
        {job.description && (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}

        {/* Skills Required */}
        {job.skillsRequired && job.skillsRequired.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {job.skillsRequired.slice(0, 5).map((sk, k) => (
              <span 
                key={k} 
                className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-md font-medium border border-gray-200/60"
              >
                {sk}
              </span>
            ))}
            {job.skillsRequired.length > 5 && (
              <span className="text-xs text-gray-400 self-center">
                +{job.skillsRequired.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Action Buttons */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <button
          onClick={() => onSelectDetails(job)}
          className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <Eye className="w-3.5 h-3.5 text-gray-500" />
          <span>View Job</span>
        </button>

        {applied ? (
          <span className="flex-1 py-2 px-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold text-center flex items-center justify-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            <span>Applied</span>
          </span>
        ) : (
          <button
            onClick={() => onApply(job)}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all text-center cursor-pointer shadow-xs"
          >
            Apply Now
          </button>
        )}
      </div>

      {/* AI Match Breakdown Modal */}
      {showBreakdown && matchResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">AI Job Match Analysis</h3>
              </div>
              <button
                onClick={() => setShowBreakdown(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-2 bg-blue-50/60 rounded-xl border border-blue-100">
              <span className="text-2xl font-black text-blue-700">{matchResult.totalScore}%</span>
              <p className="text-xs font-bold text-blue-900 mt-0.5">{matchResult.matchLevel}</p>
            </div>

            {/* Score Breakdown Bars */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-gray-700">Scoring Model Breakdown</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Skills Alignment (35%)</span>
                    <span className="font-bold text-gray-900">{matchResult.breakdown.skillsScore} / 35</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(matchResult.breakdown.skillsScore / 35) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Role & Title Fit (20%)</span>
                    <span className="font-bold text-gray-900">{matchResult.breakdown.titleScore} / 20</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(matchResult.breakdown.titleScore / 20) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Experience Level (15%)</span>
                    <span className="font-bold text-gray-900">{matchResult.breakdown.experienceScore} / 15</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(matchResult.breakdown.experienceScore / 15) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Location & Mode (10%)</span>
                    <span className="font-bold text-gray-900">{matchResult.breakdown.locationScore} / 10</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${(matchResult.breakdown.locationScore / 10) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Reasons list */}
            {matchResult.reasons.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <h4 className="font-bold text-xs text-gray-700">Key Insights</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  {matchResult.reasons.map((r, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowBreakdown(false)}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Close Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

