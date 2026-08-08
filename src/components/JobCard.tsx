import React from "react";
import { MapPin, Briefcase, Calendar, Heart, Eye, CheckCircle2, ShieldCheck } from "lucide-react";
import { JobPosting } from "../types";

interface JobCardProps {
  job: JobPosting;
  applied: boolean;
  isSaved: boolean;
  onApply: (job: JobPosting) => void;
  onSave: (jobId: string, currentSavedState: boolean) => void;
  onSelectDetails: (job: JobPosting) => void;
}

export default function JobCard({
  job,
  applied,
  isSaved,
  onApply,
  onSave,
  onSelectDetails,
}: JobCardProps) {
  const salaryDisplay = job.salary ? `₹${job.salary}` : "Not disclosed";
  const experienceDisplay = job.experience ? `${job.experience} yrs` : "0-2 yrs";
  const workTypeDisplay = job.workMode || job.type || "Full Time";
  const postedDate = job.createdAt 
    ? new Date(job.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : "Recently";

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4">
      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-blue-700 block">{job.companyName}</span>
            <h3 
              onClick={() => onSelectDetails(job)}
              className="font-bold text-base text-gray-900 hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
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
    </div>
  );
}
