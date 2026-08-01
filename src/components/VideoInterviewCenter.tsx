import {
  Award,
  Camera,
  CheckCircle,
  FileText,
  Mic,
  ShieldAlert,
  Sparkles,
  Video
} from "lucide-react";
import { useState } from "react";

import { InterviewSession } from "../types";

interface VideoInterviewCenterProps {
  sessions?: InterviewSession[];
}

export default function VideoInterviewCenter({ sessions = [] }: VideoInterviewCenterProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || "session-01");
  const [recordingConsentGranted, setRecordingConsentGranted] = useState<boolean>(false);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [interviewSummary, setInterviewSummary] = useState<any | null>(null);

  const handleToggleConsent = () => {
    setRecordingConsentGranted(!recordingConsentGranted);
  };

  const handleStartSession = () => {
    if (!recordingConsentGranted) {
      alert("Please grant explicit recording consent before launching the live video interview.");
      return;
    }
    setIsLiveActive(true);
  };

  const handleEndSessionAndProcessAI = async () => {
    setIsLiveActive(false);
    setIsTranscribing(true);

    // Simulate AI Transcription and Automated Scorecard Generation
    setTimeout(() => {
      setIsTranscribing(false);
      setTranscriptionText(
        "Candidate: 'I designed a distributed queue system handling 50k requests per second using Redis and Kafka...'\nInterviewer: 'How did you prevent data loss during broker fails?'\nCandidate: 'We configured a replication factor of 3 and in-sync replicas with idempotent producers.'"
      );
      setInterviewSummary({
        candidateName: "Alexander Wright",
        jobTitle: "Senior Distributed Systems Engineer",
        technicalScore: 92,
        communicationScore: 88,
        problemSolvingScore: 95,
        cultureFitScore: 90,
        overallRecommendationScore: 91,
        verdict: "STRONG HIRE",
        keyHighlights: [
          "Demonstrated exceptional depth in Kafka partition key strategies.",
          "Clear, structured communication using first-principles system design.",
          "Strong alignment with remote-first engineering culture.",
        ],
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-900/40 via-neutral-900 to-black border border-red-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-mono font-bold mb-3">
              <Video className="w-3.5 h-3.5 text-red-400" />
              <span>ENTERPRISE VIDEO INTERVIEW SUITE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Video Interview & Scorecard Center</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              Conduct live interviews with GDPR-compliant recording consent, automated audio transcription, and instant multi-dimensional AI scorecards.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={recordingConsentGranted}
                onChange={handleToggleConsent}
                className="rounded border-gray-700 bg-neutral-800 text-red-500 focus:ring-red-500"
              />
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Candidate Consent Granted</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Studio View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video Stage & Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-neutral-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-2xl group">
            {/* Background Stream Simulation */}
            {isLiveActive ? (
              <div className="w-full h-full bg-gradient-to-tr from-gray-900 via-slate-900 to-black flex items-center justify-center relative">
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>REC LIVE • 00:04:32</span>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-xl">
                    AW
                  </div>
                  <h3 className="text-white font-bold text-lg">Alexander Wright</h3>
                  <p className="text-xs text-gray-400 font-mono">Senior Distributed Systems Engineer Candidate</p>
                </div>

                {/* Local Mic/Camera Feed Preview */}
                <div className="absolute bottom-4 right-4 w-32 h-24 bg-black border border-white/20 rounded-xl flex items-center justify-center text-xs text-gray-400 font-mono">
                  Interviewer Feed
                </div>
              </div>
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mx-auto text-red-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Video Interview Studio Ready</h3>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Ensure camera/mic permissions and explicit candidate consent are active.
                  </p>
                </div>

                <button
                  onClick={handleStartSession}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 hover:scale-105 transition-all cursor-pointer"
                >
                  Launch Live Video Session
                </button>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          {isLiveActive && (
            <div className="flex items-center justify-between bg-neutral-900 border border-white/10 rounded-xl p-3">
              <div className="flex items-center space-x-3">
                <button className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-mono flex items-center space-x-1.5 cursor-pointer">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>Mute</span>
                </button>
                <button className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-mono flex items-center space-x-1.5 cursor-pointer">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span>Camera</span>
                </button>
              </div>

              <button
                onClick={handleEndSessionAndProcessAI}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                End & Generate AI Scorecard
              </button>
            </div>
          )}
        </div>

        {/* Right: AI Scorecard & Live Transcription */}
        <div className="space-y-4">
          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Multi-Dimensional Scorecard</span>
            </h3>

            {isTranscribing ? (
              <div className="py-8 text-center space-y-3">
                <Sparkles className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-gray-300 font-mono">Transcribing audio and generating interview scorecard...</p>
              </div>
            ) : interviewSummary ? (
              <div className="space-y-4 animate-fade-in">
                {/* Verdict Badge */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">Final Decision:</span>
                  <span className="text-xs font-extrabold font-mono text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
                    {interviewSummary.verdict} ({interviewSummary.overallRecommendationScore}/100)
                  </span>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>Technical Knowledge</span>
                    <span className="font-bold text-emerald-400">{interviewSummary.technicalScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${interviewSummary.technicalScore}%` }} />
                  </div>

                  <div className="flex justify-between text-gray-300 pt-1">
                    <span>Problem Solving</span>
                    <span className="font-bold text-blue-400">{interviewSummary.problemSolvingScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${interviewSummary.problemSolvingScore}%` }} />
                  </div>

                  <div className="flex justify-between text-gray-300 pt-1">
                    <span>Communication</span>
                    <span className="font-bold text-indigo-400">{interviewSummary.communicationScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${interviewSummary.communicationScore}%` }} />
                  </div>
                </div>

                {/* Key Highlights */}
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-gray-400 uppercase">AI Key Observations:</span>
                  <div className="space-y-1.5 mt-2">
                    {interviewSummary.keyHighlights.map((h: string, idx: number) => (
                      <div key={idx} className="p-2 bg-black/40 border border-white/5 rounded-lg text-[11px] text-gray-300 flex items-start space-x-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 font-mono">
                No active session completed yet. Launch a session to populate live scorecard.
              </div>
            )}
          </div>

          {/* Transcription Logs */}
          {transcriptionText && (
            <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
              <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>AI Transcript Extract</span>
              </h4>
              <pre className="p-3 bg-black/60 border border-white/5 rounded-xl text-[11px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {transcriptionText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
