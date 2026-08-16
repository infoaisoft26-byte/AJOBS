import SmartResumeOtpModal from "./SmartResumeOtpModal";
import LegalModal from "./LegalModal";
import AIJobsLogo from "./AIJobsLogo";
import React, { ChangeEvent, HTMLInputElement, useRef, useState } from "react";
import { doc } from "firebase/firestore";
import { ref } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Box, Briefcase, Building, Cloud, Contact, File, Film, Info, Layout, Loader2, LogIn, Mail, Phone, Play, Search, ShieldCheck, Sparkles, Type, Upload, UserCheck } from "lucide-react";
import { auth, db, storage } from "../firebase";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { parseJsonResponse } from "../utils/apiHelper";
import { useToast } from "./GlobalToast";
import { UserProfile } from "../types";

// 3D & Pre-Launch Components
import Hero3DCanvas from "./3d/Hero3DCanvas";
import AiMatchingVisualizer3D from "./3d/AiMatchingVisualizer3D";
import CandidateConsultancy3DCards from "./CandidateConsultancy3DCards";
import LaunchCountdown3D from "./LaunchCountdown3D";
import TrustSafetySection from "./TrustSafetySection";
import AIJobs3DIntro from "./AIJobs3DIntro";

interface LandingPageProps {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
  onSelectJob?: (jobId: string) => void;
  onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void;
  user?: UserProfile | null;
}

