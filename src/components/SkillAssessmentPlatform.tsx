import { Award, Clock, Play, ShieldCheck, Sparkles, Trophy } from "lucide-react";



export interface SkillTest {
  id: string;
  title: string;
  category: "Coding" | "Aptitude" | "English" | "Sales" | "Finance" | "HR" | "Custom";
  durationMinutes: number;
  questionsCount: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  skillsTested: string[];
  passingScore: number;
  participantsCount: number;
}

const TESTS_CATALOG: SkillTest[] = [
  {
    id: "test-coding-react-ts",
    title: "React 19 & TypeScript System Architecture",
    category: "Coding",
    durationMinutes: 20,
    questionsCount: 10,
    difficulty: "Advanced",
    skillsTested: ["React 19", "TypeScript", "State Optimization", "Hooks"],
    passingScore: 80,
    participantsCount: 8420
  },
  {
    id: "test-aptitude-logic",
    title: "Quantitative Aptitude & Logical Reasoning",
    category: "Aptitude",
    durationMinutes: 15,
    questionsCount: 15,
    difficulty: "Intermediate",
    skillsTested: ["Data Interpretation", "Logical Sequences", "Probability"],
    passingScore: 75,
    participantsCount: 12900
  },
  {
    id: "test-english-comm",
    title: "Corporate English & Written Communication",
    category: "English",
    durationMinutes: 15,
    questionsCount: 12,
    difficulty: "Intermediate",
    skillsTested: ["Grammar", "Vocabulary", "Email Etiquette", "Tone Analysis"],
    passingScore: 80,
    participantsCount: 15400
  },
  {
    id: "test-sales-enterprise",
    title: "Enterprise B2B Sales & Value Pitching",
    category: "Sales",
    durationMinutes: 20,
    questionsCount: 10,
    difficulty: "Advanced",
    skillsTested: ["Discovery Questions", "Objection Handling", "Contract Closing"],
    passingScore: 85,
    participantsCount: 6300
  },
  {
    id: "test-finance-modeling",
    title: "Corporate Finance & Valuation Modeling",
    category: "Finance",
    durationMinutes: 25,
    questionsCount: 12,
    difficulty: "Advanced",
    skillsTested: ["DCF Valuation", "Financial Statements", "Cap Table Analysis"],
    passingScore: 80,
    participantsCount: 4800
  },
  {
    id: "test-hr-policy",
    title: "Strategic Talent Acquisition & HR Compliance",
    category: "HR",
    durationMinutes: 20,
    questionsCount: 12,
    difficulty: "Intermediate",
    skillsTested: ["Labor Laws", "Structured Interviews", "Retention Policy"],
    passingScore: 75,
    participantsCount: 5200
  }
];

const LEADERBOARD_SEED = [
  { rank: 1, name: "Alexander Wright", score: 98, testTitle: "React 19 & TypeScript System Architecture", date: "2026-07-28", badge: "Gold Master" },
  { rank: 2, name: "Priya Sharma", score: 96, testTitle: "Quantitative Aptitude & Logical Reasoning", date: "2026-07-27", badge: "Gold Master" },
  { rank: 3, name: "David Chen", score: 95, testTitle: "Enterprise B2B Sales & Value Pitching", date: "2026-07-26", badge: "Silver Expert" },
  { rank: 4, name: "Sarah Jenkins", score: 93, testTitle: "Corporate English & Written Communication", date: "2026-07-25", badge: "Silver Expert" },
  { rank: 5, name: "Michael Vance", score: 91, testTitle: "Corporate Finance & Valuation Modeling", date: "2026-07-24", badge: "Bronze Specialist" }
];

