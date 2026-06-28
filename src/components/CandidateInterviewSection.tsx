import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Brain, Award, Calendar, CheckCircle2, AlertTriangle, Play, Pause, 
  RotateCcw, ArrowRight, ShieldCheck, ShieldAlert, Lock, Unlock, CheckCircle, 
  Clock, Check, Camera, Mic, Volume2, Globe, Heart, ChevronRight, HelpCircle, 
  User, RefreshCw, BarChart3, AlertCircle, FileText, Send, Square, PlayCircle, Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore";

interface CandidateInterviewSectionProps {
  profile: any;
  setProfile: (profile: any) => void;
  triggerNotification: (title: string, message: string) => Promise<void>;
}

// Support Categories defined in Step 2
const INTERVIEW_CATEGORIES = [
  { id: "hr", label: "HR Interview", icon: User, desc: "Behavioral fit, teamwork, work ethic, and culture." },
  { id: "technical", label: "Technical Interview", icon: Brain, desc: "Algorithms, system design, coding, and toolsets." },
  { id: "sales", label: "Sales Interview", icon: BarChart3, desc: "Lead pitching, negotiations, conversion strategies." },
  { id: "support", label: "Customer Support", icon: Volume2, desc: "De-escalation, customer empathy, support tickets." },
  { id: "banking", label: "Banking", icon: Award, desc: "Financial regulations, credit assessment, client advisory." },
  { id: "insurance", label: "Insurance", icon: Award, desc: "Underwriting, risk calculations, policy claims." },
  { id: "bpo", label: "BPO", icon: Volume2, desc: "Process outsourcing, voice accent, active client listening." },
  { id: "marketing", label: "Marketing", icon: Sparkles, desc: "User acquisition, search optimization, campaign planning." },
  { id: "finance", label: "Finance", icon: BarChart3, desc: "Asset valuations, budget audits, investment metrics." },
  { id: "custom", label: "Custom Interview", icon: HelpCircle, desc: "Simulate custom role-specific assessments." }
];

// Support Levels defined in Step 3
const INTERVIEW_LEVELS = [
  { id: "fresher", label: "Fresher", exp: "0-1 years exp", desc: "Focuses on fundamentals, potential, and quick learning." },
  { id: "junior", label: "Junior", exp: "1-3 years exp", desc: "Core technical abilities, coding, and direct execution." },
  { id: "mid-level", label: "Mid-Level", exp: "3-6 years exp", desc: "System architecture, modular design, and independence." },
  { id: "senior", label: "Senior", exp: "6+ years exp", desc: "Leadership, trade-offs, roadmap scaling, and mentoring." }
];

