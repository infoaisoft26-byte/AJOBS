import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Upload, MessageSquare, Briefcase, Award, Send, Play, 
  Brain, CheckCircle2, TrendingUp, AlertTriangle, PlayCircle, Star, Info, FileText,
  Bell, ChevronRight, CheckCircle, Trash2
} from "lucide-react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, arrayUnion, increment, query, where, onSnapshot } from "firebase/firestore";
import { CandidateProfile, JobPosting, JobApplication, InterviewSession, ChatMessage, NotificationRecord } from "../types";

// Import modular panels
import { NotificationCenterView } from "./NotificationCenter";
import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";
import CandidateDashboardOverview from "./CandidateDashboardOverview";
import CandidateProfileSection from "./CandidateProfileSection";
import CandidateResumeSection from "./CandidateResumeSection";
import CandidateJobsSection from "./CandidateJobsSection";
import CandidateSettings from "./CandidateSettings";
import CandidateInterviewSection from "./CandidateInterviewSection";
import CandidateReportSection from "./CandidateReportSection";
import CandidateCareerCenter from "./CandidateCareerCenter";
import LiveChatSection from "./LiveChatSection";
import CandidateRecruiterInterviews from "./CandidateRecruiterInterviews";
import AbacControlInspector from "./AbacControlInspector";
import GoogleWorkspaceHub from "./GoogleWorkspaceHub";

interface CandidateDashboardProps {
  userId: string;
  userName: string;
}

