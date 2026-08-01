import {
  BookOpen,
  CheckCircle2,
  Play,
  Sparkles,
  Video,
  Zap
} from "lucide-react";
import { useState } from "react";


export interface Course {
  id: string;
  title: string;
  category: "Engineering" | "AI & Data" | "Product & UX" | "HR & Management";
  instructor: string;
  duration: string;
  modulesCount: number;
  completedModules: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  coverImage: string;
  description: string;
  skillsAcquired: string[];
}

const COURSES_CATALOG: Course[] = [
  {
    id: "course-react-19-next15",
    title: "Mastering React 19 & Next.js 15 App Architecture",
    category: "Engineering",
    instructor: "David Miller, Ex-Vercel Lead",
    duration: "8.5 Hours",
    modulesCount: 12,
    completedModules: 9,
    level: "Advanced",
    coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=400&q=80",
    description: "Deep-dive into Server Components, Server Actions, streaming SSR, and optimistic UI updates for enterprise Web Apps.",
    skillsAcquired: ["React 19", "Next.js App Router", "Server Actions", "Streaming SSR"]
  },
  {
    id: "course-genai-gemini",
    title: "Building Production GenAI Apps with Google Gemini SDK",
    category: "AI & Data",
    instructor: "Elena Rostova, Google Developer Expert",
    duration: "6.0 Hours",
    modulesCount: 10,
    completedModules: 4,
    level: "Intermediate",
    coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    description: "Master function calling, search grounding, live audio streams, and agentic orchestration using @google/genai.",
    skillsAcquired: ["Google Gemini API", "Function Calling", "Multimodal Prompts", "AI Orchestration"]
  },
  {
    id: "course-system-design",
    title: "High-Scale System Design & Microservices Sharding",
    category: "Engineering",
    instructor: "Marcus Vance, Principal Architect",
    duration: "10.0 Hours",
    modulesCount: 14,
    completedModules: 14,
    level: "Advanced",
    coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80",
    description: "Learn distributed caching, Kafka queues, database sharding, and fault tolerance under 100k QPS load.",
    skillsAcquired: ["Distributed Caching", "Kafka Queues", "Database Sharding", "Fault Tolerance"]
  }
];

export default function LearningPlatform() {
  const [courses, setCourses] = useState<Course[]>(COURSES_CATALOG);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);

  const sampleLessons = [
    { title: "1. Introduction to Concurrent Rendering & Transitions", duration: "12 mins", type: "video" },
    { title: "2. Server Actions vs Client Mutation Hooks", duration: "18 mins", type: "video" },
    { title: "3. Interactive Coding Exercise: Debounced State Boundary", duration: "25 mins", type: "code" },
    { title: "4. Module Quiz & Knowledge Assessment", duration: "10 mins", type: "quiz" }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-neutral-900 to-black border border-teal-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-mono font-bold mb-3">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>MODULE 5 — CANDIDATE LEARNING CENTER</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Interactive Upskilling & Certification Hub</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Access curated video courses, hands-on coding practice exercises, mock quizzes, and earn verifiable skill badges to showcase on job applications.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono">
            <div>
              <span className="text-gray-400 block text-[10px]">CURRENT STREAK</span>
              <span className="text-amber-400 font-extrabold text-base flex items-center gap-1">
                <Zap className="w-4 h-4 fill-amber-400" /> 7 Days
              </span>
            </div>
            <div className="border-l border-white/10 pl-3">
              <span className="text-gray-400 block text-[10px]">BADGES EARNED</span>
              <span className="text-teal-400 font-extrabold text-base">3 Verified</span>
            </div>
          </div>
        </div>
      </div>

      {!activeCourse ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const progressPercent = Math.round((course.completedModules / course.modulesCount) * 100);
            return (
              <div
                key={course.id}
                onClick={() => setActiveCourse(course)}
                className="bg-neutral-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-teal-500/40 hover:shadow-2xl transition-all duration-300 group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 border border-white/10 text-teal-300 text-[10px] font-mono font-bold">
                      {course.category}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-white text-base group-hover:text-teal-400 transition-colors leading-snug">
                      {course.title}
                    </h3>

                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="text-[11px] font-mono text-gray-400">
                      Instructor: <span className="text-gray-200">{course.instructor}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-mono text-gray-400">
                        <span>Progress ({course.completedModules}/{course.modulesCount} modules)</span>
                        <span className="text-teal-400 font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-1.5">
                        <div
                          className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">{course.duration}</span>
                  <button className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center space-x-1.5 transition-all shadow-lg shadow-teal-600/20 cursor-pointer">
                    <span>{progressPercent === 100 ? "Review Course" : "Continue"}</span>
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Active Course Classroom View */
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest">{activeCourse.category}</span>
              <h3 className="text-lg font-bold text-white">{activeCourse.title}</h3>
            </div>

            <button
              onClick={() => setActiveCourse(null)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white font-mono cursor-pointer"
            >
              Exit Classroom
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Interactive Player / Workspace */}
            <div className="lg:col-span-2 space-y-4">
              <div className="aspect-video bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center relative shadow-2xl">
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center mx-auto text-teal-400">
                    <Play className="w-8 h-8 fill-teal-400 ml-1" />
                  </div>
                  <h4 className="text-white font-bold text-base">
                    {sampleLessons[activeModuleIndex]?.title}
                  </h4>
                  <p className="text-xs text-gray-400 font-mono">
                    High Definition Stream • {sampleLessons[activeModuleIndex]?.duration}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-2">
                <h4 className="text-xs font-mono font-bold text-white uppercase">Lesson Key Takeaways</h4>
                <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                  <li>Understand async state boundaries and non-blocking re-renders.</li>
                  <li>Prevent waterfall network fetches using parallel server action calls.</li>
                  <li>Optimize bundle payload with dynamic client component imports.</li>
                </ul>
              </div>
            </div>

            {/* Right: Course Curriculum Playlist */}
            <div className="bg-neutral-950 border border-white/10 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center space-x-2">
                <Video className="w-4 h-4 text-teal-400" />
                <span>Course Modules ({sampleLessons.length})</span>
              </h4>

              <div className="space-y-2">
                {sampleLessons.map((lesson, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveModuleIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                      activeModuleIndex === idx
                        ? "bg-teal-600/20 border border-teal-500/40 text-teal-300 font-bold"
                        : "bg-neutral-900 border border-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {idx === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="line-clamp-1">{lesson.title}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{lesson.duration}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