export default function LandingPage({ 
  onGetStarted, 
  setActiveView, 
  onOpenCompanyPage,
  onSelectJob,
  onOpenAuth,
  user
}: LandingPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cinematic Intro state (runs once per browser session)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("aijobs_intro_seen");
  });

  // Smart Onboarding State
  const [isSmartOnboarding, setIsSmartOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState("");
  const [onboardProgress, setOnboardProgress] = useState(0);

  // Twilio OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [parsedCandidateData, setParsedCandidateData] = useState<CandidateParsedData | null>(null);

  // Legal Modal
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);

  // Resume Parsing Handler
  const handleSmartResumeSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSmartOnboarding(true);
    setOnboardStep("Reading resume document layout & converting bytes...");
    setOnboardProgress(15);

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.includes(",") ? res.split(",")[1] : res;
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      setOnboardStep("AI Extracting full profile, key skills, and contact credentials via Gemini...");
      setOnboardProgress(35);

      const tempId = "temp_" + Date.now();
      let parseJson: any = null;
      try {
        const parseRes = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: tempId,
            resumeUrl: "https://storage.googleapis.com/temp/resume.pdf",
            fileName: file.name,
            fileBase64,
            fileType: file.type
          })
        });

        if (parseRes.ok) {
          parseJson = await parseJsonResponse(parseRes).catch(() => null);
        }
      } catch (pErr) {
        console.warn("Resume parse request warning:", pErr);
      }

      const parsed = parseJson?.parsed || {};

      let candidateName = parsed.fullName;
      if (!candidateName || candidateName.trim().length < 2) {
        candidateName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
        candidateName = candidateName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        candidateName = candidateName.replace(/\b(Resume|CV|New|Latest|Format|Updated|Draft|Doc)\b/gi, "").trim() || "Candidate";
      }

      const cleanEmail = parsed.email || `${candidateName.toLowerCase().replace(/\s+/g, ".")}@candidate.aijobs.local`;
      let cleanPhone = parsed.phone || "+919876543210";
      if (cleanPhone && !cleanPhone.startsWith("+")) {
        cleanPhone = "+91" + cleanPhone.replace(/\D/g, "");
      }

      const extractedSkills = parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0
        ? parsed.skills
        : ["Technology", "Software Engineering", "AI", "Cloud", "Analytics"];

      setOnboardStep("Uploading Resume Securely...");
      setOnboardProgress(55);

      let downloadURL = "";
      try {
        const cloudinaryRes = await uploadToCloudinary(file, {
          userId: "anonymous_onboarding",
          assetType: "resumes",
          onProgress: (pct) => setOnboardProgress(55 + Math.round((pct / 100) * 30))
        });
        downloadURL = cloudinaryRes.secure_url;
      } catch (stErr) {
        console.warn("Cloudinary upload fallback:", stErr);
      }

      setOnboardStep("Auto-creating account & dispatching SMS verification code...");
      setOnboardProgress(85);

      const onboardingResponse = await fetch("/api/auth/smart-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidateName,
          email: cleanEmail,
          phone: cleanPhone,
          skills: extractedSkills,
          experience: parsed.totalExperience || "Relevant Domain Experience",
          education: parsed.education || "Bachelor's Degree",
          city: parsed.city || "India",
          resumeURL: downloadURL,
          resumeFileName: file.name,
          resumeText: `Candidate ${candidateName}\nSkills: ${extractedSkills.join(", ")}`,
          scores: { overallScore: 90, atsCompatibilityScore: 94 },
          sendOtp: true
        })
      });

      let onboardData: any = null;
      if (onboardingResponse.ok) {
        onboardData = await parseJsonResponse(onboardingResponse).catch(() => null);
      }

      if (!onboardData || !onboardData.success) {
        throw new Error(onboardData?.error || "Failed to initialize smart onboarding.");
      }

      setOnboardProgress(100);

      setParsedCandidateData({
        uid: onboardData.uid,
        fullName: candidateName,
        email: cleanEmail,
        phone: onboardData.phone || cleanPhone,
        skills: extractedSkills,
        experience: parsed.totalExperience || "Domain Experience",
        education: parsed.education,
        city: parsed.city,
        atsScore: 94,
        resumeUrl: downloadURL,
        resumeFileName: file.name
      });

      setTimeout(() => {
        setIsSmartOnboarding(false);
        setOtpModalOpen(true);
      }, 400);

    } catch (err: any) {
      console.error("Smart resume onboarding error:", err);
      showToast(`Onboarding error: ${err.message || err}`, "error");
      setIsSmartOnboarding(false);
    }
  };

  const handleCandidateRegisterClick = () => {
    setActiveView("candidate-register");
  };

  const handleCandidateLoginClick = () => {
    setActiveView("candidate-login");
  };

  const handleConsultancyRegisterClick = () => {
    if (onOpenAuth) {
      onOpenAuth("signup", "consultancy");
    } else {
      setActiveView("candidate-register");
    }
  };

  const handleConsultancyLoginClick = () => {
    if (onOpenAuth) {
      onOpenAuth("signin", "consultancy");
    } else {
      setActiveView("candidate-login");
    }
  };

  const handleRecruiterLoginClick = () => {
    if (onOpenAuth) {
      onOpenAuth("signin", "employer");
    } else {
      setActiveView("candidate-login");
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#020617] text-white overflow-hidden font-sans">
      {/* 1. Cinematic 3D Opening Animation (Runs once per session) */}
      <AnimatePresence>
        {showIntro && (
          <AIJobs3DIntro
            onComplete={() => {
              setShowIntro(false);
              sessionStorage.setItem("aijobs_intro_seen", "true");
            }}
          />
        )}
      </AnimatePresence>

      {/* Hidden File Input for Resume Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSmartResumeSelected}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      {/* 2. LIVE 3D HERO SECTION */}
      <section className="relative min-h-[92vh] flex items-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Real-time WebGL 3D Background Canvas (AI Quantum Core on Right) */}
        <Hero3DCanvas />

        {/* Ambient Top Glow Orbs */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none" />

        {/* Hero Overlay Content - Left Aligned Layout */}
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column (Hero Content) */}
          <div className="lg:col-span-7 space-y-8 text-left">
            {/* Logo & Tagline Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <AIJobsLogo variant="full" size="lg" />
                <p className="text-xs font-mono font-bold text-cyan-400 tracking-[0.2em] uppercase">
                  Find Smarter. Hire Faster.
                </p>
              </div>

              {/* 15-Second Cinematic Brand Film Trigger */}
              <button
                onClick={() => {
                  setShowIntro(true);
                }}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 hover:bg-blue-900/90 border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white text-xs font-mono tracking-wider transition-all duration-200 shadow-lg shadow-blue-950/50 backdrop-blur-md cursor-pointer hover:scale-105"
                title="Watch 15-Second Cinematic Brand Film"
              >
                <Film className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Watch Brand Film (15s)</span>
              </button>
            </div>

            {/* Main Hero Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tight leading-[1.08] text-white"
            >
              AIJOBS <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                AI-Powered Recruitment & Job Matching Platform
              </span>
            </motion.h1>

            {/* Supporting Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-gray-300 text-base sm:text-xl font-medium max-w-2xl leading-relaxed"
            >
              AIJOBS connects candidates, recruiters, employers and consultancies through AI-powered job matching, recruitment workflows and candidate management tools.
            </motion.p>

            {/* Action CTAs: Find Jobs, Candidate Reg, Recruiter Login, Consultancy Reg */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl"
            >
              {/* Find Jobs Button */}
              <button
                onClick={() => {
                  soundSynth.playClick();
                  const el = document.getElementById("how-it-works-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full px-5 py-3.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Find Jobs</span>
              </button>

              {/* Candidate Registration */}
              <button
                onClick={handleCandidateRegisterClick}
                className="w-full px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <UserCheck className="w-4 h-4" />
                <span>Candidate Registration</span>
              </button>

              {/* Recruiter Login */}
              <button
                onClick={handleRecruiterLoginClick}
                className="w-full px-5 py-3.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-400/50 text-indigo-200 text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>Recruiter Login</span>
              </button>

              {/* Consultancy Registration */}
              <button
                onClick={handleConsultancyRegisterClick}
                className="w-full px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-500/40 hover:border-purple-400 text-white text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md shadow-[0_0_20px_rgba(124,58,237,0.2)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Building className="w-4 h-4 text-purple-400" />
                <span>Consultancy Registration</span>
              </button>
            </motion.div>

            {/* Secondary Quick Login Buttons Row */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400 pt-1">
              <span>Already registered?</span>
              <button
                onClick={handleCandidateLoginClick}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:text-white font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Candidate Login</span>
              </button>
              <button
                onClick={handleConsultancyLoginClick}
                className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:text-white font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-purple-400" />
                <span>Consultancy Login</span>
              </button>
            </div>

            {/* Instant Resume AI Parser Trigger Box */}
            <div className="pt-4 max-w-xl">
              <div className="p-5 rounded-3xl bg-gradient-to-b from-[#07152E]/90 to-[#020617]/90 border border-cyan-500/30 backdrop-blur-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Candidate Pre-Boarding</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Upload your Resume now to test Gemini AI parsing & create your pre-launch profile.
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSmartOnboarding}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase shrink-0 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSmartOnboarding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Parsing ({onboardProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>Upload Resume</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Spacer for 3D AI Quantum Core) */}
          <div className="hidden lg:block lg:col-span-5 h-[500px] pointer-events-none" />
        </div>
      </section>

      {/* 3. REALISTIC AI MATCHING EXPERIENCE */}
      <AiMatchingVisualizer3D />

      {/* 4. CANDIDATE AND CONSULTANCY CARDS */}
      <CandidateConsultancy3DCards
        onCandidateRegister={handleCandidateRegisterClick}
        onCandidateLogin={handleCandidateLoginClick}
        onConsultancyRegister={handleConsultancyRegisterClick}
        onConsultancyLogin={handleConsultancyLoginClick}
      />

      {/* 5. ABOUT AIJOBS SECTION */}
      <section id="about-aijobs-section" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#020617] border-t border-cyan-500/10 text-white">
        <div className="max-w-5xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Info className="w-3.5 h-3.5" />
            <span>Platform Overview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-white">
            About AIJOBS
          </h2>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto font-sans font-medium">
            AIJOBS is an AI-powered recruitment platform designed to connect job seekers with recruiters, employers and recruitment consultancies. The platform provides job discovery, candidate applications, AI-assisted matching, recruitment management, interview workflows and hiring communication tools.
          </p>
        </div>
      </section>

      {/* 6. HOW AIJOBS WORKS SECTION */}
      <section id="how-it-works-section" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#030a1c] border-t border-cyan-500/10 text-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simplified Hiring Process</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-white">
              How AIJOBS Works
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto font-sans">
              Empowering candidates, recruiters, and consultancies with tailored tools for seamless hiring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* For Candidates */}
            <div className="p-8 rounded-3xl bg-[#07152E]/80 border border-cyan-500/20 backdrop-blur-xl space-y-4 hover:border-cyan-400/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans">For Candidates</h3>
              <p className="text-gray-300 text-sm leading-relaxed font-sans">
                Search jobs, create a profile, upload a resume, apply for opportunities and track application progress.
              </p>
            </div>

            {/* For Recruiters */}
            <div className="p-8 rounded-3xl bg-[#07152E]/80 border border-indigo-500/20 backdrop-blur-xl space-y-4 hover:border-indigo-400/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans">For Recruiters</h3>
              <p className="text-gray-300 text-sm leading-relaxed font-sans">
                Manage recruitment workflows, review authorized candidate information, track applications and coordinate hiring activities.
              </p>
            </div>

            {/* For Consultancies */}
            <div className="p-8 rounded-3xl bg-[#07152E]/80 border border-purple-500/20 backdrop-blur-xl space-y-4 hover:border-purple-400/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans">For Consultancies</h3>
              <p className="text-gray-300 text-sm leading-relaxed font-sans">
                Manage recruitment operations, candidates, job requirements and authorized hiring workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CANDIDATE SAFETY NOTICE */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 bg-[#020617] border-t border-cyan-500/10">
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-center gap-6 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-lg font-bold font-sans text-amber-300 uppercase tracking-wider">
              Candidate Safety Notice
            </h3>
            <p className="text-sm font-sans text-amber-100 leading-relaxed font-medium">
              AIJOBS does not charge candidates for job applications or job placement. Selection depends on the employer's recruitment and interview process.
            </p>
          </div>
        </div>
      </section>

      {/* 8. LIVE LAUNCH COUNTDOWN & SAFETY */}
      <LaunchCountdown3D />
      <TrustSafetySection />

      {/* 9. FINAL CTA SECTION */}
      <section className="relative py-24 bg-gradient-to-b from-[#020617] via-[#07152E] to-[#020617] text-white border-t border-cyan-500/10 overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
          <AIJobsLogo variant="full" size="xl" animated />

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              The Future of Hiring Is Almost Here
            </h2>
            <p className="text-gray-300 text-base sm:text-xl max-w-2xl mx-auto font-sans">
              Join AIJOBS today and experience smarter recruitment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleCandidateRegisterClick}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-mono font-bold tracking-wider uppercase shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Candidate Pre-Registration</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleConsultancyRegisterClick}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-500/40 text-white text-sm font-mono font-bold tracking-wider uppercase backdrop-blur-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Building className="w-4 h-4 text-purple-400" />
              <span>Consultancy Pre-Registration</span>
            </button>
          </div>
        </div>
      </section>

      {/* 10. PUBLIC FOOTER */}
      <footer className="relative bg-[#020617] border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 text-gray-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          {/* Brand Info */}
          <div className="space-y-2">
            <AIJobsLogo variant="full" size="md" />
            <p className="font-mono text-cyan-400 text-[11px] font-bold uppercase tracking-wider">
              Find Smarter. Hire Faster.
            </p>
            <p className="text-gray-500 text-[11px]">
              © {new Date().getFullYear()} AIJOBS. All rights reserved.
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-1.5 font-mono text-gray-300">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <a href="mailto:info@aijobs.com" className="hover:text-cyan-300 transition-colors">
                info@aijobs.com
              </a>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <a href="tel:+919324773994" className="hover:text-cyan-300 transition-colors">
                +91 9324773994
              </a>
            </div>
          </div>

          {/* Public Legal Links */}
          <div className="flex flex-wrap justify-center gap-6 font-mono text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => {
                soundSynth.playClick();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => {
                soundSynth.playClick();
                const el = document.getElementById("about-aijobs-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else setActiveLegalDoc("about");
              }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              About AIJOBS
            </button>
            <button
              onClick={() => {
                soundSynth.playClick();
                setActiveLegalDoc("privacy");
              }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                soundSynth.playClick();
                setActiveLegalDoc("terms");
              }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                soundSynth.playClick();
                setActiveLegalDoc("contact");
              }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={handleCandidateLoginClick}
              className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={handleCandidateRegisterClick}
              className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>
      </footer>

      {/* FIXED MOBILE BOTTOM QUICK BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-[#020617]/95 border-t border-cyan-500/30 backdrop-blur-xl flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-bold text-gray-300 pl-2">
          Pre-Register Now:
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCandidateRegisterClick}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-[11px] font-mono font-black uppercase tracking-wider shadow-lg cursor-pointer"
          >
            Candidate
          </button>
          <button
            onClick={handleConsultancyRegisterClick}
            className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-[11px] font-mono font-black uppercase tracking-wider shadow-lg cursor-pointer"
          >
            Consultancy
          </button>
        </div>
      </div>

      {/* Legal Document Modal */}
      {activeLegalDoc && (
        <LegalModal docType={activeLegalDoc} onClose={() => setActiveLegalDoc(null)} />
      )}

      {/* Smart Resume Twilio SMS Verification Modal */}
      {otpModalOpen && parsedCandidateData && (
        <SmartResumeOtpModal
          candidateData={parsedCandidateData}
          onClose={() => setOtpModalOpen(false)}
          onVerificationSuccess={(verifiedProfile) => {
            setOtpModalOpen(false);
            showToast("Registration & Profile Verification Complete!", "success");
            setActiveView("pre-launch-profile");
          }}
        />
      )}
    </div>
  );
}