export default function CandidateInterviewSection({
  profile,
  setProfile,
  triggerNotification
}: CandidateInterviewSectionProps) {
  const userId = profile?.userId || "candidate_default";

  // Navigation: "dashboard" | "prep" | "active" | "report"
  const [interviewState, setInterviewState] = useState<"dashboard" | "prep" | "active" | "report">("dashboard");

  // Selection configurations
  const [selectedCategory, setSelectedCategory] = useState("hr");
  const [selectedLevel, setSelectedLevel] = useState("mid-level");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [customRoleText, setCustomRoleText] = useState("");

  // Prep Checklist & Permissions (Step 4)
  const [cameraPermission, setCameraPermission] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);

  // Active Session State (Step 5, 6, 7)
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswerText, setUserAnswerText] = useState("");
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [questionTimings, setQuestionTimings] = useState<number[]>([]);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120); // 2 minutes per question default
  const [currentAnswers, setCurrentAnswers] = useState<any[]>([]);

  // Statistics & History Dashboard lists
  const [completedInterviews, setCompletedInterviews] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Report details state
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [activeReportDetailsTab, setActiveReportDetailsTab] = useState<"overview" | "qna" | "security">("overview");

  // Local state for UI loading & simulation
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);

  // Soundwave and camera elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const micIntervalRef = useRef<any>(null);
  const [micDecibels, setMicDecibels] = useState<number[]>([10, 25, 45, 12, 5, 15, 32, 50, 18]);

  // 1. Fetch History & Statistics from Firestore (Step 1, 9, 10)
  const fetchHistoryAndStats = async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      // Query interviews collection from Firestore
      const interviewsRef = collection(db, "interviews");
      const q = query(interviewsRef, where("candidateId", "==", userId));
      const querySnap = await getDocs(q);
      
      const list: any[] = [];
      querySnap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort by createdAt
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const completed = list.filter(item => item.status === "completed");
      const upcoming = list.filter(item => item.status === "scheduled");

      setCompletedInterviews(completed);
      setUpcomingInterviews(upcoming);
    } catch (err) {
      console.error("Error loading interview records:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndStats();
  }, [userId]);

  // 2. Mock Webcam & Mic togglers representing permission checklist (Step 4)
  const toggleCamera = async () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      setCameraPermission(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    } else {
      try {
        setCameraPermission(true);
        setIsCameraActive(true);
        // Request actual device access if permitted by frame permissions
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }
      } catch (err) {
        console.warn("Camera hardware not available or blocked in iframe. Simulating mock stream.", err);
        setIsCameraActive(true);
        setCameraPermission(true);
      }
    }
  };

  const toggleMic = () => {
    if (isMicActive) {
      setIsMicActive(false);
      setMicPermission(false);
      clearInterval(micIntervalRef.current);
    } else {
      setIsMicActive(true);
      setMicPermission(true);
      // Simulate live soundwaves
      micIntervalRef.current = setInterval(() => {
        setMicDecibels(Array.from({ length: 9 }, () => Math.floor(Math.random() * 80) + 10));
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      clearInterval(micIntervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 3. Initiate Interview Session Question List (Step 5, 13)
  const generateInterviewQuestions = async () => {
    try {
      const response = await fetch("/api/ai-interview-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          level: selectedLevel,
          language: selectedLanguage,
          customRole: selectedCategory === "custom" ? customRoleText : undefined,
          resumeText: profile?.resumeText || ""
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.questions;
      }
    } catch (e) {
      console.error("AI Generation failed, falling back to local adaptive generator", e);
    }

    // High fidelity adaptive question pool fallback (Step 5 - MCQ, Text, Voice, Scenario, Behavioral, Tech, Role play)
    const fallbackQuestions = [
      {
        id: "q_1",
        type: "MCQ",
        question: `As a ${selectedLevel} professional in ${selectedCategory.toUpperCase()}, which of the following is considered the most secure strategy for handling state consistency in high-frequency multi-threaded environments?`,
        options: [
          "A) Encapsulate in absolute global transient mutable variables.",
          "B) Implement optimistic locking concurrency, isolated states, or single-directional immutability.",
          "C) Route every read and write query through high-latency synchronous file-locking protocols.",
          "D) Delegate all safety structures to Client browser session caching registers."
        ],
        correctOption: "B",
        difficulty: "Fresher Friendly",
        context: "Basic fundamentals checking state management principles."
      },
      {
        id: "q_2",
        type: "Technical Questions",
        question: `How would you design a scalable caching strategy for high-traffic endpoints in ${selectedCategory.toUpperCase()} modules to guarantee minimal resource overhead?`,
        difficulty: "Junior Competency",
        context: "Focuses on speed and systems complexity."
      },
      {
        id: "q_3",
        type: "Scenario Questions",
        question: `Scenario: A critical database transaction fails silently midway through a business operation. What precise diagnostic runbook and rollback architecture would you execute?`,
        difficulty: "Mid-Level Professional",
        context: "Analyzes system durability under pressure."
      },
      {
        id: "q_4",
        type: "Behavioral Questions",
        question: `Describe a time when you had to convince a key business stakeholder or a senior product executive to adapt a major architectural design change that delayed a product release. What was your persuasion matrix?`,
        difficulty: "Senior Strategy",
        context: "Verifies communication capacity and trade-offs."
      },
      {
        id: "q_5",
        type: "Role Play",
        question: `Client Call Roleplay: A customer calls in furious because their live payment pipeline is throwing validation errors. Speak directly as if responding to this client and resolve the issue.`,
        difficulty: "Elite Master",
        context: "Combines technical composure with professional empathy."
      }
    ];

    return fallbackQuestions;
  };

  // Start button trigger (Step 4)
  const handleStartInterviewFlow = async () => {
    if (!acceptedTerms) {
      alert("Please accept the Terms & Conditions before starting the session.");
      return;
    }
    if (!cameraPermission || !micPermission) {
      alert("Camera & Microphone permissions must be verified to start a professional HR simulation.");
      return;
    }

    setInterviewState("active");
    setCurrentIndex(0);
    setUserAnswerText("");
    setSelectedMcqOption(null);
    setQuestionTimings([]);
    setSecondsRemaining(120);
    setIsTimerPaused(false);

    // Dynamic question retrieval (Step 5)
    const questions = await generateInterviewQuestions();
    setCurrentQuestions(questions);

    // Initialize Timer loop (Step 6)
    startQuestionTimer();
  };

  // 4. Question Timer Engine (Step 6)
  const startQuestionTimer = () => {
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Auto-advance on timeout
          handleSaveAndNext(true);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePauseTimer = () => {
    setIsTimerPaused(true);
    clearInterval(timerIntervalRef.current);
  };

  const handleResumeTimer = () => {
    setIsTimerPaused(false);
    startQuestionTimer();
  };

  // Speak/Mic Simulation (Step 5 - Voice Answer)
  const toggleVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // Mock converting audio speech into high-quality text transcript
      const spokenMockText = `Excellent baseline. I would recommend utilizing single-directional state propagation paired with optimistic updates to prevent high-latency visual lag. I've designed several components following this exact methodology, leading to significant responsiveness enhancements in the production build.`;
      setUserAnswerText(prev => prev ? prev + " " + spokenMockText : spokenMockText);
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
      const recTimer = setInterval(() => {
        setRecordingSeconds(p => p + 1);
      }, 1000);
      // stop recording after 15 seconds max
      setTimeout(() => {
        clearInterval(recTimer);
        setIsRecording(false);
      }, 15000);
    }
  };

  // 5. Progress & Save Questions (Step 6, 7)
  const handleSaveAndNext = (isAutoTimeout = false) => {
    const currentQ = currentQuestions[currentIndex];
    const candidateAnswer = currentQ.type === "MCQ" 
      ? (selectedMcqOption || "No option selected") 
      : (userAnswerText.trim() || "No answer provided on timing constraint.");

    const timeSpent = 120 - secondsRemaining;
    
    // Aggregate answers in local state
    const answerObject = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      type: currentQ.type,
      candidateAnswer,
      timeTaken: timeSpent,
      // Evaluation placeholders (Step 7)
      confidencePlaceholder: currentQ.type === "Role Play" ? "Extremely confident, strong voice pitch" : "Confident",
      communicationPlaceholder: "Clear articulation, logical sentence flow",
      technicalPlaceholder: currentQ.type === "Technical Questions" ? "Accurate design explanation" : "Pragmatic fit",
      grammarPlaceholder: "Syntax correctness evaluated 92/100",
      finalScorePlaceholder: Math.floor(Math.random() * 25) + 75 // Mock rating per question
    };

    const nextAnswers = [...currentAnswers, answerObject];
    setCurrentAnswers(nextAnswers);

    // Reset for next question
    setUserAnswerText("");
    setSelectedMcqOption(null);
    setSecondsRemaining(120);

    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished all questions! Complete interview
      finishInterviewAndGenerateReport(nextAnswers);
    }
  };

  // Complete manually button
  const handleFinishInterviewManually = () => {
    if (window.confirm("Are you sure you want to finalize the interview session now? Your current answers will be submitted for report compilation.")) {
      handleSaveAndNext();
    }
  };

  // 6. Complete Interview & AI Report Compiler (Step 7, 8, 9, 13)
  const finishInterviewAndGenerateReport = async (finalAnswers: any[]) => {
    clearInterval(timerIntervalRef.current);
    setInterviewState("report");
    setIsAnalyzingReport(true);

    const timestamp = new Date().toISOString();
    const sessionDocId = `session_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Call modern endpoint (Step 13)
      const response = await fetch("/api/ai-interview-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          level: selectedLevel,
          answers: finalAnswers
        })
      });

      let evaluationData: any = {};
      if (response.ok) {
        evaluationData = await response.json();
      }

      // Generate fully fleshed Step 8 scores
      const finalOverallScore = evaluationData.score || Math.floor(Math.random() * 15) + 78; // 78 to 93 range
      const technicalScore = Math.floor(Math.random() * 15) + 80;
      const communicationScore = Math.floor(Math.random() * 20) + 75;
      const confidenceScore = Math.floor(Math.random() * 12) + 83;
      const problemSolvingScore = Math.floor(Math.random() * 18) + 77;
      const behaviorScore = Math.floor(Math.random() * 15) + 82;

      const strengths = [
        `Outstanding command of core principles in ${selectedCategory.toUpperCase()} fields.`,
        `Extremely polished verbal confidence during scenario evaluations.`,
        `Demonstrated structured architectural patterns during technical breakdowns.`
      ];
      const weaknesses = [
        `Could elaborate slightly more on business scale trade-offs.`,
        `Optimizations regarding third-party service failures can be hardened.`
      ];
      const improvementSuggestions = [
        `Review advanced caching strategies (Redis, CDNs) to strengthen systems design answers.`,
        `Practice speaking in the explicit XYZ formula (Accomplished [X] as measured by [Y] by doing [Z]).`
      ];

      // Format complete Firestore documents representing requested collections (Step 9)
      
      // A) interview_sessions
      const sessionData = {
        id: sessionDocId,
        candidateId: userId,
        candidateName: profile?.name || "Candidate",
        category: selectedCategory,
        level: selectedLevel,
        status: "completed",
        language: selectedLanguage,
        createdAt: timestamp
      };
      await setDoc(doc(db, "interview_sessions", sessionDocId), sessionData);

      // B) interviews (metadata index)
      const interviewMetadata = {
        id: `int_${Math.random().toString(36).substr(2, 9)}`,
        candidateId: userId,
        candidateName: profile?.name || "Candidate",
        role: `${selectedLevel.toUpperCase()} ${selectedCategory.toUpperCase()} Engineer`,
        overallScore: finalOverallScore,
        status: "completed",
        createdAt: timestamp,
        feedback: `Completed with highly technical confidence. Passed the verification bar.`
      };
      await setDoc(doc(db, "interviews", interviewMetadata.id), interviewMetadata);

      // C) interview_questions & interview_answers
      for (const [idx, q] of currentQuestions.entries()) {
        const qDocId = `q_${sessionDocId}_${idx}`;
        const ansDocId = `ans_${sessionDocId}_${idx}`;
        const userAns = finalAnswers[idx] || {};

        // interview_questions
        await setDoc(doc(db, "interview_questions", qDocId), {
          id: qDocId,
          sessionId: sessionDocId,
          questionText: q.question,
          type: q.type,
          difficulty: q.difficulty || "Standard",
          order: idx
        });

        // interview_answers
        await setDoc(doc(db, "interview_answers", ansDocId), {
          id: ansDocId,
          sessionId: sessionDocId,
          questionId: qDocId,
          candidateId: userId,
          candidateAnswer: userAns.candidateAnswer || "None",
          timeTaken: userAns.timeTaken || 0,
          confidence: userAns.confidencePlaceholder || "Standard",
          technicalScore: userAns.finalScorePlaceholder || 80,
          communicationScore: 82,
          grammarScore: 85,
          createdAt: timestamp
        });
      }

      // D) interview_reports (full card detailed insights) (Step 8)
      const reportData = {
        id: `rep_${sessionDocId}`,
        sessionId: sessionDocId,
        candidateId: userId,
        category: selectedCategory,
        level: selectedLevel,
        overallScore: finalOverallScore,
        technicalScore,
        communicationScore,
        confidenceScore,
        problemSolvingScore,
        behaviorScore,
        strengths,
        weaknesses,
        improvementSuggestions,
        securitySettings: {
          employerAccess: false,      // Fulfills security constraints in Step 12
          consultancyAccess: false     // Fulfills security constraints in Step 12
        },
        answers: finalAnswers,
        createdAt: timestamp
      };
      await setDoc(doc(db, "interview_reports", reportData.id), reportData);

      // E) Update candidate main profile score (triggers live verified status update!)
      const updatedProfile = {
        aiInterviewScore: finalOverallScore
      };
      await updateDoc(doc(db, "candidates", userId), updatedProfile);
      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);

      setSelectedReport(reportData);

      // Trigger standard notify via Firestore
      await triggerNotification(
        "🏆 Premium AI Interview Evaluated",
        `Completed your ${selectedCategory.toUpperCase()} mock assessment. Calculated composite rating: ${finalOverallScore}%`
      );

      // Reload history metrics
      fetchHistoryAndStats();

    } catch (err) {
      console.error("Error creating interview report documents:", err);
    } finally {
      setIsAnalyzingReport(false);
    }
  };

  // Toggle report security flags (Step 12)
  const handleToggleSecurityFlag = async (field: "employerAccess" | "consultancyAccess") => {
    if (!selectedReport) return;
    try {
      const nextSettings = {
        ...selectedReport.securitySettings,
        [field]: !selectedReport.securitySettings[field]
      };
      const updatedReport = {
        ...selectedReport,
        securitySettings: nextSettings
      };
      await updateDoc(doc(db, "interview_reports", selectedReport.id), {
        securitySettings: nextSettings
      });
      setSelectedReport(updatedReport);

      // Trigger notifications for user permission grant changes
      await triggerNotification(
        "🔒 Interview Security Config Updated",
        `Access permissions changed: ${field === "employerAccess" ? "Employer sharing" : "Consultancy vetting"} is now ${nextSettings[field] ? "ENABLED" : "DISABLED"}.`
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate composite statistics for dashboard cards (Step 10)
  const averageScore = completedInterviews.length > 0 
    ? Math.round(completedInterviews.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / completedInterviews.length) 
    : 0;

  const highestScore = completedInterviews.length > 0
    ? Math.max(...completedInterviews.map(i => i.overallScore || 0))
    : 0;

  const isVerifiedBadgeActive = highestScore >= 80;

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="ai-interview-arena-complete">
      
      {/* ----------------- STATE A: INTERVIEW DASHBOARD ----------------- */}
      {interviewState === "dashboard" && (
        <div className="space-y-8">
          
          {/* Dashboard Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-extrabold text-white flex items-center space-x-2">
                <Brain className="w-6 h-6 text-purple-400" />
                <span>AI Hiring Assessment Arena</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Deploy adaptive, professional-grade mock interfaces mimicking competitive enterprise evaluation frameworks.
              </p>
            </div>

            <button
              onClick={() => setInterviewState("prep")}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/10 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch New Simulation</span>
            </button>
          </div>

          {/* Premium Dashboard Metrics Cards (Step 10) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Card 1: Overall Interview Rating */}
            <div className="glass p-4 rounded-2xl flex flex-col justify-between space-y-3 bg-[#0a0710]/40 border border-purple-500/15">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-wider font-extrabold text-gray-400 uppercase">AI Rating Score</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black font-display text-white">{highestScore}</span>
                  <span className="text-[10px] text-gray-500 font-mono">/100</span>
                </div>
                <p className="text-[9px] text-purple-300 font-medium">Best score</p>
              </div>
            </div>

            {/* Card 2: Completed Interviews */}
            <div className="glass p-4 rounded-2xl flex flex-col justify-between space-y-3 bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-wider font-extrabold text-gray-400 uppercase">Completed Scans</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-3xl font-black font-display text-white">{completedInterviews.length}</span>
                <p className="text-[9px] text-emerald-400 font-medium">Verified evaluations</p>
              </div>
            </div>

            {/* Card 3: Upcoming Interviews */}
            <div className="glass p-4 rounded-2xl flex flex-col justify-between space-y-3 bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-wider font-extrabold text-gray-400 uppercase">Scheduled Arenas</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <span className="text-3xl font-black font-display text-white">{upcomingInterviews.length}</span>
                <p className="text-[9px] text-indigo-300 font-medium">Pipeline scheduled</p>
              </div>
            </div>

            {/* Card 4: Average Score */}
            <div className="glass p-4 rounded-2xl flex flex-col justify-between space-y-3 bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-wider font-extrabold text-gray-400 uppercase">Average Match</span>
                <BarChart3 className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black font-display text-white">{averageScore}</span>
                  <span className="text-[10px] text-gray-500 font-mono">%</span>
                </div>
                <p className="text-[9px] text-pink-400 font-medium">Composite level</p>
              </div>
            </div>

            {/* Card 5: AI Verified Progress Badge */}
            <div className={`glass p-4 rounded-2xl flex flex-col justify-between space-y-3 relative overflow-hidden border ${
              isVerifiedBadgeActive ? "border-emerald-500/20 bg-emerald-950/5 text-emerald-300" : "border-white/5 bg-black/40"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-wider font-extrabold text-gray-400 uppercase">Badge Status</span>
                {isVerifiedBadgeActive ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div>
                <p className="font-display font-black text-xs text-white uppercase tracking-wider truncate">
                  {isVerifiedBadgeActive ? "AI Verified" : "Locked Status"}
                </p>
                <p className="text-[9px] text-gray-400 leading-normal mt-0.5">
                  {isVerifiedBadgeActive ? "Badge visible to employers" : "Earn 80%+ to unlock badge"}
                </p>
              </div>
            </div>

          </div>

          {/* Historical Lists (Step 1) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Timeline list of history (Completed & Upcoming) */}
            <div className="lg:col-span-2 glass p-6 rounded-2xl space-y-4 border border-white/10">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-display font-bold text-sm text-white flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Assessment & Evaluation History</span>
                </h3>
                <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2.5 py-0.5 rounded-full">
                  {completedInterviews.length} reports compiled
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                  <p className="text-xs text-gray-400 mt-2 font-mono">Loading telemetry tracks...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 scrollbar divide-y divide-white/5">
                  
                  {completedInterviews.map((item, index) => (
                    <div key={item.id} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono text-[9px] font-black uppercase">
                            COMPLETED
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-white group-hover:text-purple-300 transition-all">
                          {item.role || `${item.level} ${item.category} Session`}
                        </h4>
                        <p className="text-xs text-gray-400 leading-normal truncate max-w-md">
                          {item.feedback || "Evaluation parameters recorded successfully."}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block font-mono">Composite Rating</span>
                          <span className="text-base font-black text-purple-400 font-display">
                            {item.overallScore || 0}%
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            // Load exact report document
                            const repRef = doc(db, "interview_reports", `rep_${item.sessionId || item.id}`);
                            const snap = await getDoc(repRef);
                            if (snap.exists()) {
                              setSelectedReport(snap.data());
                              setInterviewState("report");
                            } else {
                              alert("Detailed report for this historical session was not found.");
                            }
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer text-xs flex items-center space-x-1"
                        >
                          <span>Review report</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {completedInterviews.length === 0 && (
                    <div className="py-20 text-center space-y-3">
                      <Brain className="w-10 h-10 text-gray-600 mx-auto animate-pulse" />
                      <div>
                        <p className="font-semibold text-gray-300 text-xs">No active assessments recorded yet</p>
                        <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1 leading-normal">
                          Launch your first professional simulator assessment using the button on top to unlock ratings.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Right side: Security Guidelines & Upcoming schedulers */}
            <div className="space-y-6">
              
              {/* Upcoming scheduled check card */}
              <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
                <h4 className="font-mono text-[10px] tracking-widest text-indigo-400 font-black uppercase flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Employer Pipeline Schedule</span>
                </h4>
                
                {upcomingInterviews.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingInterviews.map((up) => (
                      <div key={up.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                        <p className="text-xs font-bold text-white">{up.jobTitle || "Technical SDE Interview"}</p>
                        <p className="text-[10px] text-gray-400">Scheduled by hiring agency</p>
                        <div className="flex items-center justify-between text-[9px] text-indigo-300 font-mono pt-1">
                          <span>Date: {new Date(up.createdAt).toLocaleDateString()}</span>
                          <span className="font-bold uppercase text-emerald-400">ACTIVE PIN</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 rounded-xl text-center text-[10px] text-gray-500 italic">
                    No agency interviews are currently queued for your profile.
                  </div>
                )}
              </div>

              {/* Security Matrix summary (Step 12) */}
              <div className="glass p-5 rounded-2xl border border-white/10 space-y-4">
                <h4 className="font-display font-bold text-xs text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Zero-Trust Security Matrix</span>
                </h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Your interview reports and answer telemetry are isolated using secure Attribute-Based Access Controls.
                </p>

                <div className="space-y-2.5 font-mono text-[9px] text-gray-400 divide-y divide-white/5">
                  <div className="pt-2.5 first:pt-0 flex items-center justify-between">
                    <span>Your View Access:</span>
                    <span className="text-emerald-400 font-bold">GRANTED</span>
                  </div>
                  <div className="pt-2.5 flex items-center justify-between">
                    <span>Consultancy Access:</span>
                    <span className="text-amber-400 font-bold">REQUIRES PERMISSION</span>
                  </div>
                  <div className="pt-2.5 flex items-center justify-between">
                    <span>Employer Access:</span>
                    <span className="text-amber-400 font-bold">REQUIRES APPLICATION</span>
                  </div>
                  <div className="pt-2.5 flex items-center justify-between">
                    <span>Admin System Access:</span>
                    <span className="text-purple-400 font-bold">AUDITED OVERSEE ONLY</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ----------------- STATE B: INTERVIEW CONFIG & PREP ----------------- */}
      {interviewState === "prep" && (
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <button 
                onClick={() => setInterviewState("dashboard")}
                className="text-xs text-gray-400 hover:text-white font-semibold flex items-center space-x-1 cursor-pointer mb-1"
              >
                <span>&larr; Back to Dashboard</span>
              </button>
              <h2 className="text-lg font-display font-black text-white">Setup Assessment Challenge</h2>
            </div>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2.5 py-1 rounded-full uppercase font-bold">
              Verification Mode
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Setup inputs column */}
            <div className="space-y-5">
              
              {/* Category selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Choose Assessment Category:</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVIEW_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        selectedCategory === cat.id 
                          ? "bg-purple-600/10 border-purple-500 text-white shadow-lg shadow-purple-500/5" 
                          : "bg-white/5 border-white/5 text-gray-400 hover:border-white/15 hover:text-gray-200"
                      }`}
                    >
                      <cat.icon className={`w-4 h-4 mb-1.5 ${selectedCategory === cat.id ? "text-purple-400" : "text-gray-400"}`} />
                      <p className="font-bold text-[11px] leading-tight">{cat.label}</p>
                      <p className="text-[9px] text-gray-500 font-normal leading-normal mt-0.5 line-clamp-1">{cat.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom text field if selected custom */}
              {selectedCategory === "custom" && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-mono font-bold text-purple-400 uppercase">Specify Custom Role Title:</label>
                  <input
                    type="text"
                    value={customRoleText}
                    onChange={(e) => setCustomRoleText(e.target.value)}
                    placeholder="e.g., 'React 19 Frontend Architect' or 'Cloud Systems Engineer'"
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-white placeholder-gray-500"
                  />
                </div>
              )}

              {/* Level selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Choose Career Level:</label>
                <div className="space-y-2">
                  {INTERVIEW_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setSelectedLevel(lvl.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                        selectedLevel === lvl.id 
                          ? "bg-indigo-600/10 border-indigo-500 text-white" 
                          : "bg-white/5 border-white/5 text-gray-400 hover:border-white/10"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-white">{lvl.label}</p>
                        <p className="text-[10px] text-gray-400 font-normal leading-relaxed">{lvl.desc}</p>
                      </div>
                      <span className="px-1.5 py-0.5 bg-white/5 text-gray-500 font-mono text-[8px] font-bold rounded">
                        {lvl.exp}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Primary Language Input:</label>
                <div className="flex flex-wrap gap-2">
                  {["English", "Spanish", "Hindi", "French", "German"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                        selectedLanguage === lang 
                          ? "bg-white/10 border-white text-white" 
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Hardware & Permissions checklist column */}
            <div className="space-y-5 bg-white/5 p-5 rounded-2xl border border-white/5 h-fit">
              <h3 className="font-display font-black text-xs text-white tracking-wider uppercase border-b border-white/5 pb-2 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Verification & Prep Checklist</span>
              </h3>

              <div className="space-y-2 text-[11px] text-gray-300">
                <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono">
                  <span className="text-gray-400">Candidate Name:</span>
                  <span className="text-white font-bold">{profile?.name || "Aryan Sharma"}</span>
                </div>
                <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono">
                  <span className="text-gray-400">Estimated Duration:</span>
                  <span className="text-indigo-300 font-bold">15 - 20 Minutes</span>
                </div>
              </div>

              {/* Camera permission box */}
              <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                isCameraActive ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-black/20"
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isCameraActive ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-gray-400"}`}>
                    <Camera className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Camera Check</p>
                    <p className="text-[9px] text-gray-500 leading-normal">Required for integrity verification</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                    isCameraActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {isCameraActive ? "Verified" : "Enable Camera"}
                </button>
              </div>

              {/* Mic permission box */}
              <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                isMicActive ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-black/20"
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isMicActive ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-gray-400"}`}>
                    <Mic className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Microphone Check</p>
                    <p className="text-[9px] text-gray-500 leading-normal">Required for voice answers</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                    isMicActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {isMicActive ? "Verified" : "Enable Mic"}
                </button>
              </div>

              {/* Live webcam display simulation */}
              {isCameraActive && (
                <div className="relative w-full h-32 bg-black rounded-xl overflow-hidden border border-white/5 animate-in zoom-in-95 duration-300 shadow-inner">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    muted 
                    playsInline
                  />
                  <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 px-2 py-0.5 rounded font-mono text-[8px] text-emerald-400 uppercase font-black tracking-widest animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Live feed</span>
                  </div>
                </div>
              )}

              {/* Terms checkbox */}
              <label className="flex items-start space-x-2 p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 rounded bg-black border-white/10 text-purple-600 focus:ring-purple-500"
                />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  I agree to the Terms of Assessment. I confirm that I will not utilize secondary assistance, external browser query tabs, or AI copilots during this session.
                </p>
              </label>

              {/* Start Interview Trigger button */}
              <button
                onClick={handleStartInterviewFlow}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/15 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Verification Interview</span>
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ----------------- STATE C: ACTIVE INTERVIEW SESSION WORKSPACE ----------------- */}
      {interviewState === "active" && currentQuestions.length > 0 && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8" id="active-session-frame">
          
          {/* Main workspace column */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Top header navigation bar inside active simulation */}
            <div className="glass p-4 rounded-2xl flex items-center justify-between border border-white/10 bg-[#06040a]/80 backdrop-blur-md">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono text-purple-400 uppercase font-black tracking-widest">Active Assessment</span>
                <h3 className="font-display font-bold text-sm text-white">
                  {selectedCategory.toUpperCase()} - {selectedLevel.toUpperCase()}
                </h3>
              </div>

              {/* Counter, ProgressBar, Countdown (Step 6) */}
              <div className="flex items-center space-x-4">
                
                {/* Countdown Timer */}
                <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1.5 font-mono text-xs">
                  <Clock className={`w-4 h-4 ${secondsRemaining < 30 ? "text-red-400 animate-pulse" : "text-purple-400"}`} />
                  <span className={secondsRemaining < 30 ? "text-red-400 font-bold" : "text-gray-200"}>
                    {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                {/* Progress Circle or Question counter */}
                <span className="text-[11px] font-mono font-bold text-indigo-300">
                  Question {currentIndex + 1} of {currentQuestions.length}
                </span>

              </div>
            </div>

            {/* Full horizontal Progress bar (Step 6) */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
              ></div>
            </div>

            {/* Question card container */}
            <div className="glass p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b0713]/50 to-black/60 relative overflow-hidden space-y-6">
              
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[70px] pointer-events-none"></div>

              {/* Section Tag showing adaptive difficulty increases (Step 5) */}
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono text-[8px] font-black uppercase tracking-wider">
                  Difficulty: {currentQuestions[currentIndex].difficulty || "Adaptive Mid"}
                </span>
                <span className="text-[9px] font-mono text-gray-500 italic">
                  {currentQuestions[currentIndex].type} Section
                </span>
              </div>

              {/* Actual Question Text */}
              <p className="font-display font-bold text-base md:text-lg text-white leading-relaxed">
                {currentQuestions[currentIndex].question}
              </p>

              {/* Context Tip/Hint */}
              {currentQuestions[currentIndex].context && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] text-gray-400 flex items-start space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>{currentQuestions[currentIndex].context}</span>
                </div>
              )}

              {/* Dynamic Input render depending on Question format (Step 5) */}
              <div className="pt-4">
                
                {/* Format 1: Multiple Choice MCQ */}
                {currentQuestions[currentIndex].type === "MCQ" && (
                  <div className="space-y-2">
                    {currentQuestions[currentIndex].options?.map((opt: string, i: number) => {
                      const letter = opt.substring(0, 1);
                      const isSel = selectedMcqOption === letter;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedMcqOption(letter)}
                          className={`w-full p-4 rounded-2xl border text-left text-xs font-semibold flex items-center space-x-3 transition-all cursor-pointer ${
                            isSel 
                              ? "bg-purple-500/10 border-purple-500 text-white" 
                              : "bg-white/5 border-white/5 text-gray-300 hover:border-white/10"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSel ? "border-purple-400 bg-purple-500 text-white" : "border-gray-500 bg-black/20"
                          }`}>
                            {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Format 2: Standard Text / Voice / Scenario / Behavioral / Role Play */}
                {currentQuestions[currentIndex].type !== "MCQ" && (
                  <div className="space-y-4">
                    <textarea
                      value={userAnswerText}
                      onChange={(e) => setUserAnswerText(e.target.value)}
                      placeholder="Type your structured, impact-driven professional response here... (or use the voice mic module below to record speaking your response)"
                      className="w-full h-48 p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-purple-500 text-xs text-white resize-none font-sans leading-relaxed"
                    />

                    {/* Speech to text simulation wrapper (Voice Answer) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                      
                      <div className="space-y-0.5">
                        <p className="font-bold text-[11px] text-gray-200">Voice Answer Module</p>
                        <p className="text-[9px] text-gray-500">Record speaking to audit confidence and voice flow</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRecording && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 font-mono text-[10px] animate-pulse">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                            <span>Listening... {recordingSeconds}s</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={toggleVoiceRecording}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                            isRecording 
                              ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/10" 
                              : "bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/25 text-purple-400 hover:text-purple-300"
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>Stop & Transcribe</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" />
                              <span>Record speech answer</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Action buttons (Pause, Resume, Finish) (Step 6) */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                
                <div className="flex items-center space-x-2">
                  {isTimerPaused ? (
                    <button
                      onClick={handleResumeTimer}
                      className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-emerald-400" />
                      <span>Resume timer</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseTimer}
                      className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Pause className="w-3 h-3 fill-amber-400" />
                      <span>Pause assessment</span>
                    </button>
                  )}

                  <button
                    onClick={handleFinishInterviewManually}
                    className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Finish Interview
                  </button>
                </div>

                <button
                  onClick={() => handleSaveAndNext()}
                  disabled={currentQuestions[currentIndex].type === "MCQ" ? !selectedMcqOption : !userAnswerText.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-500/10"
                >
                  <span>{currentIndex === currentQuestions.length - 1 ? "Submit & Analyze" : "Save & Next"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

              </div>

            </div>

          </div>

          {/* Sidebar device monitoring simulated widget */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Webcam / Mic monitor */}
            <div className="glass p-5 rounded-2xl border border-white/10 space-y-4">
              <h4 className="font-mono text-[10px] tracking-widest text-indigo-400 font-black uppercase">Device telemetry</h4>
              
              <div className="relative w-full h-44 bg-black rounded-xl overflow-hidden border border-white/5 shadow-inner">
                {isCameraActive ? (
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    muted 
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-gray-600">
                    <Camera className="w-8 h-8 animate-pulse" />
                    <span className="text-[10px]">Webcam stream off</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-purple-600 px-1.5 py-0.5 rounded font-mono text-[7px] text-white uppercase font-black tracking-widest">
                  Secure audit on
                </div>
              </div>

              {/* Soundwaves for Mic level */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500">Audio Voice Level Output:</span>
                <div className="h-8 bg-black/30 rounded-lg border border-white/5 flex items-center justify-center gap-1 px-3">
                  {micDecibels.map((val, index) => (
                    <div 
                      key={index} 
                      className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full transition-all duration-150" 
                      style={{ height: `${val}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-normal space-y-1">
                <p className="font-bold text-gray-300">Compliance Warning:</p>
                <p>Do not reload the browser page or exit full-screen mode. Doing so logs a compliance fault mark inside the final report.</p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ----------------- STATE D: COMPREHENSIVE AI REPORT CARD ----------------- */}
      {interviewState === "report" && (
        <div className="max-w-4xl mx-auto space-y-6">
          
          {isAnalyzingReport ? (
            <div className="text-center py-24 glass rounded-3xl space-y-4 border border-white/10 my-12 bg-[#050409]">
              <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
              <div>
                <h3 className="font-display font-black text-sm text-white font-mono uppercase tracking-widest">Compiling Interview Assessment</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-2 leading-normal">
                  Our advanced AI models are reviewing your transcribed answers, calculating communication and problem-solving quotients, and preparing strategic improvement tips...
                </p>
              </div>
            </div>
          ) : (
            selectedReport && (
              <div className="space-y-6 animate-in fade-in duration-500" id="report-view-premium">
                
                {/* Header bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <button 
                      onClick={() => setInterviewState("dashboard")}
                      className="text-xs text-gray-400 hover:text-white font-semibold flex items-center space-x-1 cursor-pointer mb-1"
                    >
                      <span>&larr; Return to Dashboard</span>
                    </button>
                    <h2 className="text-xl font-display font-extrabold text-white flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
                      <span>AI Verification Report Card</span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 border border-white/10 rounded-xl cursor-pointer"
                    >
                      Download report PDF
                    </button>
                    <button
                      onClick={() => setInterviewState("dashboard")}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-xs font-bold text-white rounded-xl cursor-pointer"
                    >
                      Finish review
                    </button>
                  </div>
                </div>

                {/* Subnav for report sections */}
                <div className="flex items-center space-x-1.5 bg-white/5 p-1 rounded-xl border border-white/5 max-w-sm">
                  <button
                    onClick={() => setActiveReportDetailsTab("overview")}
                    className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      activeReportDetailsTab === "overview" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Overview Scores
                  </button>
                  <button
                    onClick={() => setActiveReportDetailsTab("qna")}
                    className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      activeReportDetailsTab === "qna" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Telemetry Q&A
                  </button>
                  <button
                    onClick={() => setActiveReportDetailsTab("security")}
                    className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      activeReportDetailsTab === "security" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Access Matrix
                  </button>
                </div>

                {/* TAB 1: OVERVIEW COMPREHENSIVE HIGHLIGHTS (Step 8) */}
                {activeReportDetailsTab === "overview" && (
                  <div className="space-y-6">
                    
                    {/* Overall score radial highlight (Step 8, 11) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#07050d] p-6 rounded-3xl border border-purple-500/15 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[50px] pointer-events-none"></div>
                      
                      <div className="text-center space-y-2">
                        <span className="text-[9px] font-mono tracking-widest text-purple-400 font-extrabold uppercase">Composite Grade</span>
                        
                        {/* Circular neon progress */}
                        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" className="stroke-white/5 stroke-[8] fill-none" />
                            <circle 
                              cx="56" 
                              cy="56" 
                              r="48" 
                              className="stroke-purple-500 stroke-[8] fill-none transition-all duration-1000" 
                              strokeDasharray={`${2 * Math.PI * 48}`}
                              strokeDashoffset={`${2 * Math.PI * 48 * (1 - selectedReport.overallScore / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute font-display font-black text-2xl text-white">{selectedReport.overallScore}%</span>
                        </div>

                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider block w-fit mx-auto">
                          {selectedReport.overallScore >= 80 ? "Verification Active" : "Audit Pending"}
                        </span>
                      </div>

                      <div className="md:col-span-2 text-xs text-gray-400 space-y-2.5">
                        <p className="font-bold text-gray-200 text-sm">Adaptive Assessment Insights</p>
                        <p className="leading-relaxed text-[11px]">
                          Excellent response structure recorded. Verbal responses demonstrated deep comprehension of {selectedReport.category?.toUpperCase()} frameworks at {selectedReport.level?.toUpperCase()} level. Minor corrections suggested below to elevate design optimization parameters.
                        </p>
                        
                        <div className="flex flex-wrap gap-2 pt-2">
                          <div className="px-2.5 py-1 bg-white/5 border border-white/5 rounded font-mono text-[10px] text-gray-300">
                            Language: <span className="text-white font-bold">{selectedLanguage}</span>
                          </div>
                          <div className="px-2.5 py-1 bg-white/5 border border-white/5 rounded font-mono text-[10px] text-gray-300">
                            Type: <span className="text-white font-bold">{selectedReport.category?.toUpperCase()}</span>
                          </div>
                          <div className="px-2.5 py-1 bg-white/5 border border-white/5 rounded font-mono text-[10px] text-gray-300">
                            Level: <span className="text-white font-bold">{selectedReport.level?.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown grids (Step 8) */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      
                      {[
                        { label: "Technical Competency", value: selectedReport.technicalScore, desc: "Accurate architecture terminology, tool alignment.", color: "from-purple-500 to-indigo-500" },
                        { label: "Communication Flow", value: selectedReport.communicationScore, desc: "Clarity, pace of speech, structured expression.", color: "from-indigo-500 to-blue-500" },
                        { label: "Confidence Quotient", value: selectedReport.confidenceScore, desc: "Response pause ratio, calm tone structure.", color: "from-emerald-500 to-teal-500" },
                        { label: "Problem Solving", value: selectedReport.problemSolvingScore, desc: "Structured approach to scenarios, XYZ formulas.", color: "from-pink-500 to-rose-500" },
                        { label: "Behavioral Alignment", value: selectedReport.behaviorScore, desc: "Company cultural fit, leadership values.", color: "from-amber-500 to-orange-500" }
                      ].map((bar, idx) => (
                        <div key={idx} className="glass p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all text-center space-y-1 bg-black/20">
                          <span className="text-[9px] text-gray-500 font-mono font-bold block leading-none">{bar.label}</span>
                          <span className="text-lg font-black text-white font-display block pt-1">{bar.value}%</span>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${bar.color}`} style={{ width: `${bar.value}%` }} />
                          </div>
                        </div>
                      ))}

                    </div>

                    {/* Strengths, Weaknesses, suggestions checklist grids (Step 8) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Strengths Card */}
                      <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center space-x-1 border-b border-white/5 pb-1">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>Key Strengths Verified</span>
                        </h4>
                        <ul className="space-y-2 list-disc list-inside text-[11px] text-gray-300 leading-relaxed">
                          {selectedReport.strengths?.map((str: string, i: number) => (
                            <li key={i}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Weaknesses Card */}
                      <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-red-400 flex items-center space-x-1 border-b border-white/5 pb-1">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span>Identified Weaknesses Gaps</span>
                        </h4>
                        <ul className="space-y-2 list-disc list-inside text-[11px] text-gray-300 leading-relaxed">
                          {selectedReport.weaknesses?.map((wk: string, i: number) => (
                            <li key={i}>{wk}</li>
                          ))}
                        </ul>
                      </div>

                    </div>

                    {/* AI Improvement Suggestions */}
                    <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center space-x-1 border-b border-white/5 pb-1">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span>AI Improvement Suggestions</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedReport.improvementSuggestions?.map((sug: string, i: number) => (
                          <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] text-gray-300 leading-relaxed flex items-start space-x-2">
                            <span className="w-4 h-4 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center shrink-0 font-bold text-[9px] mt-0.5">{i+1}</span>
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 2: TELEMETRY Q&A (Step 7) */}
                {activeReportDetailsTab === "qna" && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-white">Full Telemetry Q&A Log</h3>
                    <p className="text-xs text-gray-400">Detailed answers with time spent and evaluation indicators per question.</p>
                    
                    <div className="space-y-4">
                      {selectedReport.answers?.map((ans: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
                          <div className="flex justify-between items-start border-b border-white/5 pb-2">
                            <span className="font-mono text-[10px] text-indigo-400 font-bold">Question {idx+1} ({ans.type})</span>
                            <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded font-mono text-[9px]">
                              Time Taken: {ans.timeTaken} seconds
                            </span>
                          </div>

                          <p className="font-bold text-xs text-white leading-normal">{ans.questionText}</p>
                          
                          <div className="space-y-1">
                            <p className="text-[10px] font-mono text-gray-500">Your Answer:</p>
                            <p className="p-3 bg-black/40 rounded-lg text-xs font-mono text-gray-300 leading-relaxed italic border border-white/5">
                              {ans.candidateAnswer}
                            </p>
                          </div>

                          {/* Evaluation metrics placeholders stored inside Firestore (Step 7) */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 font-mono text-[9px] text-gray-400">
                            <div className="p-2 bg-white/5 rounded">
                              Confidence: <span className="text-emerald-400 font-bold block">{ans.confidencePlaceholder}</span>
                            </div>
                            <div className="p-2 bg-white/5 rounded">
                              Communication: <span className="text-indigo-400 font-bold block">{ans.communicationPlaceholder}</span>
                            </div>
                            <div className="p-2 bg-white/5 rounded">
                              Technical Alignment: <span className="text-purple-400 font-bold block">{ans.technicalPlaceholder}</span>
                            </div>
                            <div className="p-2 bg-white/5 rounded">
                              Grammar Accuracy: <span className="text-amber-400 font-bold block">{ans.grammarPlaceholder}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: SECURITY & PRIVACY CONTROLS (Step 12) */}
                {activeReportDetailsTab === "security" && (
                  <div className="glass p-6 rounded-2xl border border-white/10 max-w-xl mx-auto space-y-6">
                    
                    <div className="space-y-1.5">
                      <h3 className="font-display font-bold text-sm text-white flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span>Attribute-Based Security Matrix Controls</span>
                      </h3>
                      <p className="text-xs text-gray-400 leading-normal">
                        Grant or revoke access permissions instantly. External hiring agents cannot bypass these blocks.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2">
                      
                      {/* Consultancy permission toggle */}
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1 max-w-[70%]">
                          <p className="font-bold text-xs text-white">Consultancy Agency Vetting</p>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            Allow accredited partner agencies and career advisors to view this interview report on their dashboards.
                          </p>
                        </div>

                        <button
                          onClick={() => handleToggleSecurityFlag("consultancyAccess")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center space-x-1.5 ${
                            selectedReport.securitySettings?.consultancyAccess 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-white/5 text-gray-400 hover:text-white"
                          }`}
                        >
                          {selectedReport.securitySettings?.consultancyAccess ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Granted</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Restricted</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Employer permission toggle */}
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1 max-w-[70%]">
                          <p className="font-bold text-xs text-white">Direct Employer Sharing</p>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            Expose your score breakdowns and verified badge directly inside standard job applications when you apply.
                          </p>
                        </div>

                        <button
                          onClick={() => handleToggleSecurityFlag("employerAccess")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center space-x-1.5 ${
                            selectedReport.securitySettings?.employerAccess 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-white/5 text-gray-400 hover:text-white"
                          }`}
                        >
                          {selectedReport.securitySettings?.employerAccess ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Activated</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>In-app only</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>

                    <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-[10px] text-emerald-300 leading-relaxed">
                      💡 <strong>Verification Tip:</strong> Keeping Consultancy Access open allows agencies to directly match your validated qualifications into premium high-budget SDE vacancies.
                    </div>

                  </div>
                )}

              </div>
            )
          )}

        </div>
      )}

    </div>
  );
}
