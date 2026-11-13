import React, { useState, useEffect } from "react";
import { UserProfile, JobPosting, JobApplication } from "../../types";
import CandidateAnimatedBackground from "./CandidateAnimatedBackground";
import CandidateHero from "./CandidateHero";
import CandidateTrustStrip from "./CandidateTrustStrip";
import CandidateLiveJobs from "./CandidateLiveJobs";
import CandidateHowItWorks from "./CandidateHowItWorks";
import CandidateFinalCTA from "./CandidateFinalCTA";
import EasyApplyModal from "../EasyApplyModal";
import { useToast } from "../GlobalToast";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

interface Props {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
  onSelectJob?: (jobId: string) => void;
  onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void;
  user?: UserProfile | null;
}

export default function CandidateHomeSection({
  onGetStarted,
  setActiveView,
  onOpenCompanyPage,
  onSelectJob,
  onOpenAuth,
  user,
}: Props) {
  const { showToast } = useToast();
  const [selectedJobForApply, setSelectedJobForApply] = useState<JobPosting | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<any>(user || null);

  useEffect(() => {
    if (!user?.uid) {
      setCandidateProfile(null);
      return;
    }
    getDoc(doc(db, "candidates", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          setCandidateProfile({ ...user, ...snap.data() });
        } else {
          setCandidateProfile(user);
        }
      })
      .catch(() => setCandidateProfile(user));
  }, [user]);

  const handleApplyClick = (job: JobPosting) => {
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth("signin", "candidate");
      } else {
        onGetStarted();
      }
      return;
    }
    setSelectedJobForApply(job);
  };

  return (
    <div className="aijobs-home relative min-h-screen bg-[#f8f7ff] text-slate-900 selection:bg-rose-200 selection:text-slate-950">
      {/* Cinematic Animated Background with Skyline, Particles, and Glows */}
      <CandidateAnimatedBackground />

      {/* 1. HERO SECTION */}
      <CandidateHero
        onGetStarted={onGetStarted}
        setActiveView={setActiveView}
        user={user}
      />

      {/* 2. TRUST STRIP */}
      <CandidateTrustStrip />

      {/* 3. LIVE JOBS — candidates can open and apply directly from each listing. */}
      <CandidateLiveJobs
        setActiveView={setActiveView}
        onSelectJob={onSelectJob}
        onApplyJob={handleApplyClick}
        user={user}
      />


      {/* 4. CAREER ADVICE */}
      <section id="career-advice" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 scroll-mt-24">
        <div className="overflow-hidden rounded-[30px] border border-violet-100 bg-white/90 p-6 sm:p-10 shadow-[0_24px_70px_rgba(76,29,149,0.09)] backdrop-blur">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">✦ Career Advice</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Build a career with a clear direction</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Practical guidance to help you prepare, apply confidently and grow professionally.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "01", title: "Resume that gets noticed", desc: "Use a clear summary, measurable achievements and skills that match the role." },
              { icon: "02", title: "Interview preparation", desc: "Practise your introduction, role-specific questions and real examples using STAR." },
              { icon: "03", title: "Skills & career growth", desc: "Choose one in-demand skill, build a small project and keep your learning consistent." },
              { icon: "04", title: "Apply safely & smartly", desc: "Tailor each application, research the employer and never pay for a job or interview." },
            ].map((tip) => (
              <article key={tip.icon} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-violet-50/70 p-5 transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-black text-white shadow-md">{tip.icon}</div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">{tip.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tip.desc}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Tip: Set one weekly career goal and track your progress. Small consistent steps create momentum.</p>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <CandidateHowItWorks />

      {/* 6. FINAL BOTTOM CTA BANNER */}
      <CandidateFinalCTA onGetStarted={onGetStarted} />

      {/* Easy Apply Modal if logged in candidate triggers quick apply */}
      {selectedJobForApply && user && (
        <EasyApplyModal
          job={selectedJobForApply}
          userId={user.uid}
          userName={user.name || "Candidate"}
          profile={candidateProfile || user}
          onClose={() => setSelectedJobForApply(null)}
          onAppliedSuccess={(_app: JobApplication) => {
            showToast("Application submitted successfully!", "success");
            setSelectedJobForApply(null);
          }}
          onNavigateToApplications={() => {
            setSelectedJobForApply(null);
            setActiveView("applications");
          }}
          onNavigateToFindJobs={() => {
            setSelectedJobForApply(null);
            setActiveView("public-jobs");
          }}
          onUploadResumeClick={() => {
            setSelectedJobForApply(null);
            setActiveView("resume-onboarding");
          }}
        />
      )}
    </div>
  );
}
