import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, X, Send, Mic, MicOff, RefreshCw, HelpCircle, Briefcase, Award, TrendingUp, DollarSign } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface GlobalChatbotProps {
  user: any; // UserProfile or null
}

export function GlobalChatbot({ user }: GlobalChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [liveWebResults, setLiveWebResults] = useState(true);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string; isGrounded?: boolean }>>([
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
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize unique session ID
  useEffect(() => {
    let savedSession = localStorage.getItem("aijobs_chat_session_id");
    if (!savedSession) {
      savedSession = `session_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("aijobs_chat_session_id", savedSession);
    }
    setSessionId(savedSession);
  }, []);

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
            isGrounded: m.source === "search" || m.text.includes("Live Web Results Powered by Google")
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
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    // Add User message and set loading
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInputText("");
    setLoading(true);

    try {
      // Build a short context window of the last 4 exchanges to keep context within limits
      const contextWindow = messages.slice(-4).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await fetch("/api/ai/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userMsg,
          sessionId,
          userId: user?.uid || "anonymous",
          chatHistory: contextWindow,
          enableSearch: liveWebResults
        })
      });

      if (!response.body) {
        throw new Error("Chatbot streaming gateway returned empty payload body");
      }

      // Add placeholder message for streamed response
      setMessages(prev => [...prev, { sender: "ai", text: "", isGrounded: liveWebResults }]);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      
      // Turn off loading indicator as streaming has initialized successfully
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
                
                // Update the last message in stream sequence
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
                // Ignore parsing errors for incomplete buffer JSON
              }
            }
          }
        }
      }

    } catch (err) {
      console.error("AI Assistant request error:", err);
      setMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: "I experienced a brief connectivity glitch while reaching the intelligence nodes. Please feel free to retry your prompt!"
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
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Voice recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

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
    }
  };

  const suggestedPrompts = [
    { label: "Salary Trends In India", icon: <DollarSign className="w-3 h-3 text-emerald-400" />, text: "Show me the latest salary benchmarks and trends for React & TypeScript Developers in India" },
    { label: "Check App Status", icon: <Briefcase className="w-3 h-3 text-blue-400" />, text: "What is my current job application and mock interview status?" },
    { label: "Highest Skills in Demand", icon: <TrendingUp className="w-3 h-3 text-purple-400" />, text: "Which technologies and soft skills are in highest demand for software roles in 2026?" },
    { label: "Resume Audit Rule", icon: <Award className="w-3 h-3 text-amber-400" />, text: "Give me 5 professional rules to clear automated ATS resume screening" }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center space-x-2.5 px-5 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 text-white rounded-full shadow-[0_8px_32px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10"
            id="global-floating-chatbot-btn"
          >
            <Bot className="w-5 h-5 animate-bounce" />
            <span className="text-xs font-bold font-mono tracking-wider uppercase">Career Assistant</span>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="w-92 h-120 bg-slate-950/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="relative">
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                  <div className="w-8.5 h-8.5 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <Bot className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black text-white tracking-tight uppercase font-mono">AIJobs Assistant</h3>
                  <p className="text-[9px] text-gray-400 font-mono">
                    {liveWebResults ? "Live Web Results • Active" : "Local Database Mode"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={resetChatSession}
                  title="Reset conversation"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conversation Core */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex flex-col max-w-[88%]">
                    <div
                      className={`rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-tr-none shadow-md"
                          : "bg-white/5 text-gray-300 border border-white/5 rounded-tl-none prose prose-invert prose-xs"
                      }`}
                    >
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                    {msg.isGrounded && msg.sender === "ai" && (
                      <span className="text-[8px] text-emerald-400/80 font-mono mt-1 ml-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                        Live Web Results Powered by Google
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 text-xs text-gray-400 flex items-center space-x-2.5">
                    <div className="flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="font-mono text-[10px]">Coach is searching & analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Prompts Block */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 bg-black/20 border-t border-white/5 space-y-1.5">
                <p className="text-[9px] text-gray-500 font-bold font-mono tracking-wider uppercase">Suggested Roadmaps</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt.text)}
                      className="flex items-center space-x-1.5 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all text-[9.5px] text-gray-400 hover:text-white cursor-pointer"
                    >
                      {prompt.icon}
                      <span className="truncate font-medium">{prompt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Web Results Google Search Grounding Toggle */}
            <div className="px-4 py-1.5 bg-slate-950/90 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${liveWebResults ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                <span>Google Search Grounding</span>
              </span>
              <button
                type="button"
                onClick={() => setLiveWebResults(!liveWebResults)}
                className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all cursor-pointer ${
                  liveWebResults 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" 
                    : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10"
                }`}
              >
                {liveWebResults ? "Live Web Results" : "Live Disabled"}
              </button>
            </div>

            {/* Input Form Footer */}
            <form onSubmit={handleFormSubmit} className="p-3 border-t border-white/10 flex items-center space-x-2 bg-slate-950">
              <button
                type="button"
                onClick={toggleSpeech}
                title={isListening ? "Listening..." : "Voice search"}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  isListening 
                    ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/30" 
                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
              </button>
              
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "Ask about salary benchmark, jobs..."}
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 focus:bg-white/[0.08]"
              />
              
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/40 disabled:text-gray-500 text-white rounded-xl transition-all cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
