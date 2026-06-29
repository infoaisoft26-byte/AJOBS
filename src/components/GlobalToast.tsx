import { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle, AlertTriangle, Info, X, XCircle } from "lucide-react";

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

  const showToast = (message: string, type: ToastType = "info", duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      {/* Toast Render Node */}
      <div 
        className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        aria-live="assertive"
      >
        {toasts.map((toast) => {
          const styles = {
            success: "bg-emerald-950/95 border-emerald-500/30 text-emerald-300",
            error: "bg-rose-950/95 border-rose-500/30 text-rose-300",
            warning: "bg-amber-950/95 border-amber-500/30 text-amber-300",
            info: "bg-blue-950/95 border-blue-500/30 text-blue-300"
          }[toast.type];

          const Icon = {
            success: CheckCircle,
            error: XCircle,
            warning: AlertTriangle,
            info: Info
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`flex gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200 ${styles}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
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
