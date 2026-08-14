import React, { useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  SkipForward,
  Play,
  ArrowRight,
  ShieldCheck,
  Building2,
  Stethoscope,
  Laptop,
  HardHat,
  Tractor,
  BookOpen,
  Briefcase,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { independenceAudio } from "../utils/independenceDayAudio";

interface IndependenceDayIntroProps {
  onComplete: () => void;
}

export const IndependenceDayIntro: React.FC<IndependenceDayIntroProps> = ({ onComplete }) => {
  const [elapsed, setElapsed] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioPromptNeeded, setAudioPromptNeeded] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const flagCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const TOTAL_DURATION = 60.0; // 60 seconds

  // Initialize Timeline Loop and Web Audio Engine
  useEffect(() => {
    startTimeRef.current = Date.now();

    independenceAudio.startAudio().then((success) => {
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

      if (currentElapsed >= TOTAL_DURATION - 1.2 && !isFadingOut) {
        setIsFadingOut(true);
      }

      rafRef.current = requestAnimationFrame(updateLoop);
    };

    rafRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      independenceAudio.stopAudio();
    };
  }, []);

  const handleEnd = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      independenceAudio.stopAudio();
      onComplete();
    }, 800);
  };

  const handleAudioUnlock = () => {
    independenceAudio.startAudio().then(() => {
      setAudioPromptNeeded(false);
      setIsMuted(false);
    });
  };

  const toggleSound = () => {
    const muted = independenceAudio.toggleMute();
    setIsMuted(muted);
  };

  // =========================================================================
  // CANVAS 1: CINEMATIC INDIAN FLAG WAVING PHYSICS (24-Spoke Navy Blue Chakra)
  // Deep Saffron (#FF9933), Pure White (#FFFFFF), India Green (#138808), Chakra (#000080)
  // =========================================================================
  useEffect(() => {
    const canvas = flagCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let flagRaf: number;

    const renderFlag = () => {
      const t = Date.now() * 0.0018;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Realistic dual-harmonic wave simulation for heavy woven silk/khadi fabric
      const cols = 60;
      const colWidth = w / cols;
      const flagHeight = h * 0.76;
      const startY = h * 0.12;

      for (let i = 0; i < cols; i++) {
        const x = i * colWidth;
        const wave = Math.sin(t * 2.5 + i * 0.24) * 14 + Math.sin(t * 4.4 + i * 0.38) * 4.5;
        const nextWave = Math.sin(t * 2.5 + (i + 1) * 0.24) * 14 + Math.sin(t * 4.4 + (i + 1) * 0.38) * 4.5;
        const currentY = startY + wave;
        const nextY = startY + nextWave;

        // Morning sunlight modulation across cloth folds
        const light = 0.90 + Math.cos(t * 2.5 + i * 0.24) * 0.18;

        // 1. Saffron (Top Band) - #FF9933
        ctx.fillStyle = `rgba(${Math.round(255 * light)}, ${Math.round(153 * light)}, ${Math.round(51 * light)}, 0.99)`;
        ctx.beginPath();
        ctx.moveTo(x, currentY);
        ctx.lineTo(x + colWidth + 0.5, nextY);
        ctx.lineTo(x + colWidth + 0.5, nextY + flagHeight / 3);
        ctx.lineTo(x, currentY + flagHeight / 3);
        ctx.closePath();
        ctx.fill();

        // 2. Pure White (Middle Band) - #FFFFFF
        ctx.fillStyle = `rgba(${Math.round(255 * light)}, ${Math.round(255 * light)}, ${Math.round(255 * light)}, 0.99)`;
        ctx.beginPath();
        ctx.moveTo(x, currentY + flagHeight / 3);
        ctx.lineTo(x + colWidth + 0.5, nextY + flagHeight / 3);
        ctx.lineTo(x + colWidth + 0.5, nextY + (flagHeight * 2) / 3);
        ctx.lineTo(x, currentY + (flagHeight * 2) / 3);
        ctx.closePath();
        ctx.fill();

        // 3. India Green (Bottom Band) - #138808
        ctx.fillStyle = `rgba(${Math.round(19 * light)}, ${Math.round(136 * light)}, ${Math.round(8 * light)}, 0.99)`;
        ctx.beginPath();
        ctx.moveTo(x, currentY + (flagHeight * 2) / 3);
        ctx.lineTo(x + colWidth + 0.5, nextY + (flagHeight * 2) / 3);
        ctx.lineTo(x + colWidth + 0.5, nextY + flagHeight);
        ctx.lineTo(x, currentY + flagHeight);
        ctx.closePath();
        ctx.fill();

        // Golden sunrise sunlight passing through the fabric
        const sunGlow = Math.max(0, Math.sin(t * 1.2 + i * 0.12)) * 0.16;
        ctx.fillStyle = `rgba(255, 235, 185, ${sunGlow})`;
        ctx.fillRect(x, currentY, colWidth + 0.5, flagHeight);
      }

      // Draw Center Navy Blue Ashoka Chakra (#000080) with EXACTLY 24 SPOKES
      const midCol = Math.floor(cols * 0.49);
      const chakraX = midCol * colWidth;
      const chakraWave = Math.sin(t * 2.5 + midCol * 0.24) * 14 + Math.sin(t * 4.4 + midCol * 0.38) * 4.5;
      const chakraY = startY + chakraWave + flagHeight / 2;
      const chakraRadius = flagHeight * 0.145;

      ctx.save();
      ctx.translate(chakraX, chakraY);

      // Outer Navy Blue Rim
      ctx.strokeStyle = "#000080";
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, chakraRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Navy Blue Hub
      ctx.fillStyle = "#000080";
      ctx.beginPath();
      ctx.arc(0, 0, chakraRadius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Exactly 24 Spokes
      for (let s = 0; s < 24; s++) {
        const angle = (s * Math.PI * 2) / 24;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * chakraRadius, Math.sin(angle) * chakraRadius);
        ctx.lineWidth = 1.35;
        ctx.strokeStyle = "#000080";
        ctx.stroke();
      }

      ctx.restore();

      flagRaf = requestAnimationFrame(renderFlag);
    };

    renderFlag();
    return () => cancelAnimationFrame(flagRaf);
  }, []);

  // =========================================================================
  // CANVAS 2: FLOATING REALISTIC INDIAN FLOWER PETALS
  // Saffron Marigold Petals, White Jasmine Petals, Natural Green Leaves
  // =========================================================================
  useEffect(() => {
    const canvas = petalsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const petals: Array<{
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      rot: number;
      vRot: number;
      type: "marigold" | "white" | "green";
      opacity: number;
    }> = [];

    // 32 slow, graceful petals floating on morning breeze
    for (let i = 0; i < 32; i++) {
      petals.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 7 + Math.random() * 9,
        vx: 0.3 + Math.random() * 0.5,
        vy: 0.25 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.018,
        type: i % 3 === 0 ? "marigold" : i % 3 === 1 ? "white" : "green",
        opacity: 0.45 + Math.random() * 0.4,
      });
    }

    let pRaf: number;

    const renderPetals = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      petals.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        if (p.y > canvas.height + 25) {
          p.y = -25;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width + 25) {
          p.x = -25;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;

        if (p.type === "marigold") {
          ctx.fillStyle = "#FF8C00"; // Saffron Orange Marigold petal
        } else if (p.type === "white") {
          ctx.fillStyle = "#FDFEFE"; // Pure White petal
        } else {
          ctx.fillStyle = "#1E824C"; // Natural Indian Neem/Ashoka green leaf
        }

        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      pRaf = requestAnimationFrame(renderPetals);
    };

    renderPetals();
    return () => cancelAnimationFrame(pRaf);
  }, []);

  // Exact 6-Scene Structure matching the 60-Second script
  // 0–10s: Grand Tiranga Opening (Sunrise, huge flag, "15 AUGUST")
  // 10–20s: Children of India (School ground, "हमारे सपने", "हमारा भविष्य")
  // 20–30s: People Who Build India (Farmer, worker, doctor, nurse, etc. "मेहनत", "हुनर", "हौसला")
  // 30–40s: Young India (Graduate, interview, modern Indian office, "हर सपने को मिले", "एक अवसर")
  // 40–50s: India Moves Forward (Montage, light ribbon, "एक भारत", "करोड़ों सपने", "एक तिरंगा")
  // 50–60s: AIJobs Independence Day Finale (Grand Tiranga, AIJobs logo below, Happy Independence Day, Jai Hind)
  const getSceneNumber = (): number => {
    if (elapsed < 10.0) return 1;
    if (elapsed < 20.0) return 2;
    if (elapsed < 30.0) return 3;
    if (elapsed < 40.0) return 4;
    if (elapsed < 50.0) return 5;
    return 6;
  };

  const sceneNum = getSceneNumber();
  const timeRemaining = Math.max(0, Math.ceil(TOTAL_DURATION - elapsed));

  return (
    <div
      id="independence-day-film-player"
      className={`fixed inset-0 z-[99999] bg-[#070b19] text-white flex flex-col justify-between overflow-hidden select-none transition-opacity duration-1000 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* =====================================================================
          NATURAL INDIAN SUNRISE & SKY ATMOSPHERE (STRICTLY REAL INDIA)
      ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Golden Indian Morning Sunrise Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_90%,rgba(255,140,0,0.30)_0%,rgba(217,119,6,0.18)_35%,rgba(15,23,42,0.92)_75%,rgba(7,11,25,1)_100%)]" />

        {/* Clear Dawn Sky Gradient */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-sky-950/40 via-amber-950/20 to-transparent" />

        {/* Golden Horizon Light Stream */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-orange-500/15 via-amber-500/5 to-transparent blur-3xl" />
      </div>

      {/* Floating Flower Petals Canvas */}
      <canvas
        ref={petalsCanvasRef}
        width={typeof window !== "undefined" ? window.innerWidth : 1920}
        height={typeof window !== "undefined" ? window.innerHeight : 1080}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* =====================================================================
          TOP NAVIGATION BAR & AUDIO CONTROLS
      ===================================================================== */}
      <div className="relative z-30 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-orange-400 font-semibold">
              AIJOBS PRESENTS — HAPPY INDEPENDENCE DAY 🇮🇳
            </span>
            <span className="text-xs text-slate-300 font-medium tracking-wider">
              60-Second Slow Cinematic Indian Film
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Audio Mute/Unmute */}
          <button
            onClick={toggleSound}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 border border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500 text-xs backdrop-blur-md transition shadow-lg"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="font-mono text-[11px]">{isMuted ? "Muted" : "Sound On"}</span>
          </button>

          {/* Skip Film */}
          <button
            onClick={handleEnd}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/25 via-amber-500/20 to-emerald-500/25 border border-slate-600/70 hover:border-slate-400 text-slate-200 hover:text-white text-xs backdrop-blur-md transition shadow-lg"
          >
            <span>Skip Film</span>
            <span className="font-mono text-[11px] text-slate-400">({timeRemaining}s)</span>
            <SkipForward className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Audio Unlock Prompt if browser auto-play was blocked */}
      {audioPromptNeeded && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleAudioUnlock}
            className="flex items-center space-x-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-700 text-white font-medium text-xs shadow-2xl shadow-orange-500/30 border border-amber-300/40 hover:scale-105 transition active:scale-95 animate-bounce"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Enable Cinematic Indian Flute & Orchestra</span>
          </button>
        </div>
      )}

      {/* =====================================================================
          MAIN CINEMATIC STAGE: 6 SCENES (THE TIRANGA AS CONSTANT VISUAL HERO)
      ===================================================================== */}
      <div className="relative z-20 flex-1 flex items-center justify-center px-6 sm:px-12 max-w-6xl mx-auto w-full">
        {/* -------------------------------------------------------------------
            SCENE 1 (0:00–0:10) — GRAND TIRANGA OPENING
            Realistic Indian sunrise, warm morning sky, golden sunlight,
            huge Tiranga filling 60–70% of frame, 24-spoke Navy Blue Chakra.
            Text near the end: 15 AUGUST
        ------------------------------------------------------------------- */}
        {sceneNum === 1 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full animate-fadeIn">
            {/* The Flag Fills 65% of the frame with realistic sunrise sky */}
            <div className="relative w-full max-w-4xl h-80 sm:h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-amber-500/40 bg-slate-950/70 backdrop-blur-sm">
              <canvas
                ref={flagCanvasRef}
                width={1100}
                height={620}
                className="w-full h-full object-cover transition-transform duration-1000 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

              {/* Natural Flag Details Overlay */}
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center text-[11px] font-mono tracking-widest text-amber-200/90 uppercase animate-fadeIn">
                <span>Deep Saffron • Pure White • India Green</span>
                <span>24 Spokes • Ashoka Chakra</span>
                <span>Bharat 🇮🇳</span>
              </div>
            </div>

            {/* Text appears only near the end */}
            {elapsed >= 6.5 && (
              <div className="space-y-1 animate-fadeIn">
                <h1 className="text-3xl sm:text-5xl font-serif font-bold text-amber-100 tracking-widest">
                  15 AUGUST
                </h1>
                <p className="text-xs font-mono tracking-[0.3em] text-orange-400 uppercase">
                  Happy Independence Day
                </p>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 2 (0:10–0:20) — CHILDREN OF INDIA
            Keep Tiranga visible in background. Real Indian school ground in morning
            sunlight, children in uniforms holding small flags respectfully,
            one girl with flowers, boy looking up at the large Tiranga.
            Text: "हमारे सपने" -> "हमारा भविष्य"
        ------------------------------------------------------------------- */}
        {sceneNum === 2 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-4xl animate-fadeIn">
            {/* Top Flag Presence Indicator */}
            <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-xs text-amber-200 font-mono">
              <span>🇮🇳 Indian School Ground • Morning Sunlight</span>
            </div>

            {/* School Ground Composition Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-orange-500/30 flex flex-col items-center text-center space-y-3 shadow-xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Clean School Uniforms</div>
                  <div className="text-xs text-slate-300 font-light leading-relaxed">
                    Boys and girls standing together proudly on the school ground in morning golden light.
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-amber-500/30 flex flex-col items-center text-center space-y-3 shadow-xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Holding Small Flags</div>
                  <div className="text-xs text-slate-300 font-light leading-relaxed">
                    Holding the Tiranga with reverence; marigold garlands decorating the courtyard.
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-emerald-500/30 flex flex-col items-center text-center space-y-3 shadow-xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Looking Up at Tiranga</div>
                  <div className="text-xs text-slate-300 font-light leading-relaxed">
                    Young eyes gazing upward at the majestic National Flag flying high above the school.
                  </div>
                </div>
              </div>
            </div>

            {/* Display Texts */}
            <div className="space-y-2 pt-2">
              <h1 className="text-3xl sm:text-5xl font-serif text-white tracking-widest animate-fadeIn">
                हमारे सपने
              </h1>
              {elapsed >= 15.0 && (
                <h2 className="text-2xl sm:text-4xl font-serif text-amber-200 tracking-wider animate-fadeIn">
                  हमारा भविष्य
                </h2>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 3 (0:20–0:30) — PEOPLE WHO BUILD INDIA
            Real Indian people at work with dignity & pride in warm natural sunlight:
            Farmer in green field, construction worker, factory worker, doctor,
            nurse, teacher, engineer, delivery worker, office employee.
            Text: "मेहनत" -> "हुनर" -> "हौसला"
        ------------------------------------------------------------------- */}
        {sceneNum === 3 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-4xl animate-fadeIn">
            <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-slate-900/90 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
              <span>🇮🇳 The Dignity of Indian Work • Natural Warm Sunlight</span>
            </div>

            {/* 8 Dignified Real-Life Professions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              <div className="p-3 rounded-xl bg-slate-900/85 border border-amber-500/30 flex flex-col items-center text-center space-y-1">
                <Tractor className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-semibold text-slate-100">Farmer</span>
                <span className="text-[10px] text-slate-400">Green Field at Sunrise</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/85 border border-orange-500/30 flex flex-col items-center text-center space-y-1">
                <HardHat className="w-5 h-5 text-orange-400" />
                <span className="text-xs font-semibold text-slate-100">Construction Worker</span>
                <span className="text-[10px] text-slate-400">Safety Helmet & Pride</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/85 border border-blue-500/30 flex flex-col items-center text-center space-y-1">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-100">Factory Operator</span>
                <span className="text-[10px] text-slate-400">Modern Equipment</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/85 border border-rose-500/30 flex flex-col items-center text-center space-y-1">
                <Stethoscope className="w-5 h-5 text-rose-400" />
                <span className="text-xs font-semibold text-slate-100">Doctor & Nurse</span>
                <span className="text-[10px] text-slate-400">Compassion & Healing</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/85 border border-emerald-500/30 flex flex-col items-center text-center space-y-1">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-100">Teacher</span>
                <span className="text-[10px] text-slate-400">Guiding Classrooms</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/85 border border-cyan-500/30 flex flex-col items-center text-center space-y-1">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-100">Delivery Worker</span>
                <span className="text-[10px] text-slate-400">Powering Commerce</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/85 border border-indigo-500/30 flex flex-col items-center text-center space-y-1">
                <Laptop className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-100">Engineer</span>
                <span className="text-[10px] text-slate-400">Project Innovation</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/85 border border-teal-500/30 flex flex-col items-center text-center space-y-1">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <span className="text-xs font-semibold text-slate-100">Office Professional</span>
                <span className="text-[10px] text-slate-400">Dedication & Growth</span>
              </div>
            </div>

            {/* Display Texts */}
            <div className="flex items-center justify-center space-x-6 sm:space-x-12 pt-2">
              <span className="text-2xl sm:text-4xl font-serif text-orange-400 font-medium">मेहनत</span>
              {elapsed >= 23.5 && (
                <span className="text-2xl sm:text-4xl font-serif text-white font-medium animate-fadeIn">हुनर</span>
              )}
              {elapsed >= 26.5 && (
                <span className="text-2xl sm:text-4xl font-serif text-emerald-400 font-medium animate-fadeIn">हौसला</span>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 4 (0:30–0:40) — YOUNG INDIA
            Modern Indian youth, male graduate with resume, female candidate preparing
            for interview, young professional entering office, group of candidates.
            Large Indian flag gracefully in distance. Clean modern Indian workplace.
            Text: "हर सपने को मिले" -> "एक अवसर"
        ------------------------------------------------------------------- */}
        {sceneNum === 4 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-4xl animate-fadeIn">
            <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-slate-900/90 border border-blue-500/40 text-xs text-cyan-300 font-mono">
              <span>🇮🇳 Young India • Hope, Confidence, Ambition & Opportunity</span>
            </div>

            {/* Young India Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-blue-500/30 flex flex-col items-center text-center space-y-3 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Graduates & Freshers</div>
                  <div className="text-xs text-slate-300 font-light">
                    Holding resumes with ambition and confidence, stepping into the professional world.
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col items-center text-center space-y-3 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Interview Readiness</div>
                  <div className="text-xs text-slate-300 font-light">
                    Preparing thoroughly, ready to showcase skills and build lasting careers.
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex flex-col items-center text-center space-y-3 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Modern Indian Workplaces</div>
                  <div className="text-xs text-slate-300 font-light">
                    Walking together with purpose; Tiranga proudly flying in the horizon.
                  </div>
                </div>
              </div>
            </div>

            {/* Display Texts */}
            <div className="space-y-2 pt-2">
              <h1 className="text-2xl sm:text-4xl font-serif text-white tracking-wide">
                हर सपने को मिले
              </h1>
              {elapsed >= 35.0 && (
                <h2 className="text-3xl sm:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-white to-emerald-400 tracking-wider animate-fadeIn">
                  एक अवसर
                </h2>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 5 (0:40–0:50) — INDIA MOVES FORWARD
            Montage: Child studying -> Graduate, Farmer -> Modern agriculture,
            Worker -> Modern industry, Student -> Professional, Candidate -> Opportunity.
            Flowing Tiranga ribbon of light, marigold petals, return to Tiranga.
            Text: "एक भारत", "करोड़ों सपने", "एक तिरंगा"
        ------------------------------------------------------------------- */}
        {sceneNum === 5 && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-4xl animate-fadeIn">
            {/* Cinematic Match-Cut Chains */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-3xl">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-orange-500/30 flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-300">Child Studying</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-amber-300 font-medium">Graduate</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-300">Farmer</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-200 font-medium">Modern Agriculture</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-blue-500/30 flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-300">Worker</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-300 font-medium">Modern Industry</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-300">Student</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-200 font-medium">Professional</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-300">Candidate</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Workplace Opportunity</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/30 flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-300">Teacher</span>
                <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-200 font-medium">Future Generation</span>
              </div>
            </div>

            {/* Subtle Tricolour Ribbon of Light */}
            <div className="h-1.5 w-64 sm:w-96 rounded-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] shadow-lg shadow-orange-500/30" />

            {/* Display Texts */}
            <div className="space-y-2 pt-1">
              <h1 className="text-3xl sm:text-5xl font-serif text-white tracking-wider">
                एक भारत
              </h1>
              {elapsed >= 43.5 && (
                <h2 className="text-2xl sm:text-4xl font-serif text-amber-200 tracking-wide animate-fadeIn">
                  करोड़ों सपने
                </h2>
              )}
              {elapsed >= 47.0 && (
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-white to-emerald-400 tracking-widest pt-1 animate-fadeIn">
                  एक तिरंगा 🇮🇳
                </h3>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            SCENE 6 (0:50–1:00) — AIJOBS INDEPENDENCE DAY FINALE
            Most important shot: Return to beautiful REAL Indian sunrise.
            A HUGE Indian National Flag waves slowly and proudly.
            Small marigold petals, white petals, green leaves float around.
            Official AIJobs logo placed respectfully BELOW the flag.
            Composition:
            BEAUTIFUL INDIAN FLAG 🇮🇳
            AIJOBS LOGO
            HAPPY INDEPENDENCE DAY
            15 AUGUST
            Celebrating India's Dreams & Opportunities
            JAI HIND
        ------------------------------------------------------------------- */}
        {sceneNum === 6 && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 w-full max-w-2xl animate-fadeIn">
            {/* Top Flag Headline */}
            <div className="space-y-1">
              <div className="text-xs font-mono tracking-[0.3em] text-orange-400 uppercase">
                15 AUGUST • INDEPENDENCE DAY
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] tracking-wider">
                HAPPY INDEPENDENCE DAY 🇮🇳
              </h1>
            </div>

            {/* Official AIJobs Logo Placed Respectfully BELOW the Flag */}
            <div className="relative pt-1">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-cyan-500/15 to-orange-500/20 rounded-2xl blur-xl animate-pulse" />
              <div className="relative px-8 py-3.5 rounded-2xl bg-slate-950/85 border border-blue-500/40 shadow-2xl backdrop-blur-md flex flex-col items-center space-y-1">
                <img
                  src="/images/aijobs-logo.png"
                  alt="AIJobs"
                  className="w-[240px] sm:w-[320px] md:w-[380px] max-w-[82vw] h-auto object-contain mx-auto"
                />
                <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase">
                 
                </span>
              </div>
            </div>

            {/* Brand Film Message & Final Words */}
            <div className="pt-2 space-y-2 border-t border-slate-800/80 w-full">
              <div className="text-sm sm:text-base font-serif italic text-amber-100">
                Celebrating India's Dreams & Opportunities
              </div>
              <div className="text-xs text-slate-300 font-light">
                सपनों से सफलता तक, AIJobs आपके साथ।
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-[0.28em] text-emerald-400 pt-1">
                JAI HIND 🇮🇳
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          BOTTOM TIMELINE PROGRESS & SCRIPT SCENE INDICATORS
      ===================================================================== */}
      <div className="relative z-30 px-6 py-4 sm:px-10 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-orange-400 font-bold">Scene {sceneNum}/6:</span>
            <span className="text-slate-200">
              {sceneNum === 1 && "Grand Tiranga Opening (0–10s)"}
              {sceneNum === 2 && "Children of India (10–20s)"}
              {sceneNum === 3 && "People Who Build India (20–30s)"}
              {sceneNum === 4 && "Young India (30–40s)"}
              {sceneNum === 5 && "India Moves Forward (40–50s)"}
              {sceneNum === 6 && "AIJobs Independence Day Finale (50–60s)"}
            </span>
          </div>
          <div>
            <span>{Math.floor(elapsed)}s</span> / <span>60s</span>
          </div>
        </div>

        {/* Accurate Indian Tricolour Gradient Progress Bar */}
        <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] transition-all duration-150 ease-linear shadow-lg"
            style={{ width: `${(elapsed / TOTAL_DURATION) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default IndependenceDayIntro;
