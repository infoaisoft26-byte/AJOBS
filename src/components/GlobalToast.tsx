import { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle, AlertTriangle, Info, X, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Tracking which toasts are in the process of dissolving
  const [dismissingToasts, setDismissingToasts] = useState<Record<string, boolean>>({});
  // Particle coordinates for each dissolving toast
  const [toastParticles, setToastParticles] = useState<Record<string, Array<{ id: number; x: number; y: number; size: number; delay: number }>>>({});

  const showToast = (message: string, type: ToastType = "info", duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    if (dismissingToasts[id]) return;

    // Generate 18 digital particles for a disintegration/dissolve effect
    const particles = Array.from({ length: 18 }).map((_, index) => ({
      id: index,
      x: (Math.random() - 0.5) * 300, // horizontal blast spread
      y: (Math.random() - 0.5) * 150 - 30, // vertical blast upward bias
      size: Math.random() * 5 + 3, // 3px to 8px particles
      delay: Math.random() * 0.15, // staggered launch
    }));

    setToastParticles((prev) => ({ ...prev, [id]: particles }));
    setDismissingToasts((prev) => ({ ...prev, [id]: true }));

    // Synchronized cleanup after the 600ms particle burst completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setDismissingToasts((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setToastParticles((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }, 600);
  };

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      {/* Toast Floating Hub */}
      <div 
        className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        aria-live="assertive"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const isDismissing = dismissingToasts[toast.id];
            const particles = toastParticles[toast.id] || [];

            const colorConfig = {
              success: {
                border: "border-emerald-500/30",
                bg: "bg-emerald-950/40",
                text: "text-emerald-300",
                glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
                particleColor: "bg-emerald-400"
              },
              error: {
                border: "border-rose-500/30",
                bg: "bg-rose-950/40",
                text: "text-rose-300",
                glow: "shadow-[0_0_20px_rgba(244,63,94,0.3)]",
                particleColor: "bg-rose-400"
              },
              warning: {
                border: "border-amber-500/30",
                bg: "bg-amber-950/40",
                text: "text-amber-300",
                glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
                particleColor: "bg-amber-400"
              },
              info: {
                border: "border-blue-500/30",
                bg: "bg-blue-950/40",
                text: "text-blue-300",
                glow: "shadow-[0_0_25px_rgba(59,130,246,0.35)]",
                particleColor: "bg-blue-400"
              }
            }[toast.type];

            const Icon = {
              success: CheckCircle,
              error: XCircle,
              warning: AlertTriangle,
              info: Info
            }[toast.type];

            return (
              <div key={toast.id} className="relative pointer-events-auto">
                {/* Particle Dissolve Burst Layer */}
                {isDismissing && (
                  <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
                    {particles.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{
                          x: p.x,
                          y: p.y,
                          opacity: 0,
                          scale: 0.2,
                          rotate: Math.random() * 360
                        }}
                        transition={{
                          duration: 0.55,
                          delay: p.delay,
                          ease: "easeOut"
                        }}
                        className={`absolute top-1/2 left-1/2 rounded-sm ${colorConfig.particleColor}`}
                        style={{
                          width: p.size,
                          height: p.size,
                          marginLeft: -p.size / 2,
                          marginTop: -p.size / 2,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Glass-Morphism Toast Card */}
                <motion.div
                  initial={{ opacity: 0, x: 80, scale: 0.9, y: 0 }}
                  animate={isDismissing 
                    ? { opacity: 0, scale: 0.7, filter: "blur(4px)", y: -15 }
                    : { opacity: 1, x: 0, scale: 1, y: 0 }
                  }
                  exit={{ opacity: 0, scale: 0.8, x: 50 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 320, 
                    damping: 24,
                    duration: 0.4
                  }}
                  className={`flex gap-3 p-4 rounded-2xl border backdrop-blur-2xl ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} ${colorConfig.glow} shadow-2xl overflow-hidden relative group`}
                >
                  {/* Subtle sweep overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                  
                  {/* Bevel highlight */}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 z-10" />
                  <p className="text-xs font-semibold flex-1 leading-relaxed z-10">{toast.message}</p>
                  
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 self-start shrink-0 cursor-pointer"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
