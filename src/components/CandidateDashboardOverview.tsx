import { useState, useEffect } from "react";
import { 
  Award, Brain, Briefcase, Heart, Bell, Star, TrendingUp, Sparkles, CheckCircle2, 
  ArrowRight, ShieldCheck, Lock, Lightbulb, Activity, ChevronRight, CheckCircle
} from "lucide-react";
import { CandidateProfile, JobApplication, NotificationRecord } from "../types";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import HolographicCard from "./HolographicCard";

interface OverviewProps {
  userName: string;
  profile: any;
  applications: JobApplication[];
  jobsCount: number;
  notifications: NotificationRecord[];
  onSelectTab: (tab: any) => void;
}

export default function CandidateDashboardOverview({
  userName,
  profile,
  applications,
  jobsCount,
  notifications,
  onSelectTab
}: OverviewProps) {
  const [profileCompletion, setProfileCompletion] = useState(0);

  // Calculate Profile Completion Percentage
  useEffect(() => {
    let score = 15; // Starting base score for account creation
    if (!profile) {
      setProfileCompletion(score);
      return;
    }

    // 1. Profile Details
    if (profile.name || profile.profileDetails?.fullName) score += 10;
    if (profile.profileDetails?.mobileNumber) score += 10;
    if (profile.profileDetails?.linkedinProfile || profile.profileDetails?.portfolioUrl) score += 10;
    
    // 2. Resume Text
    if (profile.resumeText) score += 15;

    // 3. Education
    const edu = profile.education;
    if (edu?.tenthSchool || edu?.twelfthSchool) score += 10;
    if (edu?.gradCollege || edu?.graduation?.college) score += 10;

    // 4. Skills
    const sk = profile.skills;
    const skillsList = Array.isArray(sk) ? sk : (sk?.technical || []);
    if (skillsList.length > 0) score += 15;

    // 5. Experience
    const exp = profile.workExperience;
    if (exp && exp.length > 0) score += 15;

    setProfileCompletion(Math.min(score, 100));
  }, [profile]);

  const resumeScore = profile?.resumeScore || 0;
  const interviewScore = profile?.aiInterviewScore || 0;
  const isAiVerified = interviewScore >= 80;

  // Calculate AI Talent Score dynamically
  const calculateTalentScore = () => {
    const resumeContribution = resumeScore * 0.25;
    const interviewContribution = interviewScore * 0.25;
    const completionContribution = profileCompletion * 0.20;
    
    const sk = profile?.skills || [];
    const skillsList = Array.isArray(sk) ? sk : (sk?.technical || []);
    const skillsContribution = Math.min((skillsList.length / 8) * 100, 100) * 0.15;
    
    const certs = profile?.certifications || [];
    const certsList = Array.isArray(certs) ? certs : (certs?.certifications || []);
    const certsContribution = (certsList.length > 0 ? 100 : 60) * 0.15;
    
    const overall = Math.round(resumeContribution + interviewContribution + completionContribution + skillsContribution + certsContribution);
    return Math.max(40, Math.min(overall, 100));
  };

  const talentScore = calculateTalentScore();

  const getTalentGrade = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (score >= 75) return { label: "Good", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
    if (score >= 60) return { label: "Average", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    return { label: "Needs Improvement", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
  };

  const grade = getTalentGrade(talentScore);

  // Save AI Talent Score to Firestore collection "talent_scores"
  useEffect(() => {
    const userId = profile?.userId || profile?.id;
    if (!userId) return;

    const saveTalentScore = async () => {
      try {
        await setDoc(doc(db, "talent_scores", userId), {
          id: userId,
          userId,
          candidateName: userName,
          overallScore: talentScore,
          grade: grade.label,
          breakdown: {
            resumeQuality: resumeScore,
            interviewPerformance: interviewScore,
            profileCompletion,
            skillsCount: profile ? (Array.isArray(profile.skills) ? profile.skills : (profile.skills?.technical || [])).length : 0,
            certificationsCount: profile ? (Array.isArray(profile.certifications) ? profile.certifications : (profile.certifications?.certifications || [])).length : 0
          },
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error saving talent score:", err);
      }
    };
    saveTalentScore();
  }, [profile, talentScore, grade.label, userName, resumeScore, interviewScore, profileCompletion]);

  // Saved Jobs filter
  const savedJobsCount = profile?.savedJobIds?.length || 0;

  // Career tips
  const careerTips = [
    { title: "Optimize ATS Keywords", desc: "Integrate core skill-terms like 'TypeScript state management' directly inside past job descriptions." },
    { title: "Crush the AI Interview Simulator", desc: "Speak structured star-method narratives. Be specific about quantitative engineering metrics." },
    { title: "LinkedIn Hooking", desc: "Ensure your portfolio link matches the headers parsed by automated agency systems." }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500" id="candidate-dashboard-overview">
      {/* Top Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Welcome & Profile Completion */}
        <HolographicCard glowColor="rgba(99, 102, 241, 0.25)" className="lg:col-span-2 p-6 flex flex-col justify-between h-full relative overflow-hidden bg-gradient-to-br from-indigo-950/20 to-black/40">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="text-indigo-400 w-5 h-5 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-300 font-bold">
                Enterprise AI Portal
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
              Welcome back, {userName}!
            </h2>
            <p className="text-xs text-gray-400 max-w-xl">
              Accelerate your engineering recruitment cycles. Review ATS compliance audits, complete mock assessment arenas, and interact with the generative coach.
            </p>
          </div>

          {/* Profile completion gauge */}
          <div className="space-y-2.5 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300">Complete Profile Progress</span>
              <span className="font-mono font-bold text-indigo-400">{profileCompletion}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
              <span>Setup qualifications, past roles, and ATS text keywords.</span>
              <button 
                onClick={() => onSelectTab("profile")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-0.5 cursor-pointer"
              >
                <span>Edit Profile</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </HolographicCard>

        {/* AI Verified Badge Status */}
        <HolographicCard glowColor={isAiVerified ? "rgba(16, 185, 129, 0.25)" : "rgba(107, 114, 128, 0.2)"} className="p-6 flex flex-col justify-between h-full bg-gradient-to-br from-[#090d16]/30 to-black/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider font-extrabold text-gray-400 uppercase">
              Hiring Credentials
            </span>
            {isAiVerified ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-gray-500" />
            )}
          </div>

          <div className="text-center py-4 space-y-2 relative">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-500 ${
              isAiVerified 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 animate-pulse" 
                : "bg-white/5 border-white/10 text-gray-500"
            }`}>
              <Star className={`w-8 h-8 ${isAiVerified ? "fill-emerald-400 text-emerald-400" : ""}`} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">AI Verified Badge</p>
              <p className="text-[10px] text-gray-400 mt-1 px-4 leading-normal">
                {isAiVerified 
                  ? "Congratulations! Your credential badge is active and highlighted to tech agencies." 
                  : "Requires an AI Interview rating of 80% or above to unlock verified status."}
              </p>
            </div>
          </div>

          {!isAiVerified && (
            <button
              onClick={() => onSelectTab("interview")}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-gray-300 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              Start Simulator Challenge
            </button>
          )}
        </HolographicCard>
      </div>

      {/* Overview Stats Cards Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Resume Score */}
        <HolographicCard glowColor="rgba(99, 102, 241, 0.25)" className="p-5 flex flex-col justify-between" onClick={() => onSelectTab("resume")}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase">ATS Resume Score</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-extrabold font-display text-white">{resumeScore}</span>
              <span className="text-[10px] text-gray-500 font-mono">/100</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Audit status: <span className="text-indigo-400 font-semibold">{resumeScore ? "Active" : "No audit"}</span></p>
          </div>
        </HolographicCard>

        {/* Card 2: AI Interview Score */}
        <HolographicCard glowColor="rgba(168, 85, 247, 0.25)" className="p-5 flex flex-col justify-between" onClick={() => onSelectTab("interview")}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase">Interview Rating</span>
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-extrabold font-display text-white">{interviewScore}</span>
              <span className="text-[10px] text-gray-500 font-mono">/100</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Simulations completed: <span className="text-purple-400 font-semibold">{interviewScore ? "Done" : "None"}</span></p>
          </div>
        </HolographicCard>

        {/* Card 3: Saved Jobs Count */}
        <HolographicCard glowColor="rgba(236, 72, 153, 0.25)" className="p-5 flex flex-col justify-between" onClick={() => onSelectTab("saved-jobs")}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase">Saved Openings</span>
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <span className="text-3xl font-extrabold font-display text-white">{savedJobsCount}</span>
            <p className="text-[10px] text-gray-400 mt-1">All postings boarded: <span className="text-pink-400 font-semibold">{jobsCount}</span></p>
          </div>
        </HolographicCard>

        {/* Card 4: Applications Count */}
        <HolographicCard glowColor="rgba(16, 185, 129, 0.25)" className="p-5 flex flex-col justify-between" onClick={() => onSelectTab("applied-jobs")}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase">Applications Sent</span>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-3xl font-extrabold font-display text-white">{applications.length}</span>
            <p className="text-[10px] text-gray-400 mt-1">Offers received: <span className="text-emerald-400 font-semibold">
              {applications.filter(a => a.status === "offered").length}
            </span></p>
          </div>
        </HolographicCard>

        {/* Card 5: AI Talent Score */}
        <HolographicCard glowColor="rgba(20, 184, 166, 0.25)" className="p-5 flex flex-col justify-between bg-gradient-to-br from-indigo-950/20 to-[#0a0f1d]/50" onClick={() => onSelectTab("reports")}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase">AI Talent Rating</span>
            <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-extrabold font-display text-white">{talentScore}</span>
              <span className="text-[10px] text-gray-500 font-mono">/100</span>
            </div>
            <div className={`mt-1.5 px-2 py-0.5 text-[9px] font-mono font-extrabold rounded-md inline-block uppercase tracking-wider ${grade.color}`}>
              {grade.label}
            </div>
          </div>
        </HolographicCard>
      </div>

      {/* Lower Information Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Career Tips & Suggestions */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="font-display font-bold text-sm text-white flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            <span>AI Coach Career Insights</span>
          </h3>
          <div className="space-y-3.5">
            {careerTips.map((tip, i) => (
              <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1 hover:bg-white/10 transition-all">
                <p className="text-xs font-bold text-indigo-300">{tip.title}</p>
                <p className="text-[11px] text-gray-400 leading-normal">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Database / Workspace Logs */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="font-display font-bold text-sm text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Recent Workspace Activity</span>
          </h3>
          <div className="space-y-3 max-h-72 overflow-y-auto divide-y divide-white/5 pr-2 scrollbar">
            {notifications.slice(0, 4).map((notif) => (
              <div key={notif.id} className="pt-3 first:pt-0 flex items-start space-x-3 text-[11px]">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="font-semibold text-gray-200">{notif.title}</p>
                  <p className="text-gray-400">{notif.message}</p>
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                    {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-12 text-xs text-gray-500 italic">
                No recent workspace notifications recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
