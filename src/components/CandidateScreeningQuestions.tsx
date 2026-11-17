import { useEffect, useState } from "react";
import { auth } from "../firebase";

export type CandidateScreeningResponse = { question: string; answer: string; category: string };

type Props = {
  jobId: string;
  onChange: (responses: CandidateScreeningResponse[]) => void;
};

export default function CandidateScreeningQuestions({ jobId, onChange }: Props) {
  const [questions, setQuestions] = useState<Array<{ category: string; question: string }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Sign in to load job screening questions.");
        const response = await fetch("/api/hiring-agent/screening-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + await user.getIdToken() },
          body: JSON.stringify({ jobId })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !Array.isArray(result.questions)) {
          throw new Error(result.error || "AI screening questions are temporarily unavailable.");
        }
        if (!active) return;
        const clean = result.questions.filter((item: any) => item && typeof item.question === "string" && item.question.trim()).map((item: any) => ({ category: String(item.category || "Job Fit"), question: String(item.question) }));
        setQuestions(clean);
        onChange(clean.map((item: any) => ({ ...item, answer: "" })));
      } catch (err: any) {
        if (active) setError(err?.message || "AI screening questions could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [jobId, onChange]);

  const updateAnswer = (question: { category: string; question: string }, answer: string) => {
    const next = { ...answers, [question.question]: answer };
    setAnswers(next);
    onChange(questions.map(item => ({ ...item, answer: next[item.question] || "" })).filter(item => item.answer.trim()));
  };

  return <section className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-4 space-y-3">
    <div>
      <h3 className="text-sm font-bold text-cyan-200">AI job-specific screening</h3>
      <p className="mt-1 text-[11px] text-slate-400">Answer the questions generated from this actual job posting. Your answers are shared with the hiring team for evaluation.</p>
    </div>
    {loading && <p className="text-xs text-slate-400">Loading job-specific AI questions…</p>}
    {!loading && error && <p className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2 text-xs text-amber-200">{error} You can still submit your application; AI evaluation will be unavailable until questions are loaded.</p>}
    {!loading && !error && questions.map((item,index)=><label key={item.question} className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">{index+1}. {item.category}</span>
      <span className="block text-xs font-medium text-white">{item.question}</span>
      <textarea value={answers[item.question] || ""} onChange={event=>updateAnswer(item,event.target.value)} rows={3} maxLength={3000} placeholder="Write your answer…" className="w-full resize-y rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"/>
    </label>)}
    {!loading && !error && questions.length > 0 && <p className="text-[10px] text-slate-500">You can submit without answering every question, but only written answers can be evaluated by the AI engine.</p>}
  </section>;
}