export default function SkillAssessmentPlatform() {
  const [activeTab, setActiveTab] = useState<"catalog" | "leaderboard" | "my-certifications">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeTest, setActiveTest] = useState<SkillTest | null>(null);
  
  // Test Runner state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [testFinished, setTestFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const sampleQuestions = [
    {
      q: "In React 19, which hook is natively provided for handling asynchronous state transitions without causing blocking renders?",
      options: ["useTransition", "useAsyncEffect", "useConcurrentState", "useOptimisticState"],
      correct: 0
    },
    {
      q: "How does TypeScript handle 'satisfies' operator versus standard type annotations?",
      options: [
        "It validates that an expression matches a type without mutating the inferred type of the expression.",
        "It enforces runtime type assertions during NodeJS execution.",
        "It converts standard interfaces into union types automatically.",
        "It is deprecated in TypeScript 5+."
      ],
      correct: 0
    },
    {
      q: "What is the optimal architectural pattern to prevent infinite re-renders in custom React state subscriber hooks?",
      options: [
        "Stabilize references outside component scope or use primitive dependency keys with useRef boundaries.",
        "Add inline arrow functions inside useEffect dependency array.",
        "Pass unmemoized object literals directly to context providers.",
        "Remove all dependency arrays from useEffect statements."
      ],
      correct: 0
    }
  ];

  const handleStartTest = (test: SkillTest) => {
    setActiveTest(test);
    setCurrentQIndex(0);
    setUserAnswers({});
    setTestFinished(false);
    setFinalScore(null);
  };

  const handleAnswerSelect = (optionIdx: number) => {
    setUserAnswers(prev => ({ ...prev, [currentQIndex]: optionIdx }));
  };

  const handleSubmitTest = () => {
    let scoreCount = 0;
    sampleQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) {
        scoreCount += 1;
      }
    });
    const calculatedPercentage = Math.round((scoreCount / sampleQuestions.length) * 100);
    setFinalScore(calculatedPercentage);
    setTestFinished(true);
  };

  const filteredCatalog = TESTS_CATALOG.filter(t => selectedCategory === "All" || t.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-neutral-900 to-black border border-purple-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-mono font-bold mb-3">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>MODULE 4 — SKILL ASSESSMENT PLATFORM</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Verified Skill Testing & Digital Certifications</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Take verified assessments across Coding, Aptitude, English, Sales, Finance, and HR to earn cryptographically verifiable digital badges on your profile.
            </p>
          </div>

          {/* Sub Nav */}
          <div className="flex items-center space-x-2 bg-black/60 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "catalog" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Test Catalog
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "leaderboard" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Global Leaderboard
            </button>
          </div>
        </div>
      </div>

      {activeTab === "catalog" && !activeTest && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar pb-1">
            {["All", "Coding", "Aptitude", "English", "Sales", "Finance", "HR"].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-neutral-900 border border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map(test => (
              <div
                key={test.id}
                className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl hover:border-purple-500/40 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-mono font-bold">
                      {test.category}
                    </span>
                    <span className="text-xs font-mono text-gray-400 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{test.durationMinutes} mins</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">{test.title}</h3>

                  <div className="flex flex-wrap gap-1.5">
                    {test.skillsTested.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] text-gray-300 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[11px] font-mono text-gray-400">
                    Pass Score: <span className="text-emerald-400 font-bold">{test.passingScore}%</span>
                  </div>

                  <button
                    onClick={() => handleStartTest(test)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    <span>Take Assessment</span>
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Active Mode */}
      {activeTest && (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">{activeTest.category} ASSESSMENT</span>
              <h3 className="text-lg font-bold text-white">{activeTest.title}</h3>
            </div>

            <button
              onClick={() => setActiveTest(null)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white font-mono cursor-pointer"
            >
              Exit Test
            </button>
          </div>

          {!testFinished ? (
            <div className="space-y-6">
              <div className="flex justify-between text-xs font-mono text-gray-400">
                <span>Question {currentQIndex + 1} of {sampleQuestions.length}</span>
                <span className="text-amber-400 font-bold">Time Remaining: 14:22</span>
              </div>

              <div className="p-4 bg-black/50 border border-white/5 rounded-xl space-y-2">
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {sampleQuestions[currentQIndex].q}
                </p>
              </div>

              <div className="space-y-2.5">
                {sampleQuestions[currentQIndex].options.map((option, optIdx) => (
                  <button
                    key={optIdx}
                    onClick={() => handleAnswerSelect(optIdx)}
                    className={`w-full text-left p-3.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      userAnswers[currentQIndex] === optIdx
                        ? "bg-purple-600 text-white border border-purple-400 shadow-lg"
                        : "bg-black/40 border border-white/5 text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    <span>{option}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      userAnswers[currentQIndex] === optIdx ? "border-white bg-white/20" : "border-gray-600"
                    }`}>
                      {userAnswers[currentQIndex] === optIdx && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-white/10">
                <button
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex(prev => prev - 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs font-mono text-gray-300 cursor-pointer"
                >
                  Previous
                </button>

                {currentQIndex + 1 < sampleQuestions.length ? (
                  <button
                    onClick={() => setCurrentQIndex(prev => prev + 1)}
                    className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white cursor-pointer"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitTest}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg cursor-pointer"
                  >
                    Submit Assessment
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Result Card & Verifiable Certificate */
            <div className="text-center py-6 space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
                <Trophy className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-white">Assessment Complete!</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">Verified Digital Certification Issued</p>
              </div>

              <div className="max-w-md mx-auto p-4 bg-black/60 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-300 font-mono">
                  <span>Score Achieved:</span>
                  <span className="text-xl font-extrabold text-emerald-400">{finalScore}%</span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-300 font-mono">
                  <span>Verification ID:</span>
                  <span className="text-xs text-purple-400 font-mono">CERT-AIJOBS-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Blue Verified Skill Badge added to your candidate profile.</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTest(null)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Back to Test Catalog
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Global Skill Leaderboard</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/60 text-gray-400 border-b border-white/10 uppercase">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Assessment Title</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Badge Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {LEADERBOARD_SEED.map(row => (
                  <tr key={row.rank} className="hover:bg-white/5 text-gray-200">
                    <td className="p-3 font-bold text-amber-400">#{row.rank}</td>
                    <td className="p-3 font-bold text-white">{row.name}</td>
                    <td className="p-3 text-gray-300">{row.testTitle}</td>
                    <td className="p-3 text-emerald-400 font-bold">{row.score}%</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px]">
                        {row.badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
