import React, { useEffect } from "react";

interface AIJobs3DIntroProps {
  onComplete: () => void;
}

/**
 * Production startup intros are disabled.
 *
 * Keep this compatibility component temporarily so existing imports do not
 * break while App.tsx is cleaned up. It renders no UI, starts no timers or
 * audio, blocks no scrolling, and immediately releases the caller.
 */
export const AIJobs3DIntro: React.FC<AIJobs3DIntroProps> = ({ onComplete }) => {
  useEffect(() => {
    onComplete();
  }, [onComplete]);

  return null;
};

export default AIJobs3DIntro;