export default function CandidateDashboard({ userId, userName }: CandidateDashboardProps) {
  // Main Navigation state
  const [activeTab, setActiveTab] = useState<
    "overview" | "profile" | "education" | "experience" | "skills" | 
    "resume" | "explore-jobs" | "saved-jobs" | "applied-jobs" | "interviews" | "notifications" | "settings" | "interview" | "coach" | "ai-report" | "chat" | "workspace"
  >("overview");
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DB Sync state
  const [profile, setProfile] = useState<any | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  // AI Resume Auditor state
  const [resumeText, setResumeText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // AI Matcher state
  const [selectedJobForMatch, setSelectedJobForMatch] = useState<JobPosting | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);

  // AI Interview Simulator state
  const [selectedJobForInterview, setSelectedJobForInterview] = useState<JobPosting | null>(null);
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);

  // Career Coach state
  const [coachHistory, setCoachHistory] = useState<ChatMessage[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const coachEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial Firestore documents
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Candidate document
      const docRef = doc(db, "candidates", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setResumeText(data.resumeText || "");
        setCoachHistory(data.careerCoachChat || [
          { id: "1", sender: "ai", text: `Hi ${userName}! I am your dedicated AI Career Coach. Tell me about your dream job, or let's prepare for an upcoming interview.`, timestamp: new Date().toISOString() }
        ]);
      } else {
        // Bootstrap template document
        const bootstrap = {
          userId,
          name: userName,
          resumeText: "",
          resumeScore: 0,
          aiInterviewScore: 0,
          savedJobIds: [],
          skills: { technical: ["React", "TypeScript", "Node.js"], soft: ["Team Collaboration"], languages: ["English"], level: "Mid" },
          education: {
            tenth: { board: "CBSE", school: "St. Mary School", score: "92%", year: "2020" },
            twelfth: { board: "CBSE", school: "DPS High School", score: "95%", year: "2022" },
            graduation: { degree: "B.Tech Computer Science", college: "BITS Pilani", score: "9.1/10", year: "2026" },
            certifications: []
          },
          workExperience: []
        };
        await setDoc(docRef, bootstrap);
        setProfile(bootstrap);
      }

      // 2. Jobs Postings
      const jobsSnap = await getDocs(collection(db, "jobs"));
      const jobsList: JobPosting[] = [];
      jobsSnap.forEach(doc => {
        jobsList.push({ id: doc.id, ...doc.data() } as JobPosting);
      });
      setJobs(jobsList);

      // 3. Applications
      const appsSnap = await getDocs(collection(db, "applications"));
      const appsList: JobApplication[] = [];
      appsSnap.forEach(doc => {
        const app = doc.data() as JobApplication;
        if (app.candidateId === userId) {
          appsList.push({ id: doc.id, ...app });
        }
      });
      setApplications(appsList);

    } catch (err: any) {
      if (err?.message?.includes("permissions") || err?.code === "permission-denied" || err?.message?.includes("permission-denied")) {
        console.warn("Candidate workspace synchronization redirected to local memory sandbox due to Firestore rules validation:", err.message);
      } else {
        console.error("Error synchronizing candidate workspace:", err);
        setError(err?.message || "Workspace synchronization issue detected. Please retry.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userId, userName]);

  // Real-time listener for user's notifications
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: NotificationRecord[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as NotificationRecord);
      });
      
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(items);
    }, (error) => {
      console.error("Error listening to notifications collection:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    coachEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachHistory, coachLoading]);

  // General Notification Trigger Helper
  const triggerNotification = async (title: string, message: string) => {
    const notifId = "notif_" + Math.random().toString(36).substr(2, 9);
    const newNotif: NotificationRecord = {
      id: notifId,
      userId,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "notifications", notifId), newNotif);
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err) {
      console.error("Error triggers log:", err);
    }
  };

  // Header notifications clearers
  const handleMarkAllRead = async () => {
    try {
      const batchPromises = notifications.map(n => {
        if (!n.read) {
          return updateDoc(doc(db, "notifications", n.id), { read: true });
        }
        return Promise.resolve();
      });
      await Promise.all(batchPromises);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNotification = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true }); // Mock mark read
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Analyze Resume Handler
  const handleAnalyzeResume = async () => {
    if (!resumeText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, candidateName: userName })
      });
      const data = await response.json();
      setAnalysisResult(data);

      const updatedProfile = {
        resumeText,
        resumeScore: data.score || 80,
        summary: data.summary || "Web developer and software architect.",
        resumeFileName: "Scanned_Resume_Profile.pdf"
      };

      await updateDoc(doc(db, "candidates", userId), updatedProfile);
      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
      triggerNotification("📄 Resume Audit Completed!", `ATS score verified at ${data.score || 80}%. Compliance verified.`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Job Save / Bookmark Handler
  const handleSaveJob = async (jobId: string, remove: boolean) => {
    try {
      const currentSaved = profile?.savedJobIds || [];
      let updatedSaved;
      if (remove) {
        updatedSaved = currentSaved.filter((id: string) => id !== jobId);
      } else {
        if (currentSaved.includes(jobId)) return;
        updatedSaved = [...currentSaved, jobId];
      }

      await updateDoc(doc(db, "candidates", userId), { savedJobIds: updatedSaved });
      setProfile(prev => prev ? { ...prev, savedJobIds: updatedSaved } : null);
      triggerNotification(
        remove ? "💔 Bookmark Removed" : "❤️ Position Bookmarked", 
        remove ? "Job removed from saved pool." : "Job saved for direct ATS matching."
      );
    } catch (err) {
      console.error(err);
    }
  };

  // 3. AI Job Matching Compatibility
  const handleCheckMatch = async (job: JobPosting) => {
    if (!profile || !profile.resumeText) {
      alert("Please upload/paste your Resume text under the 'Resume & ATS Audit' tab first so the AI matcher has details to align!");
      setActiveTab("resume");
      return;
    }

    setSelectedJobForMatch(job);
    setIsMatching(true);
    setMatchResult(null);

    try {
      const response = await fetch("/api/ai-job-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: profile.resumeText,
          jobTitle: job.title,
          jobDescription: job.description,
          skillsRequired: job.skillsRequired
        })
      });
      const data = await response.json();
      setMatchResult(data);

      // Save to job_recommendations collection in Firestore
      const recDocId = `rec_${userId}_${job.id}`;
      await setDoc(doc(db, "job_recommendations", recDocId), {
        id: recDocId,
        userId,
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.companyName,
        matchPercentage: data.matchPercentage || 80,
        compatibilitySummary: data.compatibilitySummary || "High alignment based on technical criteria.",
        missingSkills: data.missingSkills || [],
        interviewTip: data.interviewTip || "Focus on articulating past distributed system scale parameters.",
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  // 4. One Click Apply Handler
  const handleOneClickApply = async (job: JobPosting) => {
    // 1. Verify authentication
    if (!userId || !auth.currentUser) {
      alert("Authentication is required. Please sign in or register to apply for jobs.");
      return;
    }

    // 2. Verify candidate profile exists
    if (!profile) {
      alert("Candidate profile is required to apply. Redirecting to Profile section...");
      setActiveTab("profile");
      return;
    }

    // 3. Verify resume exists
    const hasResume = (resumeText && resumeText.trim().length > 0) || (profile?.resumeText && profile.resumeText.trim().length > 0) || profile?.resumeFileName;
    if (!hasResume) {
      alert("A resume is required to apply for this job. Redirecting you to the Resume & ATS Audit tab to upload or paste your resume.");
      setActiveTab("resume");
      return;
    }

    // Prevent duplicate applications
    const alreadyApplied = applications.some(a => a.jobId === job.id);
    if (alreadyApplied) {
      alert(`You have already applied for the position of "${job.title}" at ${job.companyName}!`);
      return;
    }

    const appId = `app_${Math.random().toString(36).substr(2, 9)}`;
    const newApp: JobApplication = {
      id: appId,
      jobId: job.id,
      candidateId: userId,
      candidateName: userName,
      jobTitle: job.title,
      companyName: job.companyName,
      status: "Applied",
      appliedAt: new Date().toISOString(),
      resumeScore: profile?.resumeScore || 70
    };

    const newCompanyApp = {
      id: appId,
      jobId: job.id,
      jobTitle: job.title,
      candidateId: userId,
      candidateName: userName,
      candidateEmail: profile?.email || "",
      resumeUrl: profile?.resumeFileName || "gs://aijobs-resumes/resume.pdf",
      resumeScore: profile?.resumeScore || 70,
      interviewScore: profile?.aiInterviewScore || 0,
      status: "Applied",
      appliedAt: new Date().toISOString()
    };

    // Priority 3: Lead Management - Generate a lead automatically
    const leadId = `lead_${Math.random().toString(36).substr(2, 9)}`;
    const newLead = {
      id: leadId,
      candidateId: userId,
      candidateName: userName,
      email: profile?.email || auth.currentUser?.email || "candidate@aijobs.global",
      phone: profile?.phone || profile?.profileDetails?.mobileNumber || "Not Provided",
      resume: profile?.resumeFileName || profile?.resumeUrl || "No Resume Attached",
      jobId: job.id,
      jobTitle: job.title,
      company: job.companyName,
      recruiter: job.employerId || job.createdBy || "Direct Employer",
      consultancy: job.consultancy || "Direct",
      currentStatus: "Applied",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Save application
      await setDoc(doc(db, "applications", appId), newApp);
      await setDoc(doc(db, "company_applications", appId), newCompanyApp);
      
      // Save lead (Priority 3)
      await setDoc(doc(db, "leads", leadId), newLead);

      // Increment application counts (Priority 2.5)
      try {
        await updateDoc(doc(db, "jobs", job.id), {
          applicationCount: increment(1)
        });
      } catch (e) {
        console.warn("Could not increment app count in jobs collection, trying merge setDoc:", e);
        await setDoc(doc(db, "jobs", job.id), { applicationCount: 1 }, { merge: true });
      }

      try {
        await updateDoc(doc(db, "company_jobs", job.id), {
          applicationCount: increment(1)
        });
      } catch (e) {
        console.warn("Could not increment app count in company_jobs collection");
      }

      setApplications(prev => [newApp, ...prev]);
      triggerNotification("💼 Application Filed", `Submitted to "${job.title}" at ${job.companyName} with ATS compliant profile.`);
      
      // Send a "Candidate Applied" notification to the recruiter / employer
      const employerNotifId = "notif_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "notifications", employerNotifId), {
        id: employerNotifId,
        userId: job.employerId || job.createdBy || "employer",
        title: "Candidate Applied 💼",
        message: `${userName} has applied for your job opening "${job.title}". A Sourcing Lead has been automatically registered.`,
        read: false,
        type: "success",
        createdAt: new Date().toISOString()
      });

      // Send separate confirmation notification
      const confNotifId = "notif_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "notifications", confNotifId), {
        id: confNotifId,
        userId: userId,
        title: "Application Received Successfully",
        message: `Your application for "${job.title}" at ${job.companyName} has been processed. A Lead has been registered under status "Applied".`,
        read: false,
        createdAt: new Date().toISOString()
      });

      alert(`Success! Your application for "${job.title}" has been submitted to ${job.companyName}.`);
    } catch (err) {
      console.error("Error submitting application:", err);
      alert("There was an error filing your application. Please check console logs.");
    }
  };

  // 5. Start AI Interview Simulation
  const handleStartInterview = (job: JobPosting) => {
    setSelectedJobForInterview(job);
    setCurrentQuestionIndex(0);
    setEvaluations([]);
    setUserAnswer("");

    const mockQuestions = [
      { id: "q1", question: `Explain your experience with ${job.skillsRequired?.[0] || 'frontend systems'}, specifically addressing your approach to scaling state routing and Vite bundles.` },
      { id: "q2", question: `What is your standard debugging sequence when a production API returns an unexpected error, and how do you ensure zero client-side crashes?` },
      { id: "q3", question: `Describe a collaborative timeline obstacle you faced in a past engineering cycle, and how you communicated to realign stakeholders.` }
    ];

    const session: InterviewSession = {
      id: "interview_" + Math.random().toString(36).substr(2, 9),
      candidateId: userId,
      jobId: job.id,
      jobTitle: job.title,
      questions: mockQuestions,
      status: "scheduled",
      createdAt: new Date().toISOString()
    };

    setInterviewSession(session);
    setActiveTab("interview");
  };

  // 6. Submit Interview Answer
  const handleNextInterviewQuestion = async () => {
    if (!userAnswer.trim() || !interviewSession) return;
    setIsEvaluatingAnswer(true);

    const currentQuestion = interviewSession.questions[currentQuestionIndex].question;

    try {
      const response = await fetch("/api/ai-interview-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: interviewSession.jobTitle,
          question: currentQuestion,
          answer: userAnswer
        })
      });
      const data = await response.json();
      
      const evalItem = {
        ...interviewSession.questions[currentQuestionIndex],
        answer: userAnswer,
        score: data.score || 75,
        feedback: data.feedback || "Strategic answering. Technical approach verified.",
        modelAnswer: data.modelAnswer || "A complete industry-expert response."
      };

      const nextEvals = [...evaluations, evalItem];
      setEvaluations(nextEvals);
      setUserAnswer("");

      if (currentQuestionIndex < interviewSession.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        const totalScore = Math.round(nextEvals.reduce((acc, curr) => acc + (curr.score || 0), 0) / nextEvals.length);
        
        const completedSession: InterviewSession = {
          ...interviewSession,
          overallScore: totalScore,
          questions: nextEvals,
          feedback: `Simulator assessment finalized. Demonstrated secure technical architectural layouts. Ready for employer routing.`,
          status: "completed"
        };

        await setDoc(doc(db, "interviews", interviewSession.id), completedSession);
        await updateDoc(doc(db, "candidates", userId), { aiInterviewScore: totalScore });
        setProfile(prev => prev ? { ...prev, aiInterviewScore: totalScore } : null);
        triggerNotification("🤖 Interview Evaluated", `AI hiring rating completed at ${totalScore}%. Badge verification updated.`);
        setInterviewSession(completedSession);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluatingAnswer(false);
    }
  };

  // 7. Career Coach Chat
  const handleSendCoachMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachInput.trim()) return;

    const userMsg = coachInput;
    const chatMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: userMsg,
      timestamp: new Date().toISOString()
    };

    const nextHistory = [...coachHistory, chatMsg];
    setCoachHistory(nextHistory);
    setCoachInput("");
    setCoachLoading(true);

    try {
      const response = await fetch("/api/ai-career-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory: nextHistory, userMessage: userMsg })
      });
      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: "msg_" + Math.random().toString(36).substr(2, 9),
        sender: "ai",
        text: data.responseText,
        timestamp: new Date().toISOString()
      };

      const finalHistory = [...nextHistory, aiMsg];
      setCoachHistory(finalHistory);

      await updateDoc(doc(db, "candidates", userId), { careerCoachChat: finalHistory });
    } catch (err) {
      console.error(err);
    } finally {
      setCoachLoading(false);
    }
  };

  // Logged-out callback
  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 py-24 bg-[#030305] text-white" id="candidate-dashboard-loader">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="text-xs font-mono text-gray-400 animate-pulse uppercase tracking-widest">Initializing Candidate Workspace...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 glass rounded-2xl border border-red-500/20 my-24 bg-[#030305] text-white" id="candidate-dashboard-error">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto animate-bounce" />
        <h3 className="font-bold text-white text-lg">Candidate Workspace Error</h3>
        <p className="text-xs text-gray-400">{error}</p>
        <div className="flex justify-center space-x-4 pt-4">
          <button 
            onClick={() => fetchAllData()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
          >
            Retry Workspace Sync
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-300 rounded-xl transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-white transition-colors duration-300 font-sans flex flex-col bg-[#030305]`} id="candidate-workspace-root">
      
      {/* Top Header */}
      <CandidateHeader 
        userName={userName}
        userEmail={auth.currentUser?.email || ""}
        onLogout={handleLogout}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        theme={theme}
        toggleTheme={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onClearNotification={handleClearNotification}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        
        {/* Left Sidebar Menu */}
        <CandidateSidebar 
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            // Auto reset search query on certain tabs
            if (tab !== "saved-jobs" && tab !== "applied-jobs") {
              setSearchQuery("");
            }
          }}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          unreadCount={notifications.filter(n => !n.read).length}
        />

        {/* Scrolling Work Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-full">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <CandidateDashboardOverview 
              userName={userName}
              profile={profile}
              applications={applications}
              jobsCount={jobs.length}
              notifications={notifications}
              onSelectTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* TAB 2, 3, 4, 5: PROFILE INTEGRATION (Contact, Edu, Exp, Skills) */}
          {(activeTab === "profile" || activeTab === "education" || activeTab === "experience" || activeTab === "skills") && (
            <CandidateProfileSection 
              userId={userId}
              profile={profile}
              setProfile={setProfile}
              triggerNotification={triggerNotification}
              activeSubTab={activeTab as any}
            />
          )}

          {/* TAB 6: RESUME & ATS AUDIT */}
          {activeTab === "resume" && (
            <CandidateResumeSection 
              resumeText={resumeText}
              setResumeText={setResumeText}
              isAnalyzing={isAnalyzing}
              handleAnalyzeResume={handleAnalyzeResume}
              analysisResult={analysisResult}
              profile={profile}
              setProfile={setProfile}
            />
          )}

          {/* TAB 7, 8 & Explore: JOBS SECTION (Explore, Saved, Applied, Active Jobs list) */}
          {(activeTab === "explore-jobs" || activeTab === "saved-jobs" || activeTab === "applied-jobs") && (
            <CandidateJobsSection 
              userId={userId}
              profile={profile}
              jobs={jobs}
              applications={applications}
              activeTab={activeTab as any}
              onSaveJob={handleSaveJob}
              onOneClickApply={handleOneClickApply}
              onStartInterview={handleStartInterview}
              onCheckMatch={handleCheckMatch}
              selectedJobForMatch={selectedJobForMatch}
              isMatching={isMatching}
              matchResult={matchResult}
              searchQuery={searchQuery}
            />
          )}

          {/* TAB 9: NOTIFICATIONS LOGS PAGE */}
          {activeTab === "notifications" && (
            <div className="animate-in fade-in duration-300">
              <NotificationCenterView userId={userId} userRole="candidate" userName={userName} />
            </div>
          )}

          {/* TAB 10: SETTINGS PAGE */}
          {activeTab === "settings" && (
            <CandidateSettings 
              userId={userId}
              triggerNotification={triggerNotification}
            />
          )}

          {/* TAB 10B: ABAC SECURITY GUARD CONTROL */}
          {activeTab === "abac" && (
            <div className="animate-in fade-in duration-300">
              <AbacControlInspector 
                userId={userId} 
                userRole="candidate" 
                onAttributeUpdated={async () => {
                  // Reload candidate profile state
                  const docSnap = await getDoc(doc(db, "candidates", userId));
                  if (docSnap.exists()) {
                    setProfile(docSnap.data() as CandidateProfile);
                  }
                }}
              />
            </div>
          )}

          {/* TAB 11: AI INTERVIEW SIMULATION */}
          {activeTab === "interview" && (
            <CandidateInterviewSection 
              profile={profile}
              setProfile={setProfile}
              triggerNotification={triggerNotification}
            />
          )}

          {/* TAB 11b: AI REPORT PORTAL */}
          {activeTab === "ai-report" && (
            <CandidateReportSection 
              userId={userId}
              profile={profile}
              triggerNotification={triggerNotification}
            />
          )}

          {/* TAB 12: AI CAREER COACH SESSION */}
          {activeTab === "coach" && (
            <CandidateCareerCenter 
              userId={userId}
              userName={userName}
              profile={profile}
              triggerNotification={(title, message) => triggerNotification(title, message)}
              onSelectTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {/* TAB 13: SECURE LIVE CHAT WORKSPACE */}
          {activeTab === "chat" && (
            <LiveChatSection 
              currentUserId={userId}
              currentUserRole="candidate"
              currentUserName={userName}
            />
          )}

          {/* TAB 14: RECRUITER INTERVIEW SCHEDULER */}
          {activeTab === "interviews" && (
            <CandidateRecruiterInterviews 
              userId={userId}
              userName={userName}
              profile={profile}
              triggerNotification={triggerNotification}
            />
          )}

          {/* TAB 15: GOOGLE WORKSPACE HUB */}
          {activeTab === "workspace" && (
            <GoogleWorkspaceHub 
              userId={userId}
              userName={userName}
              userRole="candidate"
            />
          )}

        </main>
      </div>
    </div>
  );
}
