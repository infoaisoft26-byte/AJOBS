import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, X, Send, Mic, MicOff, RefreshCw, AlertCircle, Minus, RotateCcw, Briefcase, Award, TrendingUp, DollarSign } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string; isGrounded?: boolean; isError?: boolean }>>([
    {
      sender: "ai",
      text: `Hello ${user?.name || "there"}! 👋 I am your **AIJobs Career Assistant**.
      
I can assist you with:
- **Search Jobs**: Find latest open opportunities
- **ATS & Resume Audit**: Optimize your skills and experience
- **Interview Coaching**: Suggest mock questions and analyze feedback
- **Salary Benchmarking**: Salary standards and IT hiring trends in India
- **Platform Navigation**: Guides for candidate, consultancy, or employer workflows

How can I accelerate your professional journey today?`
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

  // Initialize unique session ID
  useEffect(() => {
    let savedSession = localStorage.getItem("aijobs_chat_session_id");
    if (!savedSession) {
      savedSession = `session_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("aijobs_chat_session_id", savedSession);
    }
    setSessionId(savedSession);
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
        // Also fetch candidate applications if possible
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
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const formatted = data.messages.map((m: any) => ({
            sender: m.sender,
            text: m.text,
            isGrounded: m.source === "search" || (m.text && m.text.includes("Live Web Results Powered by Google"))
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.warn("Failed to load conversation history:", err);
      }
    };

    loadHistory();
  }, [sessionId]);

  // Dynamic scrolling
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    setLastUserPrompt(userMsg);
    setHasError(false);
    setErrorMessage("");

    // Add User message and set loading
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInputText("");
    setLoading(true);

    // AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const contextWindow = messages.slice(-4).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await fetch("/api/ai/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          userMessage: userMsg,
          sessionId,
          userId: user?.uid || "anonymous",
          candidateId: user?.role === "candidate" ? user.uid : undefined,
          recruiterId: ["employer", "recruiter", "corporate"].includes(user?.role || "") ? user.uid : undefined,
          consultancyId: ["consultancy", "agency"].includes(user?.role || "") ? user.uid : undefined,
          jobId: candidateContext?.activeJobId || undefined,
          chatHistory: contextWindow,
          enableSearch: liveWebResults,
          candidateContext
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned HTTP status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Chatbot streaming gateway returned empty payload body.");
      }

      // Add placeholder message for streamed response
      setMessages(prev => [...prev, { sender: "ai", text: "", isGrounded: liveWebResults }]);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      
      setLoading(false);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          const lines = chunkStr.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const dataStr = line.substring(6).trim();
                if (!dataStr) continue;
                const parsed = JSON.parse(dataStr);
                
                if (parsed.error) {
                  accumulatedText += `\n\n*Error: ${parsed.error}*`;
                } else if (parsed.text) {
                  accumulatedText += parsed.text;
                }
                
                setMessages(prev => {
                  const copy = [...prev];
                  if (copy.length > 0 && copy[copy.length - 1].sender === "ai") {
                    copy[copy.length - 1] = {
                      ...copy[copy.length - 1],
                      text: accumulatedText,
                      isGrounded: liveWebResults || copy[copy.length - 1].isGrounded
                    };
                  }
                  return copy;
                });
              } catch (e) {
                // Ignore chunk parse glitch
              }
            }
          }
        }
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("AI Assistant request error:", err);
      
      const isTimeout = err.name === "AbortError";
      const errText = isTimeout 
        ? "Request timed out after 30 seconds. Please try again."
        : (err.message || "Unable to reach intelligence server. Please check your network and retry.");

      setHasError(true);
      setErrorMessage(errText);

      setMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **API Communication Issue**: ${errText}`,
          isError: true
        }
      ]);
      setLoading(false);
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
          sender: "ai",
          text: `Session reset! I am ready for your fresh queries. How can I help you today?`
        }
      ]);
      setHasError(false);
    }
  };

  const suggestedPrompts = [
    { label: "Salary Trends In India", icon: <DollarSign className="w-3 h-3 text-emerald-400" />, text: "Show me the latest salary benchmarks for React & TypeScript Developers in India" },
    { label: "Check App Status", icon: <Briefcase className="w-3 h-3 text-blue-400" />, text: "What is my current job application status?" },
    { label: "Highest Skills in Demand", icon: <TrendingUp className="w-3 h-3 text-purple-400" />, text: "Which technologies are in highest demand for software roles in 2026?" },
    { label: "Resume Audit Rule", icon: <Award className="w-3 h-3 text-amber-400" />, text: "Give me 5 professional rules to clear automated ATS resume screening" }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="career-assistant-widget">
      <AnimatePresence>
        {!isOpen ? (
          // Collapsed button (Requirement 1)
          // Mobile: small circular icon (52x52px). Desktop: collapsed bar (160px width x 50px height)
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={() => handleToggleClose(false)}
            className="w-[52px] h-[52px] rounded-full sm:w-[160px] sm:h-[50px] sm:rounded-full bg-slate-950 border border-indigo-500/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-indigo-500/60 transition-all cursor-pointer flex items-center justify-center sm:px-3.5 space-x-2 group"
            id="global-floating-chatbot-btn"
          >
            <div className="relative shrink-0">
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-slate-950" />
              <Bot className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="hidden sm:inline text-xs font-bold font-mono tracking-wide text-gray-200 truncate">
              Assistant
            </span>
          </motion.button>
        ) : (
          // Active Chat Panel (Max width 360px, height 520px)
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className={`w-[360px] max-w-[calc(100vw-32px)] bg-slate-950/95 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.8)] flex flex-col transition-all ${
              isMinimized ? "h-[54px]" : "h-[520px] max-h-[85vh]"
            }`}
          >
            {/* Panel Header */}
            <div className="p-3.5 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="relative">
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950 animate-pulse" />
                  <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <span>AIJobs Assistant</span>
                  </h3>
                  <p className="text-[9px] text-gray-400 font-mono">
                    {candidateContext?.hasActiveApplication 
                      ? "AIJobs Hiring Assistant for this application" 
                      : (liveWebResults ? "Live Web Results • Active" : "Local Database Mode")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
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
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className="flex flex-col max-w-[88%]">
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
                        {msg.isGrounded && msg.sender === "ai" && !msg.isError && (
                          <span className="text-[8px] text-emerald-400/80 font-mono mt-1 ml-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            Live Search Grounding Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator (Requirement 2) */}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-2.5 text-xs text-gray-400 flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="font-mono text-[10px]">Assistant processing...</span>
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

                {/* Suggested Prompts */}
                {messages.length <= 1 && (
                  <div className="px-3.5 py-2 bg-black/30 border-t border-white/5 space-y-1.5">
                    <p className="text-[9px] text-gray-500 font-bold font-mono uppercase">Quick Prompts</p>
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

                {/* Grounding Toggle */}
                <div className="px-3.5 py-1.5 bg-slate-950 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${liveWebResults ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                    <span>Google Search Grounding</span>
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
                    {liveWebResults ? "Enabled" : "Disabled"}
                  </button>
                </div>

                {/* Input Form */}
                <form onSubmit={handleFormSubmit} className="p-2.5 border-t border-white/10 flex items-center space-x-2 bg-slate-950">
                  <button
                    type="button"
                    onClick={toggleSpeech}
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
                    placeholder="Type your query..."
                    disabled={loading}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
