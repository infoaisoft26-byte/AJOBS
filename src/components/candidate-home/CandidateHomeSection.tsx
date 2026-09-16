import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { Bookmark, BriefcaseBusiness, Search, Sparkles, UserRound } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import CandidateAnimatedBackground from "./CandidateAnimatedBackground";
import CandidateHero from "./CandidateHero";
import CandidateTrustStrip from "./CandidateTrustStrip";
import CandidateBenefits from "./CandidateBenefits";
import CandidateLiveJobs from "./CandidateLiveJobs";
import CandidateHowItWorks from "./CandidateHowItWorks";
import CandidateRegistrationCTA from "./CandidateRegistrationCTA";
import CandidateSafetySection from "./CandidateSafetySection";
import CandidateFinalCTA from "./CandidateFinalCTA";
import EasyApplyModal from "../EasyApplyModal";
import { useToast } from "../GlobalToast";
import { db } from "../../firebase";
import { getLiveJobs } from "../../services/jobService";
import { getSavedJobIdsFromBookmarks, removeJobFromBookmarks, saveJobToBookmarks } from "../../services/savedJobsService";
import type { JobApplication, JobPosting, UserProfile } from "../../types";

export interface CandidateHomeSectionProps { onGetStarted: () => void; setActiveView: (view: string) => void; onOpenCompanyPage?: (pageType: string) => void; onSelectJob?: (jobId: string) => void; onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void; user?: UserProfile | null; }

export default function CandidateHomeSection({ onGetStarted, setActiveView, onSelectJob, onOpenAuth, user }: CandidateHomeSectionProps) {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobPosting[]>([]); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState("");
  const [keyword, setKeyword] = useState(""); const [location, setLocation] = useState(""); const [category, setCategory] = useState("");
  const [profile, setProfile] = useState<any>(user || null); const [savedJobIds, setSavedJobIds] = useState<string[]>([]); const [applyJob, setApplyJob] = useState<JobPosting | null>(null);
  const loadJobs = useCallback(async () => { setLoading(true); try { const liveJobs = await getLiveJobs(); setJobs(liveJobs || []); setLoadError(""); } catch (error) { console.error("[CandidateHome] Unable to load jobs", error); setLoadError("Live jobs could not be loaded. Check your connection and retry."); } finally { setLoading(false); } }, []);
  useEffect(() => { void loadJobs(); }, [loadJobs]);
  useEffect(() => { let active = true; if (!user?.uid) { setProfile(null); setSavedJobIds([]); return () => { active = false; }; } Promise.all([getDoc(doc(db, "candidates", user.uid)), getSavedJobIdsFromBookmarks(user.uid)]).then(([candidateSnapshot, ids]) => { if (!active) return; setProfile({ ...user, ...(candidateSnapshot.exists() ? candidateSnapshot.data() : {}) }); setSavedJobIds(ids); }).catch((error) => { console.warn("[CandidateHome] Candidate profile could not be hydrated", error); if (active) setProfile(user); }); return () => { active = false; }; }, [user]);
  const browseJobs = () => setActiveView("public-jobs");
  const handleSearch = (event: FormEvent) => { event.preventDefault(); const combinedQuery = [keyword.trim(), category].filter(Boolean).join(" "); sessionStorage.setItem("aijobs_search_query", combinedQuery); sessionStorage.setItem("aijobs_search_loc", location.trim()); setActiveView("public-jobs"); };
  const handleViewJob = (job: JobPosting) => { if (onSelectJob) onSelectJob(job.id); else setActiveView(`job-details-${job.id}`); };
  const handleApply = (job: JobPosting) => { if (!user) { onOpenAuth?.("signin", "candidate"); return; } const missingFields = [!profile?.phone && "contact details", !profile?.experience && "experience", !profile?.education && "education", !(profile?.resumeUrl || profile?.resumeURL) && "resume"].filter(Boolean); if (missingFields.length) { showToast(`Complete your ${missingFields.join(", ")} before applying.`, "warning"); setActiveView("resume-onboarding"); return; } setApplyJob(job); };
  const handleToggleSave = async (jobId: string) => { if (!user) { onOpenAuth?.("signin", "candidate"); return; } const alreadySaved = savedJobIds.includes(jobId); setSavedJobIds((current) => alreadySaved ? current.filter((id) => id !== jobId) : [...current, jobId]); try { if (alreadySaved) await removeJobFromBookmarks(user.uid, jobId); else await saveJobToBookmarks(user.uid, jobId); } catch (error) { console.error("[CandidateHome] Save job failed", error); setSavedJobIds((current) => alreadySaved ? [...current, jobId] : current.filter((id) => id !== jobId)); showToast("Saved jobs could not be updated.", "error"); } };
  const openCandidateTab = (tab: string) => { if (!user) { onOpenAuth?.("signin", "candidate"); return; } sessionStorage.setItem("aijobs_candidate_start_tab", tab); setActiveView("dashboard"); };
  return <main className="relative min-h-screen overflow-hidden bg-[#f6f9ff] pb-20 text-slate-950 md:pb-0"><CandidateAnimatedBackground /><CandidateHero keyword={keyword} location={location} category={category} isRegistered={Boolean(user)} candidateName={user?.name} onKeywordChange={setKeyword} onLocationChange={setLocation} onCategoryChange={setCategory} onSearch={handleSearch} onCreateProfile={onGetStarted} onBrowseJobs={browseJobs} /><CandidateTrustStrip /><CandidateBenefits /><CandidateLiveJobs jobs={jobs} loading={loading} error={loadError} savedJobIds={savedJobIds} onRetry={() => void loadJobs()} onViewAll={browseJobs} onViewJob={handleViewJob} onApply={handleApply} onToggleSave={(jobId) => void handleToggleSave(jobId)} /><CandidateHowItWorks /><CandidateRegistrationCTA isRegistered={Boolean(user)} onCreateProfile={onGetStarted} onBrowseJobs={browseJobs} /><CandidateSafetySection /><CandidateFinalCTA isRegistered={Boolean(user)} onCreateProfile={onGetStarted} onBrowseJobs={browseJobs} />
    <nav aria-label="Candidate mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur-xl md:hidden"><button onClick={() => setActiveView("home")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-blue-600"><Sparkles className="h-5 w-5" />Home</button><button onClick={browseJobs} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><Search className="h-5 w-5 text-blue-600" />Jobs</button><button onClick={() => openCandidateTab("saved-jobs")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><Bookmark className="h-5 w-5 text-blue-600" />Saved</button><button onClick={() => openCandidateTab("applied-jobs")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><BriefcaseBusiness className="h-5 w-5 text-blue-600" />Applications</button><button onClick={() => openCandidateTab("profile")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><UserRound className="h-5 w-5 text-blue-600" />Profile</button></nav>
    {applyJob && user && <EasyApplyModal job={applyJob} userId={user.uid} userName={user.name || "Candidate"} profile={profile || user} onClose={() => setApplyJob(null)} onAppliedSuccess={(_application: JobApplication) => showToast("Application submitted successfully. Track it from your candidate dashboard.", "success")} onNavigateToApplications={() => { setApplyJob(null); openCandidateTab("applied-jobs"); }} onNavigateToFindJobs={() => { setApplyJob(null); browseJobs(); }} onUploadResumeClick={() => { setApplyJob(null); setActiveView("resume-onboarding"); }} />}
  </main>;
}
