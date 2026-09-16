import React from "react";

const particles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 96}%`,
  top: `${8 + ((index * 29) % 78)}%`,
  delay: `${(index % 6) * -0.8}s`,
  duration: `${5 + (index % 5)}s`
}));

export default function CandidateAnimatedBackground() {
  return (
    <div className="candidate-animated-bg" aria-hidden="true">
      <div className="candidate-bg-gradient" />
      <div className="candidate-bg-grid" />
      <div className="candidate-glow candidate-glow-blue" />
      <div className="candidate-glow candidate-glow-cyan" />
      <div className="candidate-glow candidate-glow-purple" />
      <div className="candidate-light-beam candidate-light-beam-one" />
      <div className="candidate-light-beam candidate-light-beam-two" />
      <svg className="candidate-network" viewBox="0 0 1440 760" preserveAspectRatio="none">
        <path d="M0 530 C230 390 350 650 585 480 S980 220 1440 390" />
        <path d="M0 250 C280 420 530 120 790 310 S1190 590 1440 270" />
        <circle cx="188" cy="442" r="4" /><circle cx="585" cy="480" r="4" /><circle cx="1040" cy="323" r="4" /><circle cx="1294" cy="356" r="4" />
      </svg>
      <div className="candidate-particles">
        {particles.map((particle) => <span key={particle.id} style={{ left: particle.left, top: particle.top, animationDelay: particle.delay, animationDuration: particle.duration }} />)}
      </div>
    </div>
  );
}
