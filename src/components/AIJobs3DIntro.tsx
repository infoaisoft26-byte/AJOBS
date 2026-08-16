import React, { useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  SkipForward,
  Play,
  ArrowRight,
  Briefcase,
  Building2,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  UserCheck,
  Zap,
  Film,
  Award,
} from "lucide-react";
import { commercialAudio } from "../utils/commercialIntroAudio";

// Photorealistic Cinema Asset Frames
import skylineSunriseImg from "../assets/images/cinematic_india_skyline_1786908684064.jpg";
import candidateDeskImg from "../assets/images/cinematic_candidates_desk_1786908694614.jpg";
import interviewEntryImg from "../assets/images/cinematic_interview_entry_1786908718959.jpg";
import recruiterDeskImg from "../assets/images/cinematic_recruiter_desk_1786908707478.jpg";

interface AIJobs3DIntroProps {
  onComplete: () => void;
}

export const AIJobs3DIntro: React.FC<AIJobs3DIntroProps> = ({ onComplete }) => {
  const [elapsed, setElapsed] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioPromptNeeded, setAudioPromptNeeded] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [recruiterAction, setRecruiterAction] = useState<"initial" | "shortlisted" | "scheduled">("initial");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const TOTAL_DURATION = 15.0; // 15 seconds commercial film

  // Initialize Timeline Loop and Web Audio Engine
  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }

    document.body.style.overflow = "hidden";
    startTimeRef.current = Date.now();

    commercialAudio.startAudio().then((success) => {
      if (!success) {
        setAudioPromptNeeded(true);
      }
    });

    const updateLoop = () => {
      const now = Date.now();
      const currentElapsed = (now - startTimeRef.current) / 1000;

      if (currentElapsed >= TOTAL_DURATION) {
        setElapsed(TOTAL_DURATION);
        handleEnd();
        return;
      }

      setElapsed(currentElapsed);

      // Recruiter micro-interactions at 9.6s and 10.8s
      if (currentElapsed >= 9.6 && currentElapsed < 10.8) {
        setRecruiterAction("shortlisted");
      } else if (currentElapsed >= 10.8) {
        setRecruiterAction("scheduled");
      }

      // Smooth fade out into homepage at 14.4s
      if (currentElapsed >= TOTAL_DURATION - 0.6 && !isFadingOut) {
        setIsFadingOut(true);
      }

      rafRef.current = requestAnimationFrame(updateLoop);
    };

    rafRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      commercialAudio.stopAudio();
      document.body.style.overflow = "";
    };
  }, [onComplete]);

  const handleEnd = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      document.body.style.overflow = "";
      sessionStorage.setItem("aijobs_intro_seen", "true");
      commercialAudio.stopAudio();
      onComplete();
    }, 450);
  };

  const handleAudioUnlock = () => {
    commercialAudio.startAudio().then(() => {
      setAudioPromptNeeded(false);
      setIsMuted(false);
    });
  };

  const toggleSound = () => {
    const muted = commercialAudio.toggleMute();
    setIsMuted(muted);
  };

  // =========================================================================
  // CANVAS BACKGROUND: CINEMATIC LIGHT SWEEP & NEURAL PARTICLE FILAMENTS
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // 40 Ambient Electric-Blue Particles
    const particles = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connective filaments in AI Matching scenes (6-15s)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.fill();

        // Connect nearby particles with thin electric-blue lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(14, 165, 233, ${(1 - dist / 120) * 0.22})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Anamorphic horizontal light sweep for logo reveal (12.0s - 15.0s)
      if (elapsed >= 12.0) {
        const sweepProgress = (elapsed - 12.0) / 3.0;
        const sweepX = width * sweepProgress;

        const grad = ctx.createLinearGradient(sweepX - 220, 0, sweepX + 220, 0);
        grad.addColorStop(0, "rgba(59, 130, 246, 0)");
        grad.addColorStop(0.5, "rgba(96, 165, 250, 0.25)");
        grad.addColorStop(1, "rgba(59, 130, 246, 0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [elapsed]);

  // Exact 5-Scene Breakdown (15 seconds total)
  // 0–3s: Scene 1 — Real India, Real Careers (Sunrise business district, real Indian professionals)
  // 3–6s: Scene 2 — Candidates & Opportunity (Laptop, resume, interview room, "YOUR NEXT OPPORTUNITY STARTS HERE")
  // 6–9s: Scene 3 — Smart AI Matching (Candidate -> Skills -> Job -> Recruiter -> Company, "SMARTER MATCHING / FASTER HIRING")
  // 9–12s: Scene 4 — Recruiter & Company (Recruiter reviews profile, Shortlist -> Interview Scheduled, candidate smiles)
  // 12–15s: Scene 5 — AIJobs Grand Logo Reveal (Dark navy cinema, official AIJobs logo, light sweep, "Find Smarter. Hire Faster.")
  const getSceneNumber = (): number => {
    if (elapsed < 3.0) return 1;
    if (elapsed < 6.0) return 2;
    if (elapsed < 9.0) return 3;
    if (elapsed < 12.0) return 4;
    return 5;
  };

  const sceneNum = getSceneNumber();
  const timeRemaining = Math.max(0, Math.ceil(TOTAL_DURATION - elapsed));

  return (
    <div
      id="aijobs-commercial-intro-player"
      className={`fixed inset-0 z-[99999] bg-[#020617] text-white flex flex-col justify-between overflow-hidden select-none transition-opacity duration-700 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* 2.39:1 CinemaScope Letterbox Bars */}
      <div className="absolute top-0 left-0 right-0 h-4 sm:h-8 bg-black z-40 border-b border-white/5 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-4 sm:h-8 bg-black z-40 border-t border-white/5 pointer-events-none" />

      {/* =====================================================================
          DYNAMIC CINEMATIC BACKGROUND LAYERS WITH KEN-BURNS MOTION
      ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Scene 1 Background: Sunrise over Indian Tech Hub (0–3s) */}
        {sceneNum === 1 && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img
              src={skylineSunriseImg}
              alt="Indian Tech Hub Sunrise"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transform scale-105 animate-[pulse_6s_ease-in-out_infinite]"
              style={{
                filter: "brightness(0.65) contrast(1.1)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.85)_100%)]" />
          </div>
        )}

        {/* Scene 2 Background: Desk Workspace & Interview Room (3–6s) */}
        {sceneNum === 2 && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img
              src={candidateDeskImg}
              alt="Candidate Workspace"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transform scale-105"
              style={{
                filter: "brightness(0.5) contrast(1.15)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-[#020617]/90" />
          </div>
        )}

        {/* Scene 3 Background: Real Workspace with Blue Particle Matrix (6–9s) */}
        {sceneNum === 3 && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img
              src={interviewEntryImg}
              alt="Interview Entry Workspace"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-30 transform scale-110"
              style={{
                filter: "brightness(0.4) saturate(1.2)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#030712]/80 to-[#020617]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[140px]" />
          </div>
        )}

        {/* Scene 4 Background: Professional Recruiter in Contemporary Office (9–12s) */}
        {sceneNum === 4 && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img
              src={recruiterDeskImg}
              alt="Recruiter Office"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transform scale-105"
              style={{
                filter: "brightness(0.55) contrast(1.1)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/65 to-[#020617]/90" />
          </div>
        )}

        {/* Scene 5 Background: Luxury Navy Cinema Environment (12–15s) */}
        {sceneNum === 5 && (
          <div className="absolute inset-0 transition-opacity duration-1000 bg-[radial-gradient(ellipse_at_50%_45%,rgba(15,35,75,0.85)_0%,rgba(6,14,35,0.96)_60%,rgba(2,6,23,1)_100%)]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-blue-500/20 rounded-full blur-[120px]" />
          </div>
        )}
      </div>

      {/* Canvas Layer for Clean Particles & Light Sweep */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* =====================================================================
          TOP NAVIGATION BAR & AUDIO CONTROLS
      ===================================================================== */}
      <div className="relative z-30 flex items-center justify-between px-6 pt-6 sm:pt-10 sm:px-12">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <Film className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-blue-400 font-semibold">
                AIJOBS OFFICIAL BRAND FILM
              </span>
            </div>
            <span className="text-xs text-slate-300 font-medium tracking-wider">
              15-Second Cinematic Commercial
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Audio Mute/Unmute */}
          <button
            onClick={toggleSound}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 border border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500 text-xs backdrop-blur-md transition shadow-lg cursor-pointer"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
            <span className="font-mono text-[11px]">{isMuted ? "Muted" : "Sound On"}</span>
          </button>

          {/* Skip Button */}
          <button
            onClick={handleEnd}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-sky-600/30 border border-slate-600/70 hover:border-slate-400 text-slate-200 hover:text-white text-xs backdrop-blur-md transition shadow-lg cursor-pointer"
          >
            <span>Skip Intro</span>
            <span className="font-mono text-[11px] text-slate-400">({timeRemaining}s)</span>
            <SkipForward className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Audio Unlock Prompt if blocked by browser autoplay policy */}
      {audioPromptNeeded && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <button
            onClick={handleAudioUnlock}
            className="flex items-center space-x-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white font-medium text-xs shadow-2xl shadow-blue-500/30 border border-blue-400/40 hover:scale-105 transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Enable Cinematic Commercial Soundtrack</span>
          </button>
        </div>
      )}

      {/* =====================================================================
          MAIN CINEMATIC STAGE: 5 ULTRA-REALISTIC SCENES
      ===================================================================== */}
      <div className="relative z-20 flex-1 flex items-center justify-center px-6 sm:px-12 max-w-6xl mx-auto w-full">
        {/* -------------------------------------------------------------------
            SCENE 1 (0–3 SEC) — REAL INDIA, REAL CAREERS
            Sunrise over modern Indian business district, glass corporate building,
            real Indian professionals entering the workplace.
        ------------------------------------------------------------------- */}
        {sceneNum === 1 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-4xl animate-fadeIn">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-amber-500/40 text-xs text-amber-200 font-mono shadow-xl backdrop-blur-md">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Modern Indian Business District • Dawn Sunrise</span>
            </div>

            {/* Real Professional Archetypes entering the workplace */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full">
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/80 flex flex-col items-center text-center space-y-2.5 shadow-2xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-blue-600/25 border border-blue-400/50 flex items-center justify-center text-blue-300 font-semibold text-sm">
                  YP
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Young Professional</div>
                  <div className="text-[11px] text-slate-400">Software Engineer</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/80 flex flex-col items-center text-center space-y-2.5 shadow-2xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-purple-600/25 border border-purple-400/50 flex items-center justify-center text-purple-300 font-semibold text-sm">
                  PL
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Product Leader</div>
                  <div className="text-[11px] text-slate-400">Fintech Enterprise</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/80 flex flex-col items-center text-center space-y-2.5 shadow-2xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-emerald-600/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-semibold text-sm">
                  EP
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Senior Manager</div>
                  <div className="text-[11px] text-slate-400">12+ Years Experience</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/80 flex flex-col items-center text-center space-y-2.5 shadow-2xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-amber-600/25 border border-amber-400/50 flex items-center justify-center text-amber-300 font-semibold text-sm">
                  FG
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Fresh Graduate</div>
                  <div className="text-[11px] text-slate-400">Top Tier Institute</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <h1 className="text-2xl sm:text-4xl font-serif text-white tracking-wide drop-shadow-md">
                Real Talent. Real Careers.
              </h1>
              <p className="text-xs font-mono tracking-[0.25em] text-blue-400 uppercase">
                India's Next Generation of Professionals
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 2 (3–6 SEC) — CANDIDATES & OPPORTUNITY
            Desk with real laptop, resume, profile, job search.
            Interview room entry, candidate preparation.
            Text: YOUR NEXT OPPORTUNITY / STARTS HERE
        ------------------------------------------------------------------- */}
        {sceneNum === 2 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-4xl animate-fadeIn">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-950/85 border border-blue-500/40 text-xs text-cyan-300 font-mono shadow-xl backdrop-blur-md">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Real Job Applications • Verified Career Profiles</span>
            </div>

            {/* Candidate Workspace & Interview Showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-blue-500/40 flex flex-col text-left space-y-3 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Candidate Workspace</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">Active</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Full-Stack AI Developer</div>
                  <div className="text-xs text-slate-300 font-light leading-relaxed">
                    Resume parsed & verified: React, TypeScript, Python, Cloud Architecture.
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-1 text-[11px] text-blue-300 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Real Resume • Real Domain Skills</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/40 flex flex-col text-left space-y-3 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">Interview Room</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Ready</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Enterprise Evaluation</div>
                  <div className="text-xs text-slate-300 font-light leading-relaxed">
                    Candidate entering formal boardroom interview with confidence and portfolio clarity.
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-1 text-[11px] text-purple-300 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Direct Communication</span>
                </div>
              </div>
            </div>

            {/* Display Texts */}
            <div className="space-y-1.5 pt-1">
              <h1 className="text-2xl sm:text-4xl font-serif text-white tracking-wide drop-shadow-md">
                YOUR NEXT OPPORTUNITY
              </h1>
              <h2 className="text-xl sm:text-3xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 tracking-wider font-bold">
                STARTS HERE
              </h2>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 3 (6–9 SEC) — SMART AI MATCHING
            Candidate → Skills → Job → Recruiter → Company
            Thin electric-blue connection lines, realistic environment behind.
            Text: SMARTER MATCHING / FASTER HIRING
        ------------------------------------------------------------------- */}
        {sceneNum === 3 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-5xl animate-fadeIn">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-950/85 border border-blue-500/50 text-xs text-blue-300 font-mono shadow-xl backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Smart AI Matching Engine • Precision Skill Alignment</span>
            </div>

            {/* Seamless 5-Node Visual Pipeline */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
              {/* Node 1: Candidate */}
              <div className="px-4 py-3 rounded-xl bg-slate-900/95 border border-blue-500/50 flex flex-col items-center space-y-1 shadow-lg backdrop-blur-md">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-semibold text-white">Candidate</span>
                <span className="text-[10px] text-slate-400">Verified Profile</span>
              </div>

              <ArrowRight className="w-4 h-4 text-blue-400 animate-pulse hidden sm:block" />

              {/* Node 2: Skills */}
              <div className="px-4 py-3 rounded-xl bg-slate-900/95 border border-indigo-500/50 flex flex-col items-center space-y-1 shadow-lg backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-semibold text-white">Skills Matrix</span>
                <span className="text-[10px] text-slate-400">AI / Cloud / React</span>
              </div>

              <ArrowRight className="w-4 h-4 text-indigo-400 animate-pulse hidden sm:block" />

              {/* Node 3: Job */}
              <div className="px-4 py-3 rounded-xl bg-slate-900/95 border border-cyan-500/50 flex flex-col items-center space-y-1 shadow-lg backdrop-blur-md">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-semibold text-white">Relevant Job</span>
                <span className="text-[10px] text-slate-400">Accurate Fit</span>
              </div>

              <ArrowRight className="w-4 h-4 text-cyan-400 animate-pulse hidden sm:block" />

              {/* Node 4: Recruiter */}
              <div className="px-4 py-3 rounded-xl bg-slate-900/95 border border-emerald-500/50 flex flex-col items-center space-y-1 shadow-lg backdrop-blur-md">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Recruiter</span>
                <span className="text-[10px] text-slate-400">Instant Access</span>
              </div>

              <ArrowRight className="w-4 h-4 text-emerald-400 animate-pulse hidden sm:block" />

              {/* Node 5: Company */}
              <div className="px-4 py-3 rounded-xl bg-slate-900/95 border border-purple-500/50 flex flex-col items-center space-y-1 shadow-lg backdrop-blur-md">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-semibold text-white">Company</span>
                <span className="text-[10px] text-slate-400">Enterprise Growth</span>
              </div>
            </div>

            {/* Display Texts */}
            <div className="space-y-1.5 pt-1">
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-widest drop-shadow-md">
                SMARTER MATCHING
              </h1>
              <h2 className="text-xl sm:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 tracking-wider">
                FASTER HIRING
              </h2>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 4 (9–12 SEC) — RECRUITER & COMPANY
            Recruiter reviewing profile, pressing SHORTLIST -> INTERVIEW SCHEDULED.
            Candidate receives instant update and smiles naturally.
        ------------------------------------------------------------------- */}
        {sceneNum === 4 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-4xl animate-fadeIn">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-950/85 border border-emerald-500/40 text-xs text-emerald-300 font-mono shadow-xl backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Talent Acquisition Decision • Instant Recruiter Workflow</span>
            </div>

            {/* Recruiter Action Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {/* Recruiter Action Card */}
              <div className="p-6 rounded-2xl bg-slate-900/95 border border-slate-700/80 flex flex-col text-left space-y-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase">Recruiter Dashboard</span>
                  <span className="text-[11px] text-blue-400 font-semibold">96% Skill Score</span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Rahul Sharma</div>
                  <div className="text-xs text-slate-300">Lead Frontend Engineer • 5 Yrs Exp</div>
                </div>

                {/* Dynamic Status Button */}
                <div className="pt-1">
                  {recruiterAction === "initial" && (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium text-xs text-center transition shadow-lg flex items-center justify-center space-x-2">
                      <span>Reviewing Profile...</span>
                    </div>
                  )}
                  {recruiterAction === "shortlisted" && (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs text-center shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>SHORTLISTED</span>
                    </div>
                  )}
                  {recruiterAction === "scheduled" && (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs text-center shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 animate-fadeIn">
                      <CalendarCheck className="w-4 h-4" />
                      <span>INTERVIEW SCHEDULED</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Candidate Notification Card */}
              <div className="p-6 rounded-2xl bg-slate-900/95 border border-slate-700/80 flex flex-col text-left space-y-4 shadow-2xl backdrop-blur-md justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase">Candidate Alert</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Interview Invitation Received</span>
                  </div>
                  <div className="text-xs text-slate-300 font-light leading-relaxed">
                    "Your technical interview with TechNova Enterprise has been confirmed for tomorrow at 11:00 AM."
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-2 flex justify-between">
                  <span>Direct Communication</span>
                  <span className="text-blue-400">Zero Agency Lag</span>
                </div>
              </div>
            </div>

            {/* Display Texts */}
            <div className="space-y-1.5 pt-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-wide drop-shadow-md">
                Connecting Talent Directly to Recruiters
              </h1>
              <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                Transparent • Fast • Reliable
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 5 (12–15 SEC) — AIJOBS GRAND LOGO REVEAL
            Premium dark navy cinema environment, soft blue particles converging,
            official AIJobs logo revealed with blue light sweep.
            AIJOBS
            AI Powered Hiring Platform
            Find Smarter. Hire Faster.
        ------------------------------------------------------------------- */}
        {sceneNum === 5 && (
          <div className="flex flex-col items-center justify-center text-center space-y-5 w-full max-w-2xl animate-fadeIn">
            {/* Grand Logo Container */}
            <div className="relative pt-2">
              <div className="absolute -inset-6 bg-gradient-to-r from-blue-600/30 via-sky-500/25 to-indigo-600/30 rounded-3xl blur-2xl animate-pulse" />

              <div className="relative px-10 py-6 rounded-3xl bg-slate-950/90 border border-blue-500/40 shadow-2xl backdrop-blur-md flex flex-col items-center space-y-3">
                <img
                  src="/aijobs-ai-logo.png"
                  alt="AIJobs Official Logo"
                  referrerPolicy="no-referrer"
                  className="h-14 sm:h-16 w-auto object-contain mx-auto transition-transform duration-700 scale-105"
                />

                <div className="space-y-0.5">
                  <div className="text-2xl sm:text-3xl font-bold tracking-wider text-white">
                    AIJOBS
                  </div>
                  <div className="text-xs font-mono tracking-[0.25em] text-blue-400 uppercase font-semibold">
                    AI Powered Hiring Platform
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Slogan */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80 w-full">
              <div className="text-base sm:text-xl font-serif italic text-slate-100 tracking-wide">
                Find Smarter. Hire Faster.
              </div>
              <div className="text-xs text-slate-400 font-light">
                Empowering India's Professionals, Recruiters & Enterprises
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          BOTTOM TIMELINE PROGRESS & SCENE INDICATOR
      ===================================================================== */}
      <div className="relative z-30 px-6 pb-6 sm:pb-10 sm:px-12 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400 font-bold">Scene {sceneNum}/5:</span>
            <span className="text-slate-200">
              {sceneNum === 1 && "Real India, Real Careers (0–3s)"}
              {sceneNum === 2 && "Candidates & Opportunity (3–6s)"}
              {sceneNum === 3 && "Smart AI Matching (6–9s)"}
              {sceneNum === 4 && "Recruiter & Company (9–12s)"}
              {sceneNum === 5 && "AIJobs Grand Logo Reveal (12–15s)"}
            </span>
          </div>
          <div>
            <span>{Math.floor(elapsed)}s</span> / <span>15s</span>
          </div>
        </div>

        {/* Clean Blue Electric Gradient Progress Bar */}
        <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 transition-all duration-150 ease-linear shadow-lg shadow-blue-500/30"
            style={{ width: `${(elapsed / TOTAL_DURATION) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default AIJobs3DIntro;
