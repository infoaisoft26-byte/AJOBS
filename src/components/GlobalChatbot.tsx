import React, { FormEvent, HTMLDivElement, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  BarChart3,
  Bot,
  Briefcase,
  Calendar,
  Check,
  Chrome,
  Database,
  DollarSign,
  Expand,
  ExternalLink,
  Globe,
  Layers,
  Mic,
  MicOff,
  Minimize,
  Minus,
  Navigation,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Speech,
  TrendingUp,
  Type,
  User,
  Verified,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { parseJsonResponse } from "../utils/apiHelper";
import {
  ChatbotSearchService,
  MarketTrendsReport,
  VerifiedSource
} from "../services/ai/chatbotSearch.service";
import { JobMarketTrendsDashboard } from "./chat/JobMarketTrendsDashboard";

export interface ChatMessage {
  id?: string;
  sender: "user" | "ai";
  text: string;
  isGrounded?: boolean;
  isError?: boolean;
  groundingSources?: VerifiedSource[];
  marketTrendsReport?: MarketTrendsReport;
  showMarketDashboard?: boolean;
}

interface GlobalChatbotProps {
  user: any; // UserProfile or null
}

export function GlobalChatbot({ user }: GlobalChatbotProps) {
  // Respect user preference: closed or open state
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem("aijobs_chat_closed") !== "true";
  });
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem("aijobs_chat_minimized") === "true";
  });

  const [liveWebResults, setLiveWebResults] = useState(true);
  const [showDirectDashboard, setShowDirectDashboard] = useState(false);
  const [marketTrendsData, setMarketTrendsData] = useState<MarketTrendsReport | null>(null);
  const [isMarketTrendsLoading, setIsMarketTrendsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial_welcome",
      sender: "ai",
      text: `Hello ${user?.name || "there"}! 👋 I am your **AIJobs Career Assistant**, powered by **Google Search API Grounding**.
      
I provide real-time updates and live intelligence on:
- 📊 **Top Trending Industries**: Emerging tech sectors, AI/ML, Cloud & Cybersecurity hiring
- 🔄 **Hiring Market Updates**: Current seasonal hiring cycles, quarterly budget unlocks & GCC surges
- 💼 **Live Salary Benchmarks**: Verified compensation ranges across Indian & global tech hubs
- 🎯 **ATS Optimization & Interview Coaching**: Tailored STAR-method blueprints

Ask me about **"top trending industries"** or **"hiring market updates"** to view our interactive live market dashboard!`,
      isGrounded: true
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUserPrompt, setLastUserPrompt] = useState("");
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Candidate application context
  const [candidateContext, setCandidateContext] = useState<any>(null);

  // Initialize unique session ID and load initial market trends report in background
  useEffect(() => {
    let savedSession = localStorage.getItem("aijobs_chat_session_id");
    if (!savedSession) {
      savedSession = `session_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("aijobs_chat_session_id", savedSession);
    }
    setSessionId(savedSession);

    // Pre-fetch default market report for instant dashboard rendering
    ChatbotSearchService.fetchMarketTrendsReport().then((rep) => {
      setMarketTrendsData(rep);
    });
  }, []);

  // Sync closed & minimized state
  const handleToggleClose = (closed: boolean) => {
    setIsOpen(!closed);
    localStorage.setItem("aijobs_chat_closed", closed ? "true" : "false");
  };

  const handleToggleMinimize = (minimized: boolean) => {
    setIsMinimized(minimized);
    localStorage.setItem("aijobs_chat_minimized", minimized ? "true" : "false");
  };

  // Fetch candidate context if user is candidate
  useEffect(() => {
    if (!user || user.role !== "candidate") return;

    async function loadCandidateContext() {
      try {
        const res = await fetch(`/api/verification/my-status?userId=${user.uid}`);
        setCandidateContext({
          candidateId: user.uid,
          candidateName: user.name || user.displayName || "Candidate",
          status: "Applied",
          hasActiveApplication: true
        });
      } catch (err) {
        console.warn("Failed to load candidate application context:", err);
      }
    }

    loadCandidateContext();
  }, [user]);

  // Fetch chat history from backend on mount or sessionId change
  useEffect(() => {
    if (!sessionId) return;

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/ai/chat-history?sessionId=${sessionId}`);
        const data = await parseJsonResponse(response);
        if (data.messages && data.messages.length > 0) {
          const formatted = data.messages.map((m: any) => {
            const isMarketQuery = ChatbotSearchService.isMarketTrendsQuery(m.text || "");
            const normalizedSources = ChatbotSearchService.normalizeVerifiedSources(m.groundingSources || []);
            return {
              sender: m.sender,
              text: m.text,
              isGrounded: m.source === "search" || (m.text && m.text.includes("Live Web Results Powered by Google")),
              groundingSources: normalizedSources,
              showMarketDashboard: isMarketQuery,
              marketTrendsReport: isMarketQuery ? (marketTrendsData || ChatbotSearchService.getDefaultMarketTrends()) : undefined
            };
          });
          setMessages(formatted);
        }
      } catch (err) {
        console.warn("Failed to load conversation history:", err);
      }
    };

    loadHistory();
  }, [sessionId, marketTrendsData]);

  // Dynamic scrolling
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading, showDirectDashboard]);

  // Refresh live market trends
  const handleRefreshMarketTrends = async () => {
    setIsMarketTrendsLoading(true);
    try {
      const rep = await ChatbotSearchService.fetchMarketTrendsReport("latest tech hiring market update");
      setMarketTrendsData(rep);
    } catch (e) {
      console.warn("Refresh market trends failed:", e);
    } finally {
      setIsMarketTrendsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    setLastUserPrompt(userMsg);
    setHasError(false);
    setErrorMessage("");

    // Check if this query is asking for top trending industries or hiring market updates
    const isMarketIntent = ChatbotSearchService.isMarketTrendsQuery(userMsg);

    // Add User message and set loading
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInputText("");
    setLoading(true);

    // Fetch market data report if market intent
    let activeMarketReport = marketTrendsData;
    if (isMarketIntent && !activeMarketReport) {
      activeMarketReport = ChatbotSearchService.getDefaultMarketTrends();
      setMarketTrendsData(activeMarketReport);
    }

    const contextHistory = messages.slice(-6).map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text
    }));

    // Placeholder message for response
    setMessages((prev) => [
      ...prev,
      {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: "",
        isGrounded: liveWebResults,
        groundingSources: [],
        showMarketDashboard: isMarketIntent,
        marketTrendsReport: isMarketIntent ? (activeMarketReport || ChatbotSearchService.getDefaultMarketTrends()) : undefined
      }
    ]);

    try {
      // Call canonical backend AI Assistant endpoint: POST /api/ai-assistant/chat
      const data = await ChatbotSearchService.sendCanonicalChat(userMsg, sessionId, contextHistory);

      // Strictly validate the success flag and generated reply
      if (!data || !data.success || typeof data.reply !== "string" || !data.reply.trim()) {
        const failureCode = data?.code || "AI_SERVICE_ERROR";
        const failureMsg = data?.message || "AI Assistant is temporarily unavailable. Please try again.";
        const customError = new Error(failureMsg);
        (customError as any).code = failureCode;
        throw customError;
      }

      setLoading(false);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].sender === "ai") {
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            text: data.reply.trim(),
            isGrounded: true,
            showMarketDashboard: isMarketIntent,
            marketTrendsReport: isMarketIntent
              ? (activeMarketReport || ChatbotSearchService.getDefaultMarketTrends())
              : undefined
          };
        }
        return copy;
      });
    } catch (err: any) {
      setLoading(false);
      setHasError(true);
      const errText = err?.message || "AI Assistant service is temporarily unreachable.";
      setErrorMessage(errText);

      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].sender === "ai") {
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            text: `⚠️ **AI Assistant Notice**: ${errText}`,
            isError: true
          };
        }
        return copy;
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  // Web Speech Recognition
  const toggleSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const resetChatSession = () => {
    if (confirm("Are you sure you want to reset your conversation history?")) {
      const newSession = `session_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("aijobs_chat_session_id", newSession);
      setSessionId(newSession);
      setMessages([
        {
          id: `welcome_${Date.now()}`,
          sender: "ai",
          text: `Session reset! I am ready with live **Google Search API Grounding** and **Market Trends Analytics**. How can I assist you today?`,
          isGrounded: true
        }
      ]);
      setHasError(false);
      setShowDirectDashboard(false);
    }
  };

  const suggestedPrompts = [
    {
      label: "Top Trending Industries",
      icon: <TrendingUp className="w-3 h-3 text-emerald-400" />,
      text: "Show top trending industries and hiring market updates for 2026."
    },
    {
      label: "Hiring Market Updates",
      icon: <BarChart3 className="w-3 h-3 text-indigo-400" />,
      text: "Give me the latest hiring market updates, seasonal cycles, and active hiring waves."
    },
    {
      label: "Live Salary Benchmarks",
      icon: <DollarSign className="w-3 h-3 text-amber-400" />,
      text: "What are the live salary benchmarks and high-paying tech roles in India?"
    },
    {
      label: "GCC & AI Expansion Surge",
      icon: <Briefcase className="w-3 h-3 text-purple-400" />,
      text: "What are the latest GCC expansion trends and in-demand AI engineering skills?"
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="career-assistant-widget">
      <AnimatePresence>
        {!isOpen ? (
          // Collapsed button
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={() => handleToggleClose(false)}
            className="w-[52px] h-[52px] rounded-full sm:w-[175px] sm:h-[50px] sm:rounded-full bg-slate-950 border border-indigo-500/40 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-indigo-400 transition-all cursor-pointer flex items-center justify-center sm:px-3.5 space-x-2 group"
            id="global-floating-chatbot-btn"
          >
            <div className="relative shrink-0">
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border border-slate-950" />
              <Bot className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="hidden sm:inline text-xs font-bold font-mono tracking-wide text-gray-200 truncate">
              Career Assistant
            </span>
          </motion.button>
        ) : (
          // Active Chat Panel (Max width 420px, height 600px)
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className={`w-[420px] max-w-[calc(100vw-32px)] bg-slate-950/95 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.8)] flex flex-col transition-all ${
              isMinimized ? "h-[54px]" : "h-[600px] max-h-[90vh]"
            }`}
          >
            {/* Panel Header */}
            <div className="p-3.5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative shrink-0">
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950 animate-pulse" />
                  <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <div className="text-left truncate">
                  <h3 className="text-xs font-bold text-white font-mono flex items-center gap-1.5 truncate">
                    <span>AI Career Assistant</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[8px] rounded border border-emerald-500/30 shrink-0">
                      Search Grounded
                    </span>
                  </h3>
                  <p className="text-[9px] text-gray-400 font-mono flex items-center gap-1 truncate">
                    <Globe className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                    <span>Live Google Search • Real-Time Market Trends</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                {/* Header Market Trends Toggle Button */}
                <button
                  onClick={() => setShowDirectDashboard((prev) => !prev)}
                  title="Toggle Market Trends Dashboard"
                  className={`p-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center space-x-1 ${
                    showDirectDashboard
                      ? "bg-indigo-600 border-indigo-400 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[9px] font-bold">Trends</span>
                </button>

                <button
                  onClick={resetChatSession}
                  title="Reset conversation"
                  className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleMinimize(!isMinimized)}
                  title={isMinimized ? "Expand" : "Minimize"}
                  className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleClose(true)}
                  title="Close Assistant"
                  className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conversation Body (when not minimized) */}
            {!isMinimized && (
              <>
                {/* Direct Market Dashboard Header View (if toggled via top bar) */}
                <AnimatePresence>
                  {showDirectDashboard && marketTrendsData && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-b border-indigo-500/20 bg-slate-950/95 px-3 py-2"
                    >
                      <JobMarketTrendsDashboard
                        report={marketTrendsData}
                        onRefresh={handleRefreshMarketTrends}
                        isLoading={isMarketTrendsLoading}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className="flex flex-col max-w-[94%]">
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                              : msg.isError
                              ? "bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-tl-none"
                              : "bg-white/5 text-gray-200 border border-white/5 rounded-tl-none prose prose-invert prose-xs"
                          }`}
                        >
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>

                        {/* Automatic Summary Dashboard of Job Market Trends */}
                        {msg.sender === "ai" && msg.showMarketDashboard && msg.marketTrendsReport && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.25 }}
                          >
                            <JobMarketTrendsDashboard
                              report={msg.marketTrendsReport}
                              onRefresh={handleRefreshMarketTrends}
                              isLoading={isMarketTrendsLoading}
                            />
                          </motion.div>
                        )}

                        {/* Verified Sources & Grounding Snippets Renderer */}
                        {msg.sender === "ai" && !msg.isError && (
                          <div className="mt-1.5 ml-1 space-y-1.5">
                            {msg.isGrounded && (
                              <div className="text-[8px] text-emerald-400 font-mono flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                <span>Google Search Grounded • Verified Real-Time Intelligence</span>
                              </div>
                            )}

                            {msg.groundingSources && msg.groundingSources.length > 0 && (
                              <div className="pt-1.5 border-t border-white/5 space-y-1">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>Verified Live Sources ({msg.groundingSources.length}):</span>
                                </span>

                                <div className="space-y-1">
                                  {msg.groundingSources.map((src, srcIdx) => (
                                    <a
                                      key={srcIdx}
                                      href={src.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group block p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/15 border border-white/10 hover:border-indigo-400/40 transition-all text-left"
                                    >
                                      <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center space-x-1.5 min-w-0">
                                          <Globe className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                          <span className="font-mono text-[9px] font-semibold text-indigo-300 group-hover:text-white truncate">
                                            {src.title || src.domain}
                                          </span>
                                          <span className="text-[8px] px-1 rounded bg-white/10 text-gray-400 font-mono shrink-0">
                                            {src.domain}
                                          </span>
                                        </div>
                                        <ExternalLink className="w-2.5 h-2.5 text-gray-400 group-hover:text-indigo-300 shrink-0" />
                                      </div>

                                      {src.snippet && (
                                        <p className="mt-0.5 text-[8px] text-gray-400 group-hover:text-gray-300 font-sans line-clamp-1">
                                          {src.snippet}
                                        </p>
                                      )}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-2.5 text-xs text-gray-400 flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <span
                            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                        <span className="font-mono text-[10px]">
                          Grounding live job market data & verified sources...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Retry Button on API Error */}
                  {hasError && lastUserPrompt && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-xs text-rose-300">
                      <span>Request execution halted.</span>
                      <button
                        onClick={() => handleSendMessage(lastUserPrompt)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[10px] flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Suggested Prompts Bar */}
                {messages.length <= 1 && (
                  <div className="px-3.5 py-2 bg-black/40 border-t border-white/5 space-y-1.5">
                    <p className="text-[9px] text-gray-400 font-bold font-mono uppercase flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                      <span>Live Market & Career Prompts</span>
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {suggestedPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(prompt.text)}
                          className="flex items-center space-x-1.5 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-left transition-all text-[9px] text-gray-300 hover:text-white cursor-pointer"
                        >
                          {prompt.icon}
                          <span className="truncate font-medium">{prompt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounding Toggle Bar */}
                <div className="px-3.5 py-1.5 bg-slate-950 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        liveWebResults ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                      }`}
                    />
                    <span>Google Search Grounding (Live Market Data)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLiveWebResults(!liveWebResults)}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                      liveWebResults
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 text-gray-500 border border-white/5"
                    }`}
                  >
                    {liveWebResults ? "Active" : "Disabled"}
                  </button>
                </div>

                {/* Input Form */}
                <form
                  onSubmit={handleFormSubmit}
                  className="p-2.5 border-t border-white/10 flex items-center space-x-2 bg-slate-950"
                >
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    title="Voice input"
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/30"
                        : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5"
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask about 'top trending industries' or 'hiring market updates'..."
                    disabled={loading}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
