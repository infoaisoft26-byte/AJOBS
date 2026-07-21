import { useState, useEffect } from "react";
import { 
  Award, Brain, Briefcase, Heart, Bell, Star, TrendingUp, Sparkles, CheckCircle2, 
  ArrowRight, ShieldCheck, Lock, Lightbulb, Activity, ChevronRight, CheckCircle,
  GripVertical, FileText
} from "lucide-react";
import { jsPDF } from "jspdf";
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

  // Drag-and-drop state and handlers for widgets
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("candidate-dashboard-widget-order");
    return saved ? JSON.parse(saved) : ["resume", "interview", "saved", "applied", "talent"];
  });
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    setDragOverIdx(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null) return;
    
    const newOrder = [...widgetOrder];
    const draggedItem = newOrder[draggedIdx];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setWidgetOrder(newOrder);
    localStorage.setItem("candidate-dashboard-widget-order", JSON.stringify(newOrder));
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleResetWidgetOrder = () => {
    const defaultOrder = ["resume", "interview", "saved", "applied", "talent"];
    setWidgetOrder(defaultOrder);
    localStorage.setItem("candidate-dashboard-widget-order", JSON.stringify(defaultOrder));
  };

  // PDF Export summary function
  const exportDashboardPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Header Banner (Dark Navy/Indigo)
      doc.setFillColor(15, 23, 42); // slate 900
      doc.rect(0, 0, 210, 40, "F");

      // Header Brand Typography
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("NEXUS TALENT INTELLIGENCE", 15, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(129, 140, 248); // indigo 400
      doc.text("CERTIFIED CANDIDATE PERFORMANCE & ATS AUDIT REPORT", 15, 26);

      // Decorative bottom line on header
      doc.setFillColor(99, 102, 241); // indigo 500
      doc.rect(0, 38, 210, 2, "F");

      // Document Metadata Section
      doc.setTextColor(51, 65, 85); // slate 700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("I. REPORT METADATA & PROFILE IDENTIFIER", 15, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate 600
      doc.text(`Candidate Name:   ${userName}`, 15, 58);
      doc.text(`Generated Date:   ${new Date().toLocaleString()}`, 15, 64);
      doc.text(`Registry ID:      ${profile?.userId || profile?.id || "N/A"}`, 15, 70);

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate 200
      doc.setLineWidth(0.5);
      doc.line(15, 75, 195, 75);

      // II. EXECUTIVE PERFORMANCE SUMMARIES (The 3 main ratings in boxed panels)
      doc.setTextColor(15, 23, 42); // slate 900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("II. EXECUTIVE TALENT & AUDIT METRICS", 15, 83);

      const drawMetricBox = (x: number, y: number, label: string, val: string, suffix: string, sub: string) => {
        doc.setFillColor(248, 250, 252); // slate 50
        doc.setDrawColor(226, 232, 240); // slate 200
        doc.roundedRect(x, y, 55, 28, 2, 2, "FD");
        
        doc.setTextColor(100, 116, 139); // slate 500
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label.toUpperCase(), x + 4, y + 6);
        
        doc.setTextColor(15, 23, 42); // slate 900
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(val, x + 4, y + 16);
        
        doc.setTextColor(148, 163, 184); // slate 400
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(suffix, x + 4 + doc.getTextWidth(val) + 1, y + 16);
        
        doc.setTextColor(71, 85, 105); // slate 600
        doc.setFontSize(8);
        doc.text(sub, x + 4, y + 24);
      };

      drawMetricBox(15, 88, "AI Talent Rating", `${talentScore}`, "/100", `Hiring Band: ${grade.label}`);
      drawMetricBox(75, 88, "ATS Resume Score", `${resumeScore}`, "/100", resumeScore >= 80 ? "Audit Approved" : "Action Needed");
      drawMetricBox(135, 88, "AI Interview Score", `${interviewScore}`, "/100", isAiVerified ? "Verified Veteran" : "Badge Locked");

      // III. COMPREHENSIVE COMPLIANCE CHECKLIST
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("III. COMPREHENSIVE COMPLIANCE & RECRUITMENT AUDIT", 15, 128);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Assessment Dimension", 17, 136);
      doc.text("Status / Value", 110, 136);
      doc.text("Hiring Impact Rating", 150, 136);
      doc.line(15, 139, 195, 139);

      let currentY = 145;
      const drawRow = (dimension: string, valStr: string, impactStr: string, passed: boolean) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(dimension, 17, currentY);
        
        doc.setFont("helvetica", "bold");
        if (passed) {
          doc.setTextColor(16, 185, 129); // emerald
        } else {
          doc.setTextColor(225, 29, 72); // rose
        }
        doc.text(valStr, 110, currentY);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(impactStr, 150, currentY);
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY + 3, 195, currentY + 3);
        currentY += 8;
      };

      const technicalSkills = profile ? (Array.isArray(profile.skills) ? profile.skills : (profile.skills?.technical || [])) : [];
      const certsList = profile ? (Array.isArray(profile.certifications) ? profile.certifications : (profile.certifications?.certifications || [])) : [];

      drawRow("ATS Resume Keyword Verification", resumeScore > 0 ? `${resumeScore}% Compliance` : "No Active Upload", resumeScore >= 80 ? "Parser Optimized" : "High Failure Risk", resumeScore >= 80);
      drawRow("AI Interactive Speech Simulation", interviewScore > 0 ? `${interviewScore}/100 Rating` : "Simulation Pending", isAiVerified ? "Verified (Hired Profile)" : "Needs Evaluation", isAiVerified);
      drawRow("Candidate Registry Completion", `${profileCompletion}% Index`, profileCompletion >= 75 ? "Optimal Visibility" : "Sub-optimal Visibility", profileCompletion >= 75);
      drawRow("Core Engineering Stack Listing", `${technicalSkills.length} Verified Skills`, technicalSkills.length >= 5 ? "Strong Tech Stack" : "Add Core Languages", technicalSkills.length >= 5);
      drawRow("Professional Certifications", `${certsList.length} Certifications`, certsList.length > 0 ? "Verified Authority" : "Portfolio Standard", certsList.length > 0);

      // IV. STRATEGIC CAREER ROADMAP
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("IV. GEN-AI CAREER ADVISORY ROADMAP", 15, currentY + 8);

      const roadmapY = currentY + 12;
      doc.setFillColor(248, 250, 252); // slate 50
      doc.roundedRect(15, roadmapY, 180, 24, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(99, 102, 241); // indigo 500
      doc.text("Automated Action Recommendations:", 20, roadmapY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("1. Complete outstanding AI mock interviews to satisfy technical verification badge requisites.", 20, roadmapY + 12);
      doc.text("2. Review ATS resume suggestions to augment key system keywords matching targeted vacancy telemetry.", 20, roadmapY + 17);

      // Professional Footer
      doc.setFillColor(241, 245, 249); // slate 100
      doc.rect(0, 282, 210, 15, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate 400
      doc.text("CONFIDENTIAL PORTAL SECURITY ENCRYPTED • NEXUS AI TALENT DESK", 15, 290);
      doc.text("Page 1 of 1", 185, 290);

      const filename = `${userName.replace(/\s+/g, "_")}_Nexus_Audit_Report.pdf`;
      doc.save(filename);
      console.log(`[Export] Saved summary report as ${filename}`);
    } catch (err: any) {
      console.error("[Export PDF Error]:", err);
    }
  };

  // Career tips
  const careerTips = [
    { title: "Optimize ATS Keywords", desc: "Integrate core skill-terms like 'TypeScript state management' directly inside past job descriptions." },
    { title: "Crush the AI Interview Simulator", desc: "Speak structured star-method narratives. Be specific about quantitative engineering metrics." },
    { title: "LinkedIn Hooking", desc: "Ensure your portfolio link matches the headers parsed by automated agency systems." }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500" id="candidate-dashboard-overview">
      {/* Control Panel Header with PDF Export and Layout Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5 bg-slate-950/20 p-4 rounded-2xl border border-white/5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white font-display">Workspace Dashboard</h1>
            <span className="px-2 py-0.5 text-[9px] font-mono font-extrabold rounded-md uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
              Draggable Bento Enabled
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Real-time telemetry, talent assessment, and ATS optimization matrices. Drag stats widgets to reorder.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={handleResetWidgetOrder}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-all cursor-pointer hover:scale-102"
            title="Restore default widget layout order"
          >
            Reset Order
          </button>
          <button
            onClick={exportDashboardPdf}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs font-bold text-white rounded-xl shadow-lg shadow-indigo-950/40 border border-indigo-500/30 flex items-center space-x-2 transition-all cursor-pointer hover:scale-102"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span>Export Dashboard Summary</span>
          </button>
        </div>
      </div>

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
        {widgetOrder.map((id, index) => {
          const isDragged = draggedIdx === index;
          const isDragOver = dragOverIdx === index;

          const dragProps = {
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
            onDrop: (e: React.DragEvent) => handleDrop(e, index),
            onDragEnd: handleDragEnd,
          };

          const containerClassName = `relative h-full transition-all duration-300 ${
            isDragged ? "opacity-30 scale-95 cursor-grabbing" : "cursor-grab hover:scale-[1.02] active:cursor-grabbing"
          } ${
            isDragOver ? "border-2 border-dashed border-indigo-500 rounded-2xl" : ""
          }`;

          if (id === "resume") {
            return (
              <div key="resume" {...dragProps} className={containerClassName}>
                <HolographicCard glowColor="rgba(99, 102, 241, 0.25)" className="p-5 flex flex-col justify-between h-full" onClick={() => onSelectTab("resume")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase flex items-center">
                      <GripVertical className="w-3.5 h-3.5 mr-1 text-gray-500 cursor-grab" />
                      ATS Resume Score
                    </span>
                    <Award className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-extrabold font-display text-white">{resumeScore}</span>
                      <span className="text-[10px] text-gray-500 font-mono">/100</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Audit status: <span className="text-indigo-400 font-semibold">{resumeScore ? "Active" : "No audit"}</span></p>
                  </div>
                </HolographicCard>
              </div>
            );
          }

          if (id === "interview") {
            return (
              <div key="interview" {...dragProps} className={containerClassName}>
                <HolographicCard glowColor="rgba(168, 85, 247, 0.25)" className="p-5 flex flex-col justify-between h-full" onClick={() => onSelectTab("interview")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase flex items-center">
                      <GripVertical className="w-3.5 h-3.5 mr-1 text-gray-500 cursor-grab" />
                      Interview Rating
                    </span>
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-extrabold font-display text-white">{interviewScore}</span>
                      <span className="text-[10px] text-gray-500 font-mono">/100</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Simulations: <span className="text-purple-400 font-semibold">{interviewScore ? "Done" : "None"}</span></p>
                  </div>
                </HolographicCard>
              </div>
            );
          }

          if (id === "saved") {
            return (
              <div key="saved" {...dragProps} className={containerClassName}>
                <HolographicCard glowColor="rgba(236, 72, 153, 0.25)" className="p-5 flex flex-col justify-between h-full" onClick={() => onSelectTab("saved-jobs")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase flex items-center">
                      <GripVertical className="w-3.5 h-3.5 mr-1 text-gray-500 cursor-grab" />
                      Saved Openings
                    </span>
                    <Heart className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold font-display text-white">{savedJobsCount}</span>
                    <p className="text-[10px] text-gray-400 mt-1">All postings: <span className="text-pink-400 font-semibold">{jobsCount}</span></p>
                  </div>
                </HolographicCard>
              </div>
            );
          }

          if (id === "applied") {
            return (
              <div key="applied" {...dragProps} className={containerClassName}>
                <HolographicCard glowColor="rgba(16, 185, 129, 0.25)" className="p-5 flex flex-col justify-between h-full" onClick={() => onSelectTab("applied-jobs")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase flex items-center">
                      <GripVertical className="w-3.5 h-3.5 mr-1 text-gray-500 cursor-grab" />
                      Applications
                    </span>
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold font-display text-white">{applications.length}</span>
                    <p className="text-[10px] text-gray-400 mt-1">Offers: <span className="text-emerald-400 font-semibold">
                      {applications.filter(a => a.status === "offered").length}
                    </span></p>
                  </div>
                </HolographicCard>
              </div>
            );
          }

          if (id === "talent") {
            return (
              <div key="talent" {...dragProps} className={containerClassName}>
                <HolographicCard glowColor="rgba(20, 184, 166, 0.25)" className="p-5 flex flex-col justify-between h-full bg-gradient-to-br from-indigo-950/20 to-[#0a0f1d]/50" onClick={() => onSelectTab("reports")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-gray-400 uppercase flex items-center">
                      <GripVertical className="w-3.5 h-3.5 mr-1 text-gray-500 cursor-grab" />
                      Talent Rating
                    </span>
                    <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                  </div>
                  <div className="mt-4">
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
            );
          }

          return null;
        })}
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
