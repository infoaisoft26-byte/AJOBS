import { useEffect, useRef, useCallback } from "react";

interface UseIntersectionObserverProps {
  onIntersect: () => void;
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Custom React hook that implements IntersectionObserver to trigger a callback
 * when a target element becomes visible in the viewport. Ideal for infinite scroll.
 */
export function useIntersectionObserver({
  onIntersect,
  enabled = true,
  threshold = 0.1,
  rootMargin = "100px",
}: UseIntersectionObserverProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const setTargetRef = useCallback(
    (node: HTMLElement | null) => {
      // If we already have an observer, disconnect it
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      targetRef.current = node;

      if (!node || !enabled) return;

      try {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                onIntersect();
              }
            });
          },
          { threshold, rootMargin }
        );

        observer.observe(node);
        observerRef.current = observer;
      } catch (err) {
        console.warn("[IntersectionObserver] Hook failed to initialize:", err);
      }
    },
    [onIntersect, enabled, threshold, rootMargin]
  );

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return setTargetRef;
}
