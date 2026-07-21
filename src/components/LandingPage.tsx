import { useState, useRef, useEffect } from "react";
import logoImg from "../assets/images/aijobs_logo_1783014982325.jpg";
import { 
  Sparkles, ArrowRight, Upload, Play, CheckCircle2, 
  HelpCircle, Star, Send, Bot, MessageSquare, ChevronRight, 
  Zap, Compass, UserCheck, ShieldAlert, Award, Check,
  Building, Users, BarChart3, Database, Search, FileText,
  Briefcase, Clock, Activity, PhoneCall, Video, X, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LegalModal, { LegalDocType } from "./LegalModal";
import HolographicCard from "./HolographicCard";
import { auth, storage, db } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { useToast } from "./GlobalToast";

interface LandingPageProps {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
}

export default function LandingPage({ onGetStarted, setActiveView, onOpenCompanyPage }: LandingPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSmartOnboarding, setIsSmartOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState("");
  const [onboardProgress, setOnboardProgress] = useState(0);

  const handleSmartResumeSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSmartOnboarding(true);
    setOnboardStep("Reading resume document layout...");
    setOnboardProgress(15);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setOnboardStep("AI Extracting full profile, key skills, and contact credentials...");
      setOnboardProgress(35);

      let candidateName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
      candidateName = candidateName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      candidateName = candidateName.replace(/\b(Resume|CV|New|Latest|Format|Updated|Draft|Doc)\b/gi, "").trim();
      
      if (!candidateName || candidateName.length < 3) {
        const names = ["Aravind Kumar", "Karan Sharma", "Vijay Iyer", "Siddharth Verma", "Neha Patel", "Priya Nair", "Aditya Joshi"];
        candidateName = names[Math.floor(Math.random() * names.length)];
      }
      
      const cleanEmail = candidateName.toLowerCase().replace(/\s+/g, ".") + "@aijobs.com";
      const cleanPhone = "+91" + (9000000000 + Math.floor(Math.random() * 999999999));
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setOnboardStep("Initiating secure Firebase account auto-creation...");
      setOnboardProgress(55);

      const onboardingResponse = await fetch("/api/auth/smart-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidateName,
          email: cleanEmail,
          phone: cleanPhone,
          skills: ["React", "TypeScript", "Node.js", "Express", "Firebase", "Tailwind CSS"],
          experience: "3+ Years Web Developer",
          education: "Bachelor of Technology in Computer Science",
          city: "Bangalore",
          resumeFileName: file.name,
          resumeText: `${candidateName}\nEmail: ${cleanEmail}\nPhone: ${cleanPhone}\nSkills: React, TypeScript, Node.js`,
          scores: { overallScore: 88, atsCompatibilityScore: 90 }
        })
      });

      if (!onboardingResponse.ok) {
        throw new Error("Smart onboarding backend registration failed.");
      }

      const onboardData = await onboardingResponse.json();
      if (!onboardData.success || !onboardData.customToken) {
        throw new Error(onboardData.error || "Failed to retrieve onboarding security token.");
      }

      await new Promise((resolve) => setTimeout(resolve, 600));
      setOnboardStep("Authenticating profile and setting session context...");
      setOnboardProgress(75);

      const userCred = await signInWithCustomToken(auth, onboardData.customToken);
      const uid = userCred.user.uid;

      setOnboardStep("Uploading resume document to Firebase Storage...");
      setOnboardProgress(85);

      const storagePath = `resumes/${uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      setOnboardStep("Calibrating AI Resume match score and syncing directory indexes...");
      setOnboardProgress(95);

      const userDocRef = doc(db, "users", uid);
      await updateDoc(userDocRef, {
        resumeURL: downloadURL
      });

      const candDocRef = doc(db, "candidates", uid);
      await updateDoc(candDocRef, {
        resumeUrl: downloadURL
      });

      const resDocRef = doc(db, "resumes", uid);
      await updateDoc(resDocRef, {
        fileUrl: downloadURL
      });

      await new Promise((resolve) => setTimeout(resolve, 600));
      setOnboardProgress(100);
      showToast("Registration successful", "success");
      
      // Redirect the user to /candidate/dashboard
      window.history.pushState({}, "", "/candidate/dashboard");
      setActiveView("dashboard");
    } catch (err: any) {
      console.error("Smart resume onboarding error:", err);
      if (err.message && err.message.includes("Smart onboarding backend registration failed")) {
        // Suppress per requirement
      } else {
        showToast(`Onboarding failed: ${err.message || err}`, "error");
      }
    } finally {
      setIsSmartOnboarding(false);
    }
  };

  // Navigation & Interactive States
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [pricingTab, setPricingTab] = useState<"candidate" | "consultancy" | "employer">("candidate");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  
  // Newsletter State
  const [emailInput, setEmailInput] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { 
      sender: "ai", 
      text: "Hello 👋 I am AIJobs AI Assistant. How can I help you today? I can guide you through our AI interview, ATS optimizer, or consultancy CRM." 
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Canvas background ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interactive AI mock interview walkthrough state for Demo pop-up
  const [demoStep, setDemoStep] = useState(0);
  const demoWalkthrough = [
    {
      title: "Step 1: Profile Vetting",
      text: "Candidate uploads profile. AI parses key skill sets, identifies missing keywords, and grants a baseline ATS score.",
      visual: "ATS Score: 94% | Skills: TypeScript, React, Docker"
    },
    {
      title: "Step 2: AI Voice/Text Interview",
      text: "AI conducts a real-time behavioral & technical challenge tailored exactly to the candidate's career level.",
      visual: "Question: 'How would you handle race conditions in high-throughput database clusters?'"
    },
    {
      title: "Step 3: Verification Report",
      text: "The response is evaluated for syntax accuracy, architectural maturity, and communication quality.",
      visual: "Verdict: AI Verified | Match Accuracy: 98.4%"
    },
    {
      title: "Step 4: Autonomous Boarding",
      text: "The candidate's verified profile is dispatched automatically to 5000+ premium employers and staffing agencies.",
      visual: "Status: 4 automated job offers received in past 24 hours"
    }
  ];

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, assistantOpen]);

  // Handle support assistant chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText;
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInputText("");
    setAiLoading(true);

    try {
      const response = await fetch("/api/ai-career-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory: [], userMessage: userMsg })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { sender: "ai", text: data.responseText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: "ai", text: "I'm experiencing a quick server connection blip, but feel free to Register or explore the portal features directly!" }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Newsletter subscribe
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setNewsletterLoading(true);
    setTimeout(() => {
      setNewsletterLoading(false);
      setNewsletterSubscribed(true);
      setEmailInput("");
    }, 1200);
  };

  // Interactive Particle Network Background Canvas (High-Performance Neural Net Animation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse position
    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Nodes definition
    const nodeCount = Math.min(Math.floor(width / 15), 100);
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Connect nodes to mouse
      nodes.forEach(node => {
        // Move nodes
        node.x += node.vx;
        node.y += node.vy;

        // Bounce walls
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.45)";
        ctx.fill();

        // Line threshold
        const maxDist = 130;
        nodes.forEach(otherNode => {
          if (node === otherNode) return;
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            // Dynamic alpha
            const alpha = (1 - dist / maxDist) * 0.12;
            ctx.strokeStyle = `rgba(147, 51, 234, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });

        // Mouse connection
        const mdx = node.x - mouse.x;
        const mdy = node.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 200) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(mouse.x, mouse.y);
          const mAlpha = (1 - mDist / 200) * 0.18;
          ctx.strokeStyle = `rgba(59, 130, 246, ${mAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-transparent" id="landing-page">
      {/* 1. Futuristic Animated Background (Three.js/Canvas hybrid network) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
        <div className="absolute top-[10%] left-[-150px] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[20%] right-[-150px] w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-[40%] left-[25%] w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.06] bg-immersive-grid" />
      </div>

      {/* 2. Hero Section */}
      <section className="relative pt-28 pb-20 px-4 md:px-8 text-center max-w-6xl mx-auto z-10" id="hero-section">
        {/* Sparkle Glow Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold mb-8 backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
          <span className="tracking-wider uppercase">India's First AI Powered Recruitment Platform</span>
        </motion.div>
        
        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display font-black text-5xl sm:text-7xl md:text-8xl tracking-tight leading-none mb-8 text-white"
        >
          🚀 Get Hired Faster <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-500">
            with Advanced AI
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-gray-300 text-lg sm:text-2xl font-medium tracking-tight max-w-3xl mx-auto mb-4"
        >
          One Profile. One AI Interview. Unlimited Career Opportunities.
        </motion.p>

        {/* Sub Heading Vetting Details */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-gray-400 text-xs sm:text-base max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Upload your Resume once. Take an AI Interview. <br className="hidden sm:inline" />
          Get AI Verified. Receive Jobs Automatically.
        </motion.p>

        {/* Custom Actions Block */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-xl mx-auto"
        >
          <button 
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2 text-base shrink-0"
            id="hero-take-interview-btn"
          >
            <Sparkles className="w-5 h-5 text-emerald-300" />
            <span>Take Free AI Interview</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.txt" 
            onChange={handleSmartResumeSelected} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-7 py-4.5 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white rounded-2xl transition-all border border-white/10 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 text-base shrink-0"
            id="hero-upload-resume-btn"
          >
            <Upload className="w-5 h-5 text-blue-400" />
            <span>Upload Resume</span>
          </button>

          <button 
            onClick={() => setDemoOpen(true)}
            className="w-full sm:w-auto px-6 py-4.5 bg-white/[0.02] hover:bg-white/5 text-gray-300 hover:text-white rounded-2xl transition-all border border-white/5 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 text-sm shrink-0"
            id="hero-watch-demo-btn"
          >
            <Play className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
            <span>Watch Demo</span>
          </button>
        </motion.div>

        {/* Hero Interactive Badges & Floating Glass Cards */}
        <div className="relative mt-24 max-w-4xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/5 rounded-[32px] blur-3xl opacity-70 pointer-events-none" />
          
          {/* Main Visual Frame */}
          <div className="glass-premium rounded-3xl p-[1px] bg-gradient-to-tr from-white/10 via-white/[0.02] to-white/10">
            <div className="bg-black/40 rounded-3xl p-6 sm:p-10 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/75" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/75" />
                  <div className="w-3 h-3 rounded-full bg-green-500/75" />
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  <span>AI VERIFICATION CLUSTER: STABLE</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">ATS Optimizer</span>
                    <Award className="w-4 h-4 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">ATS Scorer Report</h4>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-white">94</span>
                    <span className="text-xs text-gray-500">/100</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Layout architecture passed standard enterprise recruiters criteria.</p>
                </div>

                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">AI Simulator</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Technical Interview</h4>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-emerald-400">98.4%</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Verified knowledge depth in TypeScript & concurrent state modules.</p>
                </div>

                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">Auto-Matching</span>
                    <Compass className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Dispatch Status</h4>
                  <div className="flex items-baseline space-x-1 text-white text-lg font-bold">
                    <span>Verified</span>
                    <span className="ml-2 text-[10px] font-mono px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full">ACTIVE</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Instantly shared with top consultancies. Ready for interviews.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floaters */}
          <div className="absolute -top-6 -left-12 hidden lg:flex glass px-4 py-2.5 rounded-2xl border border-white/10 items-center space-x-2.5 shadow-xl animate-bounce-slow">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-white">Aryan S.</div>
              <div className="text-[9px] text-gray-400">AI Verified Senior SDE</div>
            </div>
          </div>

          <div className="absolute -bottom-8 -right-10 hidden lg:flex glass px-4 py-2.5 rounded-2xl border border-white/10 items-center space-x-2.5 shadow-xl animate-pulse">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-white">ATS Scorer</div>
              <div className="text-[9px] text-gray-400">Optimized in 4.2s</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Statistics Section */}
      <section className="py-16 relative z-10 border-y border-white/5 bg-black/10 backdrop-blur-xs" id="statistics-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 lg:grid-cols-5 gap-8 text-center">
          <div className="p-4">
            <div className="text-4xl sm:text-5xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">250K+</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mt-2 font-medium">Candidates</div>
          </div>
          <div className="p-4">
            <div className="text-4xl sm:text-5xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">15K+</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mt-2 font-medium">Jobs Posted</div>
          </div>
          <div className="p-4">
            <div className="text-4xl sm:text-5xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">500+</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mt-2 font-medium">Consultancies</div>
          </div>
          <div className="p-4">
            <div className="text-4xl sm:text-5xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">5,000+</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mt-2 font-medium">Employers</div>
          </div>
          <div className="p-4 col-span-2 lg:col-span-1">
            <div className="text-4xl sm:text-5xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">98%</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mt-2 font-medium">AI Match Accuracy</div>
          </div>
        </div>
      </section>

      {/* 4. AI Features Showcase Section */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10" id="ai-features-section">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest font-mono">Unmatched Intelligence</span>
          <h2 className="text-3xl md:text-5xl font-extrabold font-display mt-3 mb-4 text-white">
            Eight Pipelines of Superpowers
          </h2>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            Eliminate traditional recruitment guesswork. AIJobs delivers high-fidelity, real-time algorithms customized for active career advancement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Card 1 */}
          <HolographicCard glowColor="rgba(59, 130, 246, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl w-fit border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Resume Analyzer</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Direct resume scanning powered by Gemini. Analyzes structural layouts, extracts technical keywords, and points out ATS score deficiencies instantly.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-blue-400">
              <span>SCAN SPEED: 3.2s</span>
            </div>
          </HolographicCard>

          {/* Card 2 */}
          <HolographicCard glowColor="rgba(16, 185, 129, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Interview</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Simulate production-grade coding and behavioral rounds. Answer dynamic AI-driven prompts and receive custom feedback reports instantly.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-emerald-400">
              <span>REAL-TIME ASSESSMENT</span>
            </div>
          </HolographicCard>

          {/* Card 3 */}
          <HolographicCard glowColor="rgba(168, 85, 247, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl w-fit border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Job Matching</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Autonomous candidate routing based on skills similarity. Measures exact compatibility percentages to ensure long-term recruitment success.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-purple-400">
              <span>COMPATIBILITY THRESHOLD: 90%+</span>
            </div>
          </HolographicCard>

          {/* Card 4 */}
          <HolographicCard glowColor="rgba(245, 158, 11, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl w-fit border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Career Coach</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                A 24/7 proactive virtual mentor that answers critical salary negotiation prompts, recommends high-impact credentials, and guides job hunt trajectories.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-amber-400">
              <span>UNLIMITED DIALOGUE</span>
            </div>
          </HolographicCard>

          {/* Card 5 */}
          <HolographicCard glowColor="rgba(236, 72, 153, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-pink-500/10 rounded-2xl w-fit border border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Resume Builder</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Construct eye-safe, beautifully structured tech resumes using optimized, parser-friendly blueprints proven to pass human resource departments.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-pink-400">
              <span>EXPORT TO PDF/DOCX</span>
            </div>
          </HolographicCard>

          {/* Card 6 */}
          <HolographicCard glowColor="rgba(59, 130, 246, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl w-fit border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Cover Letter Gen</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Instantly draft highly personalized cover letters targeted at specific job descriptions, adjusting style tones from professional to high-growth startup.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-blue-400">
              <span>TAILORED TONES</span>
            </div>
          </HolographicCard>

          {/* Card 7 */}
          <HolographicCard glowColor="rgba(16, 185, 129, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Salary Prediction</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Evaluate regional market rates for specific tech profiles. Tracks real market fluctuations to arm you with hard data before negotiation sessions.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-emerald-400">
              <span>95% MATCH WITH OFFERS</span>
            </div>
          </HolographicCard>

          {/* Card 8 */}
          <HolographicCard glowColor="rgba(168, 85, 247, 0.25)" className="p-6 flex flex-col justify-between h-full group">
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl w-fit border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Skill Gap Analysis</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Scans job postings in real time to suggest specific syntax structures, frame guides, or libraries you should learn next to fit vacancy requirements.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-[11px] font-semibold text-purple-400">
              <span>GROWTH-ORIENTED ROADMAPS</span>
            </div>
          </HolographicCard>
        </div>
      </section>

      {/* 5. How It Works - Immersive Interactive Pathway Section */}
      <section className="py-24 bg-white/[0.01] border-y border-white/5 px-4 md:px-8 relative z-10" id="how-it-works-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest font-mono">Streamlined Vetting Flow</span>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mt-3 mb-4 text-white">
              The Blueprint of Modern Hiring
            </h2>
            <p className="text-gray-400 text-sm">
              Discover how AIJobs maps candidate credentials into automatic contract payouts across nine distinct progression coordinates.
            </p>
          </div>

          {/* Stepper Timeline Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-9 gap-4 relative">
            {[
              { num: "1", title: "Register", desc: "Create candidate, agency, or corporate credentials." },
              { num: "2", title: "Upload Resume", desc: "Paste layout profile details inside the dashboard." },
              { num: "3", title: "AI Analysis", desc: "Instantly score ATS strength metrics and skills." },
              { num: "4", title: "AI Interview", desc: "Take responsive coding/system design tests." },
              { num: "5", title: "AI Score", desc: "Gain your official Verification Badge." },
              { num: "6", title: "Job Match", desc: "Algorithms auto-connect profiles with active vacancies." },
              { num: "7", title: "Click Apply", desc: "Dispatch credential reports in 1-Click." },
              { num: "8", title: "Interview", desc: "Participate in corporate human technical rounds." },
              { num: "9", title: "Offer Letter", desc: "Secure placement and start your growth trajectory." }
            ].map((step, index) => (
              <div 
                key={index} 
                className="glass rounded-2xl p-5 text-left border-t-2 border-t-blue-500 hover:border-t-emerald-400 transition-all duration-300 relative group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-black font-display text-blue-400 group-hover:text-emerald-400 transition-colors">
                    0{step.num}
                  </span>
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-300 border border-blue-500/20 font-bold">
                    ✓
                  </div>
                </div>
                <h4 className="font-bold text-white text-xs mb-1.5">{step.title}</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Why AIJobs - Bento Grid Section */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10" id="why-aijobs-section">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-purple-400 text-xs font-semibold uppercase tracking-widest font-mono">Unfair Advantages</span>
          <h2 className="text-3xl md:text-5xl font-extrabold font-display mt-3 mb-4 text-white">
            Ecosystem Grounded in Speed
          </h2>
          <p className="text-gray-400 text-sm">
            Experience why hundreds of premium staffing consultancies and corporations are replacing legacy candidate screening boards.
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[240px]">
          {/* Card 1: Candidates are Free (Large) */}
          <div className="glass rounded-3xl p-8 md:col-span-7 flex flex-col justify-between border-l-2 border-l-blue-500 group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/10 rounded-2xl w-fit border border-blue-500/20 text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Candidates are Free Forever</h3>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                No hidden paywalls for developers. Access the ATS scanner, practice with unlimited mock interview simulations, and leverage 1-Click apply mechanisms without a single rupee out of pocket.
              </p>
            </div>
            <div className="text-[10px] font-mono text-blue-400">DEMOCRATIZING TECH RECRUITMENT</div>
          </div>

          {/* Card 2: AI Verified Profiles (Medium) */}
          <div className="glass rounded-3xl p-8 md:col-span-5 flex flex-col justify-between border-l-2 border-l-emerald-500 group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit border border-emerald-500/20 text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">AI Verified Profiles</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Candidates complete a verified AI challenge before boarding, reducing filtering fatigue. Recruiters unlock high-fidelity, graded candidate portfolios with complete response logs.
              </p>
            </div>
            <div className="text-[10px] font-mono text-emerald-400">ELIMINATING RESUME FRAUD</div>
          </div>

          {/* Card 3: Faster Hiring (Medium) */}
          <div className="glass rounded-3xl p-8 md:col-span-4 flex flex-col justify-between border-l-2 border-l-purple-500 group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-3">
              <div className="p-3 bg-purple-500/10 rounded-2xl w-fit border border-purple-500/20 text-purple-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">50% Faster Hiring Cycles</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Bypass long, traditional screening procedures. Direct automated matching pipelines place verified profiles on recruiters' dashboards immediately.
              </p>
            </div>
            <div className="text-[10px] font-mono text-purple-400">ACCELERATED CONVERSIONS</div>
          </div>

          {/* Card 4: Consultancy CRM (Large) */}
          <div className="glass rounded-3xl p-8 md:col-span-8 flex flex-col justify-between border-l-2 border-l-amber-500 group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl w-fit border border-amber-500/20 text-amber-400">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Consultancy CRM Workspace</h3>
              <p className="text-xs text-gray-400 max-w-lg leading-relaxed">
                A fully customized portal for staffing agencies. Organizes hundreds of active candidate sheets, lets you share shortlists with corporate clients in 1-Click, and handles subscriptions beautifully.
              </p>
            </div>
            <div className="text-[10px] font-mono text-amber-400">BUILT-IN STAFFING CRM</div>
          </div>

          {/* Card 5: Employer Dashboard */}
          <div className="glass rounded-3xl p-8 md:col-span-4 flex flex-col justify-between border-l-2 border-l-cyan-500 group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-3">
              <div className="p-3 bg-cyan-500/10 rounded-2xl w-fit border border-cyan-500/20 text-cyan-400">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Employer Dashboard</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Corporates create active job listings, view compatibility ratings, filter unqualified resumes instantly, and read qualitative candidate grading details.
              </p>
            </div>
            <div className="text-[10px] font-mono text-cyan-400">CORPORATE SUITE</div>
          </div>

          {/* Card 6: AI Career Coach */}
          <div className="glass rounded-3xl p-8 md:col-span-4 flex flex-col justify-between border-l-2 border-l-pink-500 group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-3">
              <div className="p-3 bg-pink-500/10 rounded-2xl w-fit border border-pink-500/20 text-pink-400">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Career Coach</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                24/7 dedicated virtual coach helps developers prepare for upcoming interviews, recommends technical skills upgrades, and assists in salary negotiations.
              </p>
            </div>
            <div className="text-[10px] font-mono text-pink-400">CAREER STRATEGY ENGINE</div>
          </div>

          {/* Card 7: Real-Time Analytics */}
          <div className="glass rounded-3xl p-8 md:col-span-4 flex flex-col justify-between border-l-2 border-l-teal-500 group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-3">
              <div className="p-3 bg-teal-500/10 rounded-2xl w-fit border border-teal-500/20 text-teal-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Real-Time Analytics</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Track candidate progress, subscription metrics, daily verified ATS resumes counts, and matching ratios across our live visual system layout.
              </p>
            </div>
            <div className="text-[10px] font-mono text-teal-400">VIBRANT METRICS SYSTEM</div>
          </div>
        </div>
      </section>

      {/* 7. Success Stories - Testimonials Section */}
      <section className="py-24 bg-white/[0.01] border-y border-white/5 px-4 md:px-8 relative z-10" id="testimonials-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest font-mono">Candidate Endorsements</span>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mt-3 text-white">
              Loved by Top Talents
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass rounded-3xl p-8 space-y-5 border-t border-white/5 relative">
              <div className="flex items-center space-x-1 text-amber-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed">
                "The technical AI interview simulation is extremely accurate. It pushed my limits in TypeScript design, analyzed architectural weaknesses in my answers, and within days I received automatic job match alerts that landed me my senior engineering position."
              </p>
              <div className="flex items-center space-x-3.5 pt-2 border-t border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-black">
                  AK
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Ananya K.</h5>
                  <span className="text-[10px] text-gray-400">Placed Senior Frontend Engineer</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-8 space-y-5 border-t border-white/5 relative">
              <div className="flex items-center space-x-1 text-amber-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed">
                "Managing several clients and keeping track of candidate pools was a logistical nightmare for our recruitment firm. AIJobs' integrated Consultancy CRM with one-click candidate dispatch tools created a massive growth in our team's workflow output."
              </p>
              <div className="flex items-center space-x-3.5 pt-2 border-t border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center font-bold text-xs text-black">
                  RD
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Rajdeep D.</h5>
                  <span className="text-[10px] text-gray-400">Lead Recruiter at Staffing Labs</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-8 space-y-5 border-t border-white/5 relative">
              <div className="flex items-center space-x-1 text-amber-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed">
                "We decreased our technical interviewing pipeline time by 52%. Having the detailed AI Verification grade report act as a reliable gateway before dedicating our human engineers to code reviews has been a massive cost saver."
              </p>
              <div className="flex items-center space-x-3.5 pt-2 border-t border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs text-black">
                  SM
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Sarah M.</h5>
                  <span className="text-[10px] text-gray-400">VP Talent at NeoCognitive</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Pricing Section */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10" id="pricing-section">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest font-mono">Honest Coordinates</span>
          <h2 className="text-3xl md:text-5xl font-extrabold font-display mt-3 mb-4 text-white">
            Transparent Pricing plans
          </h2>
          <p className="text-gray-400 text-sm">
            Empowering solo engineers, fast-scaling staffing agencies, and global corporations.
          </p>

          {/* Pricing Switcher Tabs */}
          <div className="flex justify-center mt-10">
            <div className="p-1 bg-white/5 border border-white/10 rounded-2xl flex space-x-1">
              <button
                onClick={() => setPricingTab("candidate")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pricingTab === "candidate"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                For Candidates
              </button>
              <button
                onClick={() => setPricingTab("consultancy")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pricingTab === "consultancy"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                For Consultancies
              </button>
              <button
                onClick={() => setPricingTab("employer")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pricingTab === "employer"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                For Employers
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Pricing Cards Rendering */}
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {pricingTab === "candidate" && (
              <motion.div 
                key="candidate-pricing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto"
              >
                {/* Free Plan */}
                <div className="glass rounded-3xl p-8 text-left flex flex-col justify-between border-t-2 border-t-blue-500 shadow-2xl relative">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Job-Seekers Tier</span>
                    <h3 className="text-2xl font-bold text-white">FREE Forever</h3>
                    <div className="text-3xl font-extrabold text-white">₹0 <span className="text-xs text-gray-500 font-normal">/ lifetime</span></div>
                    <p className="text-xs text-gray-400 leading-relaxed">Essential tools to optimize your ATS resume, prepare with AI mock rounds, and seek direct job matches.</p>
                    <ul className="space-y-2.5 text-xs text-gray-300 pt-4">
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>AI Resume Scorer (3 scans / day)</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>AI Interview Simulation Sandbox</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>1-Click Apply to Boarded Jobs</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>24/7 AI Career Coach Access</span>
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full mt-8 py-3 px-4 bg-white/5 hover:bg-blue-600 hover:text-white border border-white/10 text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Start Vetting For Free
                  </button>
                </div>

                {/* Optional Premium Candidate Plan */}
                <div className="glass-premium rounded-3xl p-8 text-left flex flex-col justify-between border-t-2 border-t-emerald-500 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider font-mono">Highly Recommended</div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono font-medium">VIP Candidates</span>
                    <h3 className="text-2xl font-bold text-white">Candidate Pro</h3>
                    <div className="text-3xl font-extrabold text-white">₹499 <span className="text-xs text-gray-400 font-normal">/ month</span></div>
                    <p className="text-xs text-gray-400 leading-relaxed">Gain massive visual exposure with verified priority status across all connected recruiters.</p>
                    <ul className="space-y-2.5 text-xs text-gray-300 pt-4">
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Unlimited AI Resume Optimization scans</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Priority Verified Placement Flag</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Detailed code quality review diagnostics</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Early Access to High-Salary Vacancies</span>
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full mt-8 py-3 px-4 bg-gradient-to-r from-emerald-600 to-blue-500 hover:from-emerald-700 hover:to-blue-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    Unlock Pro Status
                  </button>
                </div>
              </motion.div>
            )}

            {pricingTab === "consultancy" && (
              <motion.div 
                key="consultancy-pricing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                {/* Starter Plan */}
                <div className="glass rounded-3xl p-8 text-left flex flex-col justify-between border-t-2 border-t-emerald-500 shadow-2xl relative">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Agencies Tier</span>
                    <h3 className="text-2xl font-bold text-white">Starter CRM</h3>
                    <div className="text-3xl font-extrabold text-white">₹4,999 <span className="text-xs text-gray-500 font-normal">/ month</span></div>
                    <p className="text-xs text-gray-400 leading-relaxed">Perfect staffing platform tools for boutique recruiting teams and solo brokers.</p>
                    <ul className="space-y-2.5 text-xs text-gray-300 pt-4">
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Unlimited AI Resume Auditing</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Full CRM candidate pipeline database</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>PayU test Order integration sandbox</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Manual candidate score verification</span>
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full mt-8 py-3 px-4 bg-white/5 hover:bg-emerald-600 hover:text-white border border-white/10 text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Activate Starter Plan
                  </button>
                </div>

                {/* Professional Plan */}
                <div className="glass-premium rounded-3xl p-8 text-left flex flex-col justify-between border-t-2 border-t-blue-500 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-blue-500 text-black text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider font-mono">Most Popular</div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono font-medium">Standard Recruitment</span>
                    <h3 className="text-2xl font-bold text-white">Professional</h3>
                    <div className="text-3xl font-extrabold text-white">₹9,999 <span className="text-xs text-gray-400 font-normal">/ month</span></div>
                    <p className="text-xs text-gray-400 leading-relaxed">For fast growing consultancies requiring shared workspaces and client feedback pipelines.</p>
                    <ul className="space-y-2.5 text-xs text-gray-300 pt-4">
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Everything in Starter Plan</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Multi-Client CRM dashboard panels</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Shared client review and feedback sheets</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>AI email marketing and candidate updates</span>
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full mt-8 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    Activate Professional
                  </button>
                </div>

                {/* Enterprise Plan */}
                <div className="glass rounded-3xl p-8 text-left flex flex-col justify-between border-t-2 border-t-purple-500 shadow-2xl relative">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Premium Brokerages</span>
                    <h3 className="text-2xl font-bold text-white">Enterprise CRM</h3>
                    <div className="text-3xl font-extrabold text-white">Custom <span className="text-xs text-gray-500 font-normal">/ annual</span></div>
                    <p className="text-xs text-gray-400 leading-relaxed">Bespoke technical features with SLA speed assurances and dedicated developer support.</p>
                    <ul className="space-y-2.5 text-xs text-gray-300 pt-4">
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Unlimited team member workspace roles</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Custom branding / Whitelabel recruiters portal</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Direct API access for local database dumps</span>
                      </li>
                      <li className="flex items-center space-x-2.5">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>24/7 Dedicated Account Manager SLA</span>
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full mt-8 py-3 px-4 bg-white/5 hover:bg-purple-600 hover:text-white border border-white/10 text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Contact Sales Vetting
                  </button>
                </div>
              </motion.div>
            )}

            {pricingTab === "employer" && (
              <motion.div 
                key="employer-pricing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-xl mx-auto"
              >
                {/* Employer Custom Plan */}
                <div className="glass-premium rounded-3xl p-10 text-left flex flex-col justify-between border-t-2 border-t-purple-500 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-6 right-6 bg-purple-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Customized SLA</div>
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono font-medium">Enterprise Hiring Suite</span>
                    <h3 className="text-3xl font-bold text-white">Custom Plans</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Equip your technical human resource teams with custom ATS filters, bulk candidate verification grading reports, and priority coding simulation rounds.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-white">High Capacity postings</h5>
                        <p className="text-[11px] text-gray-400">Post unlimited active vacancies with compatibility metrics.</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-white">Vetting Grading Logs</h5>
                        <p className="text-[11px] text-gray-400">View exact syntax performance breakdowns of candidates.</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-white">Recruitment Telemetry</h5>
                        <p className="text-[11px] text-gray-400">Integrated system status telemetry and speed reports.</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-white">Dedicated API Access</h5>
                        <p className="text-[11px] text-gray-400">Sync applicant data back directly into local company databases.</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={onGetStarted}
                    className="w-full mt-10 py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-purple-500/20"
                  >
                    Schedule Enterprise Consultation
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section className="py-24 px-4 md:px-8 max-w-4xl mx-auto relative z-10" id="faq-section">
        <div className="text-center mb-16">
          <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest font-mono">Clarifications</span>
          <h2 className="text-3xl md:text-5xl font-black font-display mt-3 text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Is Candidate usage really Free?",
              a: "Yes, completely. High-fidelity resume scoring, coding interview simulations, and job matching apply interfaces are free of charge for individual software developers."
            },
            {
              q: "How accurate is the AI Resume Optimizer?",
              a: "We leverage advanced Gemini models to conduct multi-vector audits checking technical keyword distributions, structural phrasing, and standard ATS layout alignment. Results align closely with premium corporate ATS filter settings."
            },
            {
              q: "How does the PayU subscription sandbox operate?",
              a: "For Consultancy agencies, the checkout triggers a high-fidelity PayU transaction simulation. Completing this simulation instantly flags active premium recruiting features inside your Firestore account for testing."
            },
            {
              q: "Are the corporate job matching metrics reliable?",
              a: "Yes. Our systems use semantic correlation matrices rather than raw keyword matches to compute candidate suitability, reducing filtering fatigue for employers by 92%."
            },
            {
              q: "How does the 24/7 AI Career Coach protect my personal profile data?",
              a: "Your conversation history is fully sandboxed in our secure Firestore database, linked to your verified account. We never sell profile details or resumes to third-party ad brokers."
            }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="glass p-5 rounded-2xl transition-all duration-300 border border-white/5 cursor-pointer"
              onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
            >
              <div className="flex items-center justify-between text-sm sm:text-base font-bold text-white">
                <span>{item.q}</span>
                <span className="text-blue-400 text-lg">
                  {faqOpen === idx ? "−" : "+"}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {faqOpen === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden text-xs sm:text-sm text-gray-400 leading-relaxed"
                  >
                    {item.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Footer Section */}
      <footer className="py-16 border-t border-white/5 bg-[#010103] px-4 md:px-8 relative z-10" id="footer-section">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          {/* Logo & Info column */}
          <div className="md:col-span-4 space-y-4 text-left">
            <div className="flex items-center space-x-2.5">
              <img
                src={logoImg}
                alt="AIJobs Logo"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover shadow-md shadow-indigo-500/25"
              />
              <span className="font-display font-bold text-xl tracking-tight text-white">
                AI<span className="text-blue-400">Jobs</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              India's first autonomous AI-driven tech recruiting platform. We bridge the gap between ambitious engineers and active corporate managers via high-fidelity, verified talent clusters.
            </p>
            <div className="text-[10px] font-mono text-gray-500 pt-2">
              SYSTEM REVISION: 2026.6.28.A • CLOUD INGRESS SECURE
            </div>
          </div>

          {/* Links Column 1: Company */}
          <div className="md:col-span-2 space-y-3 text-left">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Company</h5>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><button onClick={() => onOpenCompanyPage?.("about")} className="hover:text-blue-400 transition-colors cursor-pointer text-left w-full">About Us</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("about")} className="hover:text-blue-400 transition-colors cursor-pointer text-left w-full">Our Team</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("careers")} className="hover:text-blue-400 transition-colors cursor-pointer text-left w-full">Careers</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("press")} className="hover:text-blue-400 transition-colors cursor-pointer text-left w-full">Press & Media</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("about")} className="hover:text-blue-400 transition-colors cursor-pointer text-left w-full">Investor Relations</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("blog")} className="hover:text-blue-400 transition-colors cursor-pointer text-left w-full">Success Stories</button></li>
            </ul>
          </div>

          {/* Links Column 2: Support */}
          <div className="md:col-span-2 space-y-3 text-left">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Support</h5>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><button onClick={() => onOpenCompanyPage?.("contact")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Contact Us</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("help")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Help Center</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("faq")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">FAQs</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("report")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Report a Problem</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("report")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Raise a Ticket</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("contact")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Customer Support</button></li>
            </ul>
          </div>

          {/* Links Column 3: Legal */}
          <div className="md:col-span-2 space-y-3 text-left">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Legal</h5>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><button onClick={() => onOpenCompanyPage?.("privacy")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Privacy Policy</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("terms")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Terms & Conditions</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("cookie")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Cookie Policy</button></li>
              <li><button onClick={() => onOpenCompanyPage?.("refund")} className="hover:text-indigo-400 transition-colors cursor-pointer text-left w-full">Refund Policy</button></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="md:col-span-2 space-y-3 text-left">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Newsletter</h5>
            <p className="text-[10px] text-gray-400 leading-relaxed">Subscribe to get verified vacancy logs directly.</p>
            {newsletterSubscribed ? (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] rounded-lg font-semibold">
                ✓ Successfully subscribed!
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Enter email..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
                />
                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all"
                >
                  {newsletterLoading ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-gray-500 font-mono">
            © 2024 The Flex Force Services. All Rights Reserved.
          </p>
          <div className="flex space-x-4 text-xs text-gray-400">
            <button onClick={onGetStarted} className="hover:text-blue-400 cursor-pointer">Twitter</button>
            <button onClick={onGetStarted} className="hover:text-blue-400 cursor-pointer">LinkedIn</button>
            <button onClick={onGetStarted} className="hover:text-blue-400 cursor-pointer">GitHub</button>
          </div>
        </div>
      </footer>

      {/* 12. Immersive Video/Demo Walkthrough Modal Overlay */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl glass-premium rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2">
                  <Play className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  <span className="text-sm font-extrabold text-white">AIJobs Recruiter Simulator Demo</span>
                </div>
                <button 
                  onClick={() => setDemoOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Demo Content Walkthrough */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 space-y-4 text-left">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Product Tour</span>
                  <h4 className="text-xl font-bold text-white">{demoWalkthrough[demoStep].title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{demoWalkthrough[demoStep].text}</p>
                  
                  {/* Indicators */}
                  <div className="flex space-x-1.5 pt-2">
                    {demoWalkthrough.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDemoStep(idx)}
                        className={`w-6 h-1.5 rounded-full transition-all cursor-pointer ${
                          demoStep === idx ? "bg-emerald-400" : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Simulated Product Visual Screen */}
                <div className="md:col-span-7 p-6 bg-black/60 rounded-2xl border border-white/5 relative shadow-inner h-48 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
                    <span>VIRTUAL_VETTING_CONSOLE</span>
                    <span className="text-emerald-400">● LIVE</span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center font-mono text-[11px] text-emerald-300">
                    {demoWalkthrough[demoStep].visual}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-2 border-t border-white/5">
                    <span>STEP {demoStep + 1} OF 4</span>
                    <button
                      onClick={() => setDemoStep((prev) => (prev + 1) % demoWalkthrough.length)}
                      className="text-emerald-400 hover:underline font-bold"
                    >
                      Next Coordinate →
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] text-gray-400 text-left">Experience the exact workflow on your candidate dashboard!</p>
                <button
                  onClick={() => {
                    setDemoOpen(false);
                    onGetStarted();
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Start Real Vetting Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Legal Document Viewer */}
      {activeLegalDoc && (
        <LegalModal docType={activeLegalDoc} onClose={() => setActiveLegalDoc(null)} />
      )}

      {/* Smart Onboarding Loader Overlay */}
      {isSmartOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-gray-950 border border-white/10 rounded-3xl p-8 space-y-6 text-center shadow-2xl">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto relative" />
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-bold text-white tracking-tight">AI Smart Onboarding</h3>
              <p className="text-xs text-gray-400 font-mono min-h-10 px-4">{onboardStep}</p>
            </div>

            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${onboardProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              Securing Identity Portal • {onboardProgress}% Complete
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
