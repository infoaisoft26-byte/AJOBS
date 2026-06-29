import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, TrendingUp, Award, BookOpen, Briefcase, GraduationCap, 
  CheckCircle, FileText, X, Search, Send, RefreshCw, Play, Check, 
  Activity, Plus, Trash, Eye, Edit, Download, ChevronRight, Calendar, 
  DollarSign, AlertCircle, ThumbsUp, Save, Clock, ChevronDown, User, Heart, Star
} from "lucide-react";
import { db } from "../firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, Timestamp, orderBy, limit 
} from "firebase/firestore";

interface CareerCenterProps {
  userId: string;
  userName: string;
  profile: any;
  triggerNotification: (title: string, message: string, type: string) => void;
  onSelectTab: (tab: string) => void;
}

export default function CandidateCareerCenter({ 
  userId, 
  userName, 
  profile, 
  triggerNotification,
  onSelectTab 
}: CareerCenterProps) {
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "coach" | "predictor" | "resume" | "cover-letter" | "learning">("dashboard");
  const [loading, setLoading] = useState(false);

  // --- STATE FOR MODULES ---
  // Dashboard Metrics
  const [dashboardMetrics, setDashboardMetrics] = useState({
    careerHealthScore: 82,
    resumeScore: profile?.resumeScore || 75,
    interviewScore: profile?.aiInterviewScore || 68,
    skillGrowth: 65,
    applicationSuccessRate: 40,
    learningProgress: 55,
    achievements: [
      { id: "a1", title: "ATS Optimizer", desc: "Achieved over 80 points on resume ATS scan", date: "June 2026", icon: CheckCircle },
      { id: "a2", title: "Interview Ready", desc: "Completed first AI mock interview simulation", date: "May 2026", icon: Award },
    ]
  });

  // Career Coach
  const [coachGoal, setCoachGoal] = useState("");
  const [coachTargetRole, setCoachTargetRole] = useState("Senior Frontend Engineer");
  const [coachResponse, setCoachResponse] = useState<any>(null);
  const [dailyTip, setDailyTip] = useState("");
  const [savedGoals, setSavedGoals] = useState<any[]>([]);

  // Success Predictor
  const [predTitle, setPredTitle] = useState("");
  const [predCompany, setPredCompany] = useState("");
  const [predDescription, setPredDescription] = useState("");
  const [predSalary, setPredSalary] = useState("");
  const [predExperience, setPredExperience] = useState("");
  const [predSkills, setPredSkills] = useState("");
  const [predictorResult, setPredictorResult] = useState<any>(null);
  const [savedPredictions, setSavedPredictions] = useState<any[]>([]);

  // Resume Builder
  const [selectedTemplateRole, setSelectedTemplateRole] = useState("IT");
  const [resumeData, setResumeData] = useState({
    fullName: userName || "Aryan Sharma",
    email: profile?.email || "infoaisoft26@gmail.com",
    phone: "+91 98765 43210",
    summary: "Dedicated professional targeting rapid architectural advancements, leveraging comprehensive technology paradigms and modern frameworks.",
    skills: profile?.skills?.join(", ") || "React, TypeScript, Tailwind CSS, Node.js",
    experience: "Senior Web Developer at TechLabs (2024 - Present)\n- Led front-end migrations to Vite, speeding up compile times by 40%.\n- Constructed scalable cloud synchronizations.",
    education: "B.Tech in Computer Science, DTU (2024)"
  });
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  // Cover Letter
  const [clCompany, setClCompany] = useState("");
  const [clPosition, setClPosition] = useState("");
  const [clDescription, setClDescription] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState<any>(null);
  const [savedCoverLetters, setSavedCoverLetters] = useState<any[]>([]);

  // Learning Center
  const [learningGoal, setLearningGoal] = useState("Full Stack Developer");
  const [learningPathData, setLearningPathData] = useState<any>(null);
  const [savedLearningPaths, setSavedLearningPaths] = useState<any[]>([]);

  // --- PERSISTENCE LOADER (FIRESTORE) ---
  useEffect(() => {
    fetchFirestoreData();
    generateDailyTip();
  }, [userId]);

  const fetchFirestoreData = async () => {
    try {
      // 1. Load career goals
      const qGoals = query(collection(db, "career_goals"), where("userId", "==", userId));
      const snapGoals = await getDocs(qGoals);
      const listGoals = snapGoals.docs.map(d => ({ id: d.id, ...d.data() }));
      setSavedGoals(listGoals);
      if (listGoals.length > 0) {
        const active: any = listGoals[0];
        setCoachTargetRole(active.targetRole || "Senior Frontend Engineer");
      }

      // 2. Load success predictions
      const qPred = query(collection(db, "success_predictions"), where("userId", "==", userId), orderBy("createdAt", "desc"));
      const snapPred = await getDocs(qPred);
      setSavedPredictions(snapPred.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Load cover letters
      const qCl = query(collection(db, "cover_letters"), where("userId", "==", userId), orderBy("createdAt", "desc"));
      const snapCl = await getDocs(qCl);
      setSavedCoverLetters(snapCl.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Load resume templates
      const qRes = query(collection(db, "resume_templates"), where("userId", "==", userId), orderBy("createdAt", "desc"));
      const snapRes = await getDocs(qRes);
      setSavedResumes(snapRes.docs.map(d => ({ id: d.id, ...d.data() })));

      // 5. Load learning paths
      const qLp = query(collection(db, "learning_paths"), where("userId", "==", userId), orderBy("createdAt", "desc"));
      const snapLp = await getDocs(qLp);
      setSavedLearningPaths(snapLp.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Firestore loading error:", err);
    }
  };

  const generateDailyTip = () => {
    const tips = [
      "ATS Compatibility Tip: Avoid placing critical email or phone numbers inside visual headers. ATS parsers scan documents linearly.",
      "Interview Success Blueprint: Frame your technical answers using the STAR method (Situation, Task, Action, Result). Highlight quantitative statistics.",
      "Skill Strategy: Learning React 19? Focus on Server Actions and the new 'use' hook for asynchronous asset rendering.",
      "Salary Negotiation Principle: Never state a target CTC first. Prompt the recruiter to describe the budget range designated for the role tier.",
      "ATS Keyword optimization: Cluster your technology competencies clearly in headers labeled 'Languages', 'Frameworks', or 'Databases'.",
    ];
    const randomIndex = Math.floor(Math.random() * tips.length);
    setDailyTip(tips[randomIndex]);
  };

  // --- SUB-MODULE 1: AI CAREER COACH ---
  const handleCoachGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachTargetRole.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/ai-career-coach-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: `Analyze career switch roadmap and goals for transitioning into: "${coachTargetRole}". Additional Context: ${coachGoal}`
        })
      });
      const data = await response.json();
      setCoachResponse(data);

      // Save goal to firestore
      const newGoal = {
        userId,
        targetRole: coachTargetRole,
        details: coachGoal,
        expectedSalary: data.expectedSalaryRange || "₹18,00,000 - ₹25,00,000",
        roadmap: data.learningPath || [],
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "career_goals"), newGoal);
      fetchFirestoreData();
      triggerNotification("Goal Configured", `Successfully designed career strategic plan for ${coachTargetRole}.`, "success");
    } catch (err) {
      console.error("Coach roadmap error:", err);
      triggerNotification("Generation Issue", "Could not synchronize roadmap with our premium database.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- SUB-MODULE 2: AI SUCCESS PREDICTOR ---
  const handlePredictSuccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predTitle.trim()) {
      triggerNotification("Input Error", "Please provide a target Job Title to predict.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/predict-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: profile?.resumeText || resumeData.summary + " " + resumeData.skills + " " + resumeData.experience,
          jobTitle: predTitle,
          companyName: predCompany,
          jobDescription: predDescription,
          salary: predSalary,
          experienceRequired: predExperience,
          skillsRequired: predSkills ? predSkills.split(",").map(s => s.trim()) : []
        })
      });
      const data = await response.json();
      setPredictorResult(data);

      // Save to firestore success_predictions
      await addDoc(collection(db, "success_predictions"), {
        userId,
        jobTitle: predTitle,
        companyName: predCompany || "Target Company",
        probability: data.selectionProbability || 75,
        matchTier: data.matchTier || "Good Match",
        resumeMatch: data.resumeMatch || 80,
        skillMatch: data.skillMatch || 75,
        interviewReadiness: data.interviewReadiness || 80,
        missingSkills: data.missingSkills || [],
        suggestions: data.suggestions || [],
        createdAt: new Date().toISOString()
      });

      // Update dashboard metrics
      setDashboardMetrics(prev => ({
        ...prev,
        careerHealthScore: Math.round((data.selectionProbability + prev.careerHealthScore) / 2)
      }));

      fetchFirestoreData();
      triggerNotification("Success Prediction Stored", `Analyzed probability for ${predTitle}. Status is ${data.matchTier}.`, "success");
    } catch (err) {
      console.error("Predictor error:", err);
      triggerNotification("Server Error", "Could not execute predictor model.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- SUB-MODULE 3: AI RESUME BUILDER ---
  const handleLoadTemplate = () => {
    const templates: Record<string, any> = {
      IT: {
        summary: "Premium Senior Full Stack Developer specializing in TypeScript, Node.js and real-time database locks. Proven ability to scale cloud services with zero runtime failure metrics.",
        skills: "React, TypeScript, Vite, Tailwind CSS, Express, Firestore, Node.js, AWS, Kubernetes, Redis",
        experience: "Lead Systems Architect - Apex Cloud Tech (2024 - Present)\n- Re-architected container routes boosting response speeds by 35%.\n- Guided cross-functional developers.\nSoftware Engineer - Cloud Labs (2022 - 2024)\n- Integrated automated telemetry systems.",
        education: "B.Tech in Computer Science, DTU (2024)"
      },
      Sales: {
        summary: "High-performing Enterprise Sales Manager with 5+ years driving ₹40L+ annual contract values. Expert in client retention, pipeline scaling, and automated CRM tracking tools.",
        skills: "B2B Sales, CRM Systems, Pipeline Optimization, Deal Negotiation, Client Retention, Strategic Partnerships",
        experience: "Enterprise Account Executive - Growth Engine Corp (2024 - Present)\n- Scaled enterprise pipelines boosting quarterly sales conversions by 28%.\n- Managed high-value tech accounts.\nSenior Sales Specialist - TargetSolutions (2021 - 2023)\n- Exceeded annual target quota by 140% consistently.",
        education: "MBA in Marketing & Sales, IIM Bangalore"
      },
      Finance: {
        summary: "Diligent Finance and Treasury Analyst specializing in corporate budgeting, investment risk indices, and strict regulatory compliance audits.",
        skills: "Corporate Finance, Financial Modeling, Risk Analytics, GAAP Compliance, Forecasting, Advanced Excel",
        experience: "Lead Financial Consultant - Vista Capital (2024 - Present)\n- Engineered advanced forecasting models saving ₹12L in unnecessary tax allocations.\n- Audited treasury asset values.\nFinance Analyst - Wealth Partners (2022 - 2024)\n- Supervised corporate accounting pipelines.",
        education: "Chartered Accountant (CA) - ICAI India"
      },
      HR: {
        summary: "Empathetic Human Resources Manager focusing on talent acquisition pipeline designs, employee lifecycle management, and culture optimization indexes.",
        skills: "Talent Acquisition, Employee Relations, Policy Architecture, Conflict Resolution, HRIS Tools, Performance Coaching",
        experience: "HR Director - Innovations Ltd (2024 - Present)\n- Reduced candidate attrition by 18% via adaptive wellness programs.\n- Coordinated global talent hiring across 4 countries.\nHR Associate - CoreTech (2022 - 2024)\n- Managed automated screening tool setups.",
        education: "MA in Human Resource Management, TISS Mumbai"
      },
      Marketing: {
        summary: "Data-driven Growth Marketing lead specialized in performance advertising channels, SEO rankings, and viral content campaign telemetry.",
        skills: "Performance Marketing, SEO Analytics, Content Strategy, Google Ads, Campaign Telemetry, Conversion Rate Optimization (CRO)",
        experience: "Marketing Strategist - RetailFlow (2024 - Present)\n- Engineered multi-channel ad plans achieving 4.2x ROAS metrics.\n- Quadrupled organic landing page traffic within 5 months.\nGrowth Specialist - ClickMedia (2021 - 2023)\n- Automated email marketing drips.",
        education: "B.A. in Digital Media, Symbiosis International"
      },
      Banking: {
        summary: "Professional Retail Banking Officer with deep credentials in risk management, high-volume cash vaults audits, and retail loan underwriting.",
        skills: "KYC/AML Compliance, Credit Appraisal, Retail Loans, Portfolio Management, High-Net-Worth Client Relations",
        experience: "Senior Branch Officer - Capital Bank (2023 - Present)\n- Sanctioned and analyzed home/business credit appraisals totaling ₹8Cr+ with zero defaults.\n- Scaled branch portfolio asset metrics.\nBanking Analyst - Trust Mutual (2021 - 2023)\n- Handled high-net-worth investments.",
        education: "Bachelor of Commerce (Honours), Shri Ram College of Commerce"
      },
      BPO: {
        summary: "Customer Experience Team Leader with 4+ years of expertise managing inbound/outbound customer satisfaction metrics (CSAT) and technical troubleshooting services.",
        skills: "Customer Support Engineering, CSAT Optimization, Team Leadership, Technical Troubleshooting, SLA Management",
        experience: "Inbound Support Supervisor - global Connect (2024 - Present)\n- Managed 15 support professionals maintaining a peak 94% CSAT index.\n- Cut support ticket escalation wait cycles by 30%.\nCustomer Associate - TeleSupport India (2022 - 2024)\n- Handled high-priority technical escalations.",
        education: "Bachelor of Science, Delhi University"
      }
    };

    const selected = templates[selectedTemplateRole] || templates.IT;
    setResumeData(prev => ({
      ...prev,
      summary: selected.summary,
      skills: selected.skills,
      experience: selected.experience,
      education: selected.education
    }));
    triggerNotification("Template Loaded", `Injected ${selectedTemplateRole} ATS professional template metrics.`, "success");
  };

  const handleSaveResume = async () => {
    try {
      const dataToSave = {
        userId,
        templateType: selectedTemplateRole,
        ...resumeData,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "resume_templates"), dataToSave);
      setSelectedResumeId(docRef.id);
      
      // Update Dashboard Resume Score
      setDashboardMetrics(prev => ({ ...prev, resumeScore: 88 }));
      
      fetchFirestoreData();
      triggerNotification("Resume Version Stored", "Successfully saved this resume version history in Firestore.", "success");
    } catch (err) {
      console.error("Resume save issue:", err);
      triggerNotification("Database Sync Issue", "Could not save resume details.", "error");
    }
  };

  const handleDeleteResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "resume_templates", id));
      if (selectedResumeId === id) setSelectedResumeId(null);
      fetchFirestoreData();
      triggerNotification("Resume Deleted", "Successfully removed resume version from archive.", "success");
    } catch (err) {
      console.error("Resume deletion error:", err);
    }
  };

  const handlePrintResume = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      triggerNotification("Browser Blocked", "Please allow popups to preview/print the PDF copy.", "error");
      return;
    }
    
    const html = `
      <html>
        <head>
          <title>ATS Professional Resume - ${resumeData.fullName}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { font-family: 'Inter', sans-serif; color: #000; background: #fff; padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="bg-gray-50 p-8 text-gray-800">
          <div class="max-w-4xl mx-auto bg-white p-12 shadow-lg border border-gray-200 rounded">
            <div class="no-print mb-6 text-right">
              <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700">
                🖨️ Direct PDF Print / Export
              </button>
            </div>
            <div class="border-b-2 border-gray-900 pb-4 text-center">
              <h1 class="text-3xl font-bold uppercase tracking-tight text-gray-900">${resumeData.fullName}</h1>
              <p class="text-xs text-gray-500 mt-1">${resumeData.email} | ${resumeData.phone}</p>
            </div>
            
            <div class="mt-6 space-y-6">
              <div>
                <h2 class="text-xs font-bold uppercase tracking-widest text-indigo-700 border-b border-gray-300 pb-1">Professional Executive Summary</h2>
                <p class="text-xs text-gray-700 mt-2 leading-relaxed">${resumeData.summary}</p>
              </div>

              <div>
                <h2 class="text-xs font-bold uppercase tracking-widest text-indigo-700 border-b border-gray-300 pb-1">Core Technology & Professional Competencies</h2>
                <div class="flex flex-wrap gap-2 mt-2">
                  ${resumeData.skills.split(",").map(s => `<span class="bg-gray-100 text-gray-800 text-[10px] px-2 py-0.5 rounded border border-gray-200">${s.trim()}</span>`).join("")}
                </div>
              </div>

              <div>
                <h2 class="text-xs font-bold uppercase tracking-widest text-indigo-700 border-b border-gray-300 pb-1">Professional Experience</h2>
                <pre class="text-xs text-gray-700 mt-2 leading-relaxed font-sans whitespace-pre-line">${resumeData.experience}</pre>
              </div>

              <div>
                <h2 class="text-xs font-bold uppercase tracking-widest text-indigo-700 border-b border-gray-300 pb-1">Education Credentials</h2>
                <p class="text-xs text-gray-700 mt-2">${resumeData.education}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- SUB-MODULE 4: AI COVER LETTER GENERATOR ---
  const handleGenerateCoverLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clPosition.trim() || !clCompany.trim()) {
      triggerNotification("Information Missing", "Job position and target company are required.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: profile?.resumeText || resumeData.summary + " " + resumeData.skills,
          jobDescription: clDescription,
          companyName: clCompany,
          position: clPosition
        })
      });
      const data = await response.json();
      setCoverLetterResult(data);

      // Save to firestore
      await addDoc(collection(db, "cover_letters"), {
        userId,
        companyName: clCompany,
        position: clPosition,
        subject: data.subject || "Application",
        letterContent: data.letterContent || "",
        strengthsHighlighted: data.strengthsHighlighted || [],
        createdAt: new Date().toISOString()
      });

      fetchFirestoreData();
      triggerNotification("Letter Generated", `Your Cover Letter for ${clCompany} is ready for export.`, "success");
    } catch (err) {
      console.error("Cover letter issue:", err);
      triggerNotification("Generation failed", "Could not complete cover letter layout.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCoverLetter = () => {
    if (!coverLetterResult) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      triggerNotification("Browser Blocked", "Please allow popups to print/export PDF.", "error");
      return;
    }

    const html = `
      <html>
        <head>
          <title>Executive Cover Letter - ${userName}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gray-50 p-12 text-gray-800 font-serif">
          <div class="max-w-3xl mx-auto bg-white p-12 shadow-md border border-gray-200">
            <div class="no-print mb-6 text-right">
              <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 text-white rounded font-sans font-bold text-xs hover:bg-indigo-700">
                🖨️ Export as PDF
              </button>
            </div>
            <div class="border-b border-gray-300 pb-4 mb-6 font-sans">
              <h1 class="text-2xl font-bold uppercase tracking-wide text-gray-900">${userName || "Aryan Sharma"}</h1>
              <p class="text-xs text-gray-500">${profile?.email || "infoaisoft26@gmail.com"}</p>
            </div>

            <div class="space-y-4 text-xs leading-relaxed">
              <p class="font-bold font-sans">${coverLetterResult.subject}</p>
              <div class="whitespace-pre-line text-gray-700 font-serif leading-relaxed">${coverLetterResult.letterContent}</div>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- SUB-MODULE 5: AI LEARNING CENTER ---
  const handleGenerateLearningPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learningGoal.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/get-learning-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerGoal: learningGoal,
          currentRole: profile?.designation || "Web Engineer",
          skills: profile?.skills || []
        })
      });
      const data = await response.json();
      setLearningPathData(data);

      // Save learning path to Firestore
      await addDoc(collection(db, "learning_paths"), {
        userId,
        careerGoal: learningGoal,
        courses: data.courses || [],
        certifications: data.certifications || [],
        roadmap: data.roadmap || [],
        interviewPrep: data.interviewPrep || [],
        createdAt: new Date().toISOString()
      });

      // Update dashboard
      setDashboardMetrics(prev => ({
        ...prev,
        learningProgress: 75
      }));

      fetchFirestoreData();
      triggerNotification("Learning Plan Ready", `Successfully calculated adaptive course curriculum to master ${learningGoal}.`, "success");
    } catch (err) {
      console.error("Learning path issue:", err);
      triggerNotification("Model failed", "Could not design learning roadmap structure.", "error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="ai-career-intelligence-center">
      
      {/* 1. SECTION HEADER */}
      <div className="glass p-6 rounded-2xl border border-white/5 bg-gradient-to-r from-indigo-950/20 via-purple-950/10 to-neutral-950 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/15 border border-indigo-400/30 rounded text-[10px] font-bold text-indigo-300 font-mono uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>AI Powered System v2.5</span>
          </div>
          <h2 className="font-display font-black text-2xl text-white tracking-tight flex items-center gap-2">
            AI Career Intelligence Center
          </h2>
          <p className="text-xs text-gray-400 max-w-xl">
            Navigate the global tech landscape with advanced success predictions, tailored ATS templates, high-fidelity cover letters, and learning path suggestions.
          </p>
        </div>

        {/* Dynamic Tip Bubble */}
        <div className="glass p-3 rounded-xl border border-white/10 bg-[#08080c] max-w-sm flex items-start gap-2.5 z-10 shadow-lg">
          <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase text-purple-400 tracking-wider">Career Advisor Insight</span>
            <p className="text-[10px] text-gray-300 italic leading-relaxed">{dailyTip || "Keep resume files formatted cleanly to boost scans."}</p>
          </div>
        </div>

        {/* Decorative Grid Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
      </div>

      {/* 2. TABBED NAVIGATION MENU */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveSubTab("dashboard")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "dashboard"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
              : "bg-white/5 border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5 inline mr-1.5" />
          <span>Dashboard Insights</span>
        </button>

        <button
          onClick={() => setActiveSubTab("coach")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "coach"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
              : "bg-white/5 border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
          <span>Personal Coach</span>
        </button>

        <button
          onClick={() => setActiveSubTab("predictor")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "predictor"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
              : "bg-white/5 border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
          <span>Success Predictor</span>
        </button>

        <button
          onClick={() => setActiveSubTab("resume")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "resume"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
              : "bg-white/5 border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />
          <span>ATS Resume templates</span>
        </button>

        <button
          onClick={() => setActiveSubTab("cover-letter")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "cover-letter"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
              : "bg-white/5 border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Award className="w-3.5 h-3.5 inline mr-1.5" />
          <span>Cover Letter Gen</span>
        </button>

        <button
          onClick={() => setActiveSubTab("learning")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "learning"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
              : "bg-white/5 border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />
          <span>Learning Path</span>
        </button>
      </div>

      {/* 3. DYNAMIC CONTENT VIEWS */}
      
      {/* MODULE 6: PERSONAL DASHBOARD */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6">
          {/* Progress Rings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Career Health Score</span>
                <h4 className="font-display font-black text-2xl text-white">{dashboardMetrics.careerHealthScore}%</h4>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Excellent profile setup</span>
                </p>
              </div>
              
              {/* Dynamic SVG Ring */}
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                  <circle cx="32" cy="32" r="28" stroke="#6366f1" strokeWidth="4" fill="transparent" 
                    strokeDasharray={175} strokeDashoffset={175 - (175 * dashboardMetrics.careerHealthScore) / 100} 
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-300">{dashboardMetrics.careerHealthScore}%</span>
              </div>
            </div>

            <div className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Resume Score</span>
                <h4 className="font-display font-black text-2xl text-white">{dashboardMetrics.resumeScore} / 100</h4>
                <p className="text-[10px] text-indigo-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Targeting 85+ score</span>
                </p>
              </div>

              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                  <circle cx="32" cy="32" r="28" stroke="#a855f7" strokeWidth="4" fill="transparent" 
                    strokeDasharray={175} strokeDashoffset={175 - (175 * dashboardMetrics.resumeScore) / 100} 
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-300">{dashboardMetrics.resumeScore}</span>
              </div>
            </div>

            <div className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Interview Score</span>
                <h4 className="font-display font-black text-2xl text-white">{dashboardMetrics.interviewScore}%</h4>
                <p className="text-[10px] text-purple-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Interactive simulator feedback</span>
                </p>
              </div>

              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                  <circle cx="32" cy="32" r="28" stroke="#ec4899" strokeWidth="4" fill="transparent" 
                    strokeDasharray={175} strokeDashoffset={175 - (175 * dashboardMetrics.interviewScore) / 100} 
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-300">{dashboardMetrics.interviewScore}%</span>
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Skill growth & progression */}
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 md:col-span-2">
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Skill Progression & Activity Success</span>
              </h4>
              
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-gray-300 mb-1">
                    <span>ATS Keyword Match Progress</span>
                    <span className="font-mono text-indigo-400">{dashboardMetrics.skillGrowth}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${dashboardMetrics.skillGrowth}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-300 mb-1">
                    <span>AI Interview Readiness Index</span>
                    <span className="font-mono text-purple-400">{dashboardMetrics.interviewScore}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${dashboardMetrics.interviewScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-300 mb-1">
                    <span>Application Success Ratio</span>
                    <span className="font-mono text-green-400">{dashboardMetrics.applicationSuccessRate}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${dashboardMetrics.applicationSuccessRate}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-300 mb-1">
                    <span>Learning Path Milestones</span>
                    <span className="font-mono text-pink-400">{dashboardMetrics.learningProgress}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${dashboardMetrics.learningProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements and badges */}
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />
                <span>Earned Career Badges</span>
              </h4>

              <div className="space-y-3">
                {dashboardMetrics.achievements.map((a) => (
                  <div key={a.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex gap-2.5 items-start">
                    <div className="p-1.5 bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 rounded-lg">
                      <Star className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-bold text-white">{a.title}</h5>
                      <p className="text-[10px] text-gray-400">{a.desc}</p>
                      <span className="text-[8px] text-gray-500 font-mono block pt-0.5">{a.date}</span>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => setActiveSubTab("predictor")}
                  className="w-full py-1.5 border border-white/10 hover:border-indigo-500/30 text-gray-400 hover:text-white transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer text-center block"
                >
                  Perform Success Analysis to unlock more
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODULE 1: AI CAREER COACH */}
      {activeSubTab === "coach" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 md:col-span-1">
            <h4 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Configure Career Goal</span>
            </h4>
            
            <form onSubmit={handleCoachGoalSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Target Position/Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead React Architect, VP of Engineering"
                  value={coachTargetRole}
                  onChange={e => setCoachTargetRole(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Additional Context (Switch plan)</label>
                <textarea
                  rows={4}
                  placeholder="e.g. 'I currently have 3 years of experience in JavaScript and want to pivot to Cloud System Architectures. Recommend a step-by-step roadmap and certification track.'"
                  value={coachGoal}
                  onChange={e => setCoachGoal(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-gray-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Calculating Roadmap...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI Career Roadmap</span>
                  </>
                )}
              </button>
            </form>

            {savedGoals.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Active Target Goals ({savedGoals.length})</span>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar pr-1">
                  {savedGoals.map((g, index) => (
                    <div key={g.id || index} className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">{g.targetRole}</span>
                        <span className="text-[9px] text-gray-400">Est. Salary: {g.expectedSalary}</span>
                      </div>
                      <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 bg-[#08080c] md:col-span-2 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">AI Career Strategic Advisor Analysis</h4>
                <p className="text-[10px] text-gray-400">Deep analysis based on standard ATS parameters and hiring expectations.</p>
              </div>
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>

            {coachResponse ? (
              <div className="space-y-6 text-xs animate-in fade-in duration-300">
                
                {/* Conversational text */}
                <div className="prose prose-invert text-xs text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                  <h5 className="font-bold text-white mb-2">Executive Advisor Briefing</h5>
                  <div className="whitespace-pre-line">{coachResponse.responseText}</div>
                </div>

                {/* Roadmaps Timeline */}
                <div className="space-y-3">
                  <h5 className="font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span>Structured Learning & Promotion Roadmap</span>
                  </h5>
                  
                  <div className="relative border-l-2 border-indigo-500/30 pl-4 ml-2 space-y-4">
                    {coachResponse.learningPath?.map((step: any, index: number) => (
                      <div key={index} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-neutral-950 shadow-md shadow-indigo-500" />
                        <div className="space-y-0.5">
                          <span className="text-indigo-400 font-mono text-[10px] font-bold">{step.step}</span>
                          <p className="text-gray-300">{step.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badges details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block">Recommended Certifications</span>
                    <ul className="space-y-1.5">
                      {coachResponse.certificationSuggestions?.map((cert: string, index: number) => (
                        <li key={index} className="flex items-center gap-1.5 text-gray-300">
                          <Award className="w-3.5 h-3.5 text-yellow-500" />
                          <span>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass p-4 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block">Expected Salary Benchmarks</span>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-white font-bold block">{coachResponse.expectedSalaryRange}</span>
                        <span className="text-[9px] text-gray-400">Based on global active telemetry data</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-xs text-gray-500 italic space-y-3">
                <Sparkles className="w-8 h-8 text-indigo-500/45 animate-pulse" />
                <p>Submit a target position to construct your personalized promotion roadmap and industry recommendations.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 2: AI SUCCESS PREDICTOR */}
      {activeSubTab === "predictor" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 md:col-span-1">
            <h4 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Target Role Audit</span>
            </h4>

            <form onSubmit={handlePredictSuccess} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Frontend Developer"
                  value={predTitle}
                  onChange={e => setPredTitle(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Google, Microsoft, Startup"
                  value={predCompany}
                  onChange={e => setPredCompany(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. React, TypeScript, GraphQL, Webpack"
                  value={predSkills}
                  onChange={e => setPredSkills(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Salary (CTC)</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹20L"
                    value={predSalary}
                    onChange={e => setPredSalary(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Experience (years)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 years"
                    value={predExperience}
                    onChange={e => setPredExperience(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Job Description Context</label>
                <textarea
                  rows={3}
                  placeholder="Paste details of the job post here to increase match accuracy..."
                  value={predDescription}
                  onChange={e => setPredDescription(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-gray-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Predicting Selection Rate...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Calculate Selection Probability</span>
                  </>
                )}
              </button>
            </form>

            {savedPredictions.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Prediction Logs</span>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar pr-1">
                  {savedPredictions.map((p) => (
                    <div key={p.id} className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white block">{p.jobTitle}</span>
                        <span className="text-[10px] text-gray-400">{p.companyName}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        p.probability >= 85 ? "bg-green-500/10 text-green-300" :
                        p.probability >= 70 ? "bg-indigo-500/10 text-indigo-300" :
                        "bg-yellow-500/10 text-yellow-300"
                      }`}>{p.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 bg-[#08080c] md:col-span-2 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">ATS Probability Success Matrix</h4>
                <p className="text-[10px] text-gray-400">Algorithmic alignment prediction mapping qualification versus selected job parameters.</p>
              </div>
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>

            {predictorResult ? (
              <div className="space-y-6 animate-in fade-in duration-300 text-xs">
                
                {/* Match Banner and Badge */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/10 justify-between">
                  <div className="flex items-center gap-4">
                    {/* Ring */}
                    <div className="relative w-16 h-16 shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="4" fill="transparent" 
                          strokeDasharray={175} strokeDashoffset={175 - (175 * predictorResult.selectionProbability) / 100} 
                          strokeLinecap="round" className="transition-all duration-1000" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-300">{predictorResult.selectionProbability}%</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Selection Probability</span>
                      <h5 className="text-sm font-bold text-white">Targeting: {predTitle || "Software Engineer"}</h5>
                      <p className="text-gray-400">Match score calculates baseline experience, interview rating, and core tech stacks.</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-center">
                    <span className={`text-xs font-black uppercase px-4 py-2 rounded-xl block border ${
                      predictorResult.matchTier === "Excellent Match" ? "bg-green-500/10 text-green-300 border-green-500/20 shadow-md shadow-green-500/5 animate-pulse" :
                      predictorResult.matchTier === "Good Match" ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" :
                      predictorResult.matchTier === "Average Match" ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20" :
                      "bg-red-500/10 text-red-300 border-red-500/20"
                    }`}>
                      {predictorResult.matchTier || "Good Match"}
                    </span>
                  </div>
                </div>

                {/* Grid of Scores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-[#0a0a0f] border border-white/5 rounded-xl text-center">
                    <span className="text-[9px] text-gray-400 block mb-1">Resume score</span>
                    <span className="text-sm font-bold text-white">{predictorResult.resumeMatch}%</span>
                  </div>

                  <div className="p-3 bg-[#0a0a0f] border border-white/5 rounded-xl text-center">
                    <span className="text-[9px] text-gray-400 block mb-1">Skill alignment</span>
                    <span className="text-sm font-bold text-white">{predictorResult.skillMatch}%</span>
                  </div>

                  <div className="p-3 bg-[#0a0a0f] border border-white/5 rounded-xl text-center">
                    <span className="text-[9px] text-gray-400 block mb-1">Interview Readiness</span>
                    <span className="text-sm font-bold text-white">{predictorResult.interviewReadiness}%</span>
                  </div>

                  <div className="p-3 bg-[#0a0a0f] border border-white/5 rounded-xl text-center">
                    <span className="text-[9px] text-gray-400 block mb-1">Salary alignment</span>
                    <span className="text-[10px] font-bold text-indigo-400 block truncate mt-0.5">{predictorResult.salaryFit}</span>
                  </div>
                </div>

                {/* Gaps and suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[10px] text-yellow-500 font-bold uppercase block tracking-wider">Identified Missing Skills & Certifications</span>
                    <ul className="space-y-1.5 text-gray-300">
                      {predictorResult.missingSkills?.map((skill: string, index: number) => (
                        <li key={index} className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                          <span>{skill}</span>
                        </li>
                      ))}
                      {predictorResult.missingCertifications?.map((cert: string, index: number) => (
                        <li key={index} className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-purple-400" />
                          <span>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass p-4 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[10px] text-green-400 font-bold uppercase block tracking-wider">Strategic Recommendations</span>
                    <ul className="space-y-1.5 text-gray-300">
                      {predictorResult.suggestions?.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-1.5 leading-relaxed">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-xs text-gray-500 italic space-y-3">
                <TrendingUp className="w-8 h-8 text-indigo-500/45" />
                <p>Enter job specifications to run our ATS predictor and check your selection readiness probability index.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 3: AI RESUME BUILDER */}
      {activeSubTab === "resume" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 md:col-span-1">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-display font-black text-xs text-white uppercase tracking-wider">
                ATS Settings
              </h4>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Select Template Blueprint</label>
                <div className="flex gap-2">
                  <select
                    value={selectedTemplateRole}
                    onChange={e => setSelectedTemplateRole(e.target.value)}
                    className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="IT">IT & Software Systems</option>
                    <option value="Fresher">Fresher (Generic Tech)</option>
                    <option value="Experienced">Experienced Leader</option>
                    <option value="Sales">Sales & Growth</option>
                    <option value="Finance">Finance & Investment</option>
                    <option value="HR">Human Resources</option>
                    <option value="Marketing">Growth Marketing</option>
                    <option value="Banking">Retail Banking</option>
                    <option value="BPO">BPO Technical Support</option>
                  </select>
                  <button
                    onClick={handleLoadTemplate}
                    className="px-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/25 text-indigo-300 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    Inject
                  </button>
                </div>
              </div>

              {/* Version History */}
              {savedResumes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Saved Version History</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar pr-1">
                    {savedResumes.map((res: any) => (
                      <div
                        key={res.id}
                        onClick={() => {
                          setResumeData({
                            fullName: res.fullName,
                            email: res.email,
                            phone: res.phone,
                            summary: res.summary,
                            skills: res.skills,
                            experience: res.experience,
                            education: res.education
                          });
                          setSelectedResumeId(res.id);
                          triggerNotification("Loaded Draft", `Loaded saved resume draft for ${res.fullName}.`, "info");
                        }}
                        className={`p-2 bg-white/5 hover:bg-white/10 rounded-lg border transition-all cursor-pointer flex justify-between items-center text-[11px] ${
                          selectedResumeId === res.id ? "border-indigo-500/40 bg-indigo-500/5" : "border-white/5"
                        }`}
                      >
                        <span className="font-bold text-white truncate max-w-[120px]">{res.fullName} ({res.templateType})</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleDeleteResume(res.id, e)}
                            className="p-1 hover:text-red-400 text-gray-400 rounded transition-all cursor-pointer"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Core Resume Editor form */}
          <div className="glass p-5 rounded-2xl border border-white/5 bg-[#08080c] md:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">Interactive ATS Form Block</h4>
                <p className="text-[10px] text-gray-400">Fill details inline, then click save version or print as PDF.</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleSaveResume}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={handlePrintResume}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Preview PDF</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Full Name</label>
                <input
                  type="text"
                  value={resumeData.fullName}
                  onChange={e => setResumeData({...resumeData, fullName: e.target.value})}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Email</label>
                <input
                  type="email"
                  value={resumeData.email}
                  onChange={e => setResumeData({...resumeData, email: e.target.value})}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Phone Number</label>
                <input
                  type="text"
                  value={resumeData.phone}
                  onChange={e => setResumeData({...resumeData, phone: e.target.value})}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Core Skills (Comma separated)</label>
                <input
                  type="text"
                  value={resumeData.skills}
                  onChange={e => setResumeData({...resumeData, skills: e.target.value})}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Professional Executive Summary</label>
                <textarea
                  rows={2}
                  value={resumeData.summary}
                  onChange={e => setResumeData({...resumeData, summary: e.target.value})}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Work Experience details (use paragraphs or bullets)</label>
                <textarea
                  rows={5}
                  value={resumeData.experience}
                  onChange={e => setResumeData({...resumeData, experience: e.target.value})}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:border-indigo-500 focus:outline-none resize-y"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Education Credentials</label>
                <input
                  type="text"
                  value={resumeData.education}
                  onChange={e => setResumeData({...resumeData, education: e.target.value})}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: AI COVER LETTER GENERATOR */}
      {activeSubTab === "cover-letter" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 md:col-span-1">
            <h4 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Job parameters</span>
            </h4>

            <form onSubmit={handleGenerateCoverLetter} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Target Position/Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Technical Architect"
                  value={clPosition}
                  onChange={e => setClPosition(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Target Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Innovations Ltd"
                  value={clCompany}
                  onChange={e => setClCompany(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Target Job Description (for custom matching)</label>
                <textarea
                  rows={4}
                  placeholder="Paste details of the job listing description here..."
                  value={clDescription}
                  onChange={e => setClDescription(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none placeholder-gray-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Structuring Letter...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Cover Letter</span>
                  </>
                )}
              </button>
            </form>

            {savedCoverLetters.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/5 text-xs">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Archived Cover Letters</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar pr-1">
                  {savedCoverLetters.map((cl) => (
                    <div
                      key={cl.id}
                      onClick={() => {
                        setCoverLetterResult(cl);
                        setClCompany(cl.companyName);
                        setClPosition(cl.position);
                        triggerNotification("Loaded Letter", `Loaded draft for ${cl.companyName}.`, "info");
                      }}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all cursor-pointer flex justify-between items-center text-[11px]"
                    >
                      <span className="font-bold text-white truncate max-w-[150px]">{cl.position} ({cl.companyName})</span>
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 bg-[#08080c] md:col-span-2 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">Cover Letter Layout Sandbox</h4>
                <p className="text-[10px] text-gray-400">View and fine-tune your generated executive letter draft.</p>
              </div>

              {coverLetterResult && (
                <button
                  onClick={handlePrintCoverLetter}
                  className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Export</span>
                </button>
              )}
            </div>

            {coverLetterResult ? (
              <div className="space-y-6 text-xs animate-in fade-in duration-300">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 font-mono text-[11px] leading-relaxed text-gray-300">
                  <span className="font-bold text-white block border-b border-white/5 pb-1 mb-2">Subject: {coverLetterResult.subject}</span>
                  <textarea
                    rows={12}
                    value={coverLetterResult.letterContent}
                    onChange={e => setCoverLetterResult({...coverLetterResult, letterContent: e.target.value})}
                    className="w-full bg-transparent border-none text-gray-300 text-xs focus:outline-none resize-y leading-relaxed"
                  />
                </div>

                {coverLetterResult.strengthsHighlighted && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-indigo-950/20 rounded-xl border border-indigo-500/10 space-y-1.5">
                      <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">Highlighted Strengths Detected</span>
                      <ul className="space-y-1 text-gray-300">
                        {coverLetterResult.strengthsHighlighted.map((st: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{st}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-purple-950/20 rounded-xl border border-purple-500/10 space-y-1.5">
                      <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider block font-bold">Recruiter Suggestions</span>
                      <ul className="space-y-1 text-gray-300">
                        {coverLetterResult.recruiterSuggestions?.map((sug: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1">
                            <Star className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-xs text-gray-500 italic space-y-3">
                <Award className="w-8 h-8 text-indigo-500/45" />
                <p>Fill target parameters to compile a highly formatted, persuasive cover letter matching executive benchmarks.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 5: AI LEARNING CENTER */}
      {activeSubTab === "learning" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 md:col-span-1">
            <h4 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Target Role Path</span>
            </h4>

            <form onSubmit={handleGenerateLearningPath} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Target Transition Goal</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Devops Architect, Cloud Architect"
                  value={learningGoal}
                  onChange={e => setLearningGoal(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Curriculum...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Calculate Learning Roadmap</span>
                  </>
                )}
              </button>
            </form>

            {savedLearningPaths.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/5 text-xs">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Saved Curriculums</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar pr-1">
                  {savedLearningPaths.map((lp) => (
                    <div
                      key={lp.id}
                      onClick={() => {
                        setLearningPathData(lp);
                        setLearningGoal(lp.careerGoal);
                        triggerNotification("Loaded plan", `Injected learning parameters for ${lp.careerGoal}.`, "info");
                      }}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all cursor-pointer flex justify-between items-center text-[11px]"
                    >
                      <span className="font-bold text-white truncate max-w-[150px]">{lp.careerGoal}</span>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 bg-[#08080c] md:col-span-2 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">Custom Adaptive Curriculum Portal</h4>
                <p className="text-[10px] text-gray-400">Structured courses, suggested cloud certifications, and technical interview preparation topics.</p>
              </div>
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>

            {learningPathData ? (
              <div className="space-y-6 text-xs animate-in fade-in duration-300">
                
                {/* Courses Recommendations Cards */}
                <div className="space-y-3">
                  <h5 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-widest text-[10px] text-indigo-400">
                    <BookOpen className="w-4 h-4" />
                    <span>Recommended Technical Courses</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {learningPathData.courses?.map((course: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-between space-y-2 hover:border-indigo-500/25 transition-all">
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/10 uppercase font-bold">{course.provider || "Platform"}</span>
                          <h6 className="font-bold text-white leading-snug">{course.title}</h6>
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1 border-t border-white/5">
                          <span>⏱️ {course.duration || "12 hrs"}</span>
                          <span>📶 {course.difficulty || "Intermediate"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roadmaps */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h5 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-widest text-[10px] text-purple-400">
                    <Calendar className="w-4 h-4" />
                    <span>Calculated Transition Timeline Milestones</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {learningPathData.roadmap?.map((milestone: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-purple-950/10 border border-purple-500/10 rounded-xl relative">
                        <span className="absolute right-3 top-3 text-[9px] font-mono text-purple-400 font-bold">{milestone.timeline}</span>
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase block">Phase {idx + 1}</span>
                          <h6 className="font-bold text-white leading-tight">{milestone.phase}</h6>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {milestone.topics?.map((topic: string, tIdx: number) => (
                              <span key={tIdx} className="text-[9px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-gray-300">{topic}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interview Prep Qs */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h5 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-widest text-[10px] text-yellow-500">
                    <Star className="w-4 h-4" />
                    <span>High-Frequency Interview Preparation Exercises</span>
                  </h5>

                  <div className="space-y-3">
                    {learningPathData.interviewPrep?.map((prep: any, idx: number) => (
                      <div key={idx} className="p-4 bg-yellow-500/[0.02] border border-yellow-500/10 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-mono text-yellow-400 font-bold uppercase tracking-wider block">Topic: {prep.topic}</span>
                          <span className="bg-yellow-500/10 text-yellow-400 text-[8px] font-mono px-1.5 py-0.5 rounded border border-yellow-500/10 font-bold uppercase">Complex Exercise</span>
                        </div>
                        <h6 className="font-bold text-white text-xs leading-relaxed">Question: "{prep.question}"</h6>
                        <p className="text-[11px] text-gray-400 leading-relaxed italic bg-[#0a0a10] p-2.5 rounded border border-white/5"><strong className="text-yellow-400 font-semibold not-italic">Suggested Answer Framework:</strong> {prep.outline}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-xs text-gray-500 italic space-y-3">
                <BookOpen className="w-8 h-8 text-indigo-500/45" />
                <p>Input target transition goal parameters to load high-frequency courses, roadmap schedules, and complex interview preparation sheets.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
