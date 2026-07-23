import React, { useState, useEffect } from "react";
import { Brain, Globe2, Sparkles, Layers } from "lucide-react";
import { BackgroundMode } from "./ThreeDBackground";
import soundSynth from "../utils/audioSynth";

interface ThreeDModeToggleProps {
  currentMode: BackgroundMode;
  onModeChange: (mode: BackgroundMode) => void;
  className?: string;
}

export function ThreeDModeToggle({ currentMode, onModeChange, className = "" }: ThreeDModeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const modes: { id: BackgroundMode; label: string; icon: React.ElementType; color: string }[] = [
    {
      id: "neural",
      label: "Neural Mesh",
      icon: Brain,
      color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30"
    },
    {
      id: "solarsystem",
      label: "3D Solar System",
      icon: Globe2,
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30"
    },
    {
      id: "cyber",
      label: "Cyber Particles",
      icon: Sparkles,
      color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30"
    }
  ];

  const activeModeConfig = modes.find((m) => m.id === currentMode) || modes[0];
  const ActiveIcon = activeModeConfig.icon;

  const handleSelectMode = (modeId: BackgroundMode) => {
    soundSynth.playToggle();
    onModeChange(modeId);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => {
          soundSynth.playClick();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all duration-300 shadow-lg cursor-pointer hover:scale-105 active:scale-95 ${activeModeConfig.color}`}
        title="Switch 3D Canvas Background (React Three Fiber Engine)"
      >
        <Layers className="w-3.5 h-3.5 animate-pulse text-indigo-300" />
        <ActiveIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline-block">{activeModeConfig.label}</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-1.5 bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/20 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-gray-400 border-b border-white/10 mb-1">
            3D Canvas Engine
          </div>
          {modes.map((m) => {
            const Icon = m.icon;
            const isSelected = m.id === currentMode;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMode(m.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600/30 text-indigo-300 border-l-2 border-indigo-400"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-gray-400"}`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ThreeDModeToggle;
