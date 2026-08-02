import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Home, LogOut, RefreshCw } from "lucide-react";
import { auth } from "../firebase";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onLogout?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Uncaught error in ${this.props.componentName || "Component"}:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  private handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error("[ErrorBoundary] Signout failed:", e);
    }
    if (this.props.onLogout) {
      this.props.onLogout();
    } else {
      window.location.href = "/";
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const compName = this.props.componentName || "Admin Dashboard";

      return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
          {/* Ambient styling background */}
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="w-full max-w-lg bg-gray-900/80 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl relative z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mx-auto border border-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-center text-white">
              System Interface Interrupted
            </h1>
            <p className="text-gray-400 text-center text-xs">
              A runtime error occurred in <span className="text-amber-400 font-mono font-bold">{compName}</span>.
            </p>

            {this.state.error && (
              <div className="bg-black/80 border border-gray-800 rounded-xl p-4 font-mono text-xs text-red-400 max-h-48 overflow-auto break-words space-y-1">
                <div className="font-semibold text-gray-400">Component: {compName}</div>
                <div className="font-semibold text-red-300">Message: {this.state.error.message || String(this.state.error)}</div>
                {this.state.errorInfo?.componentStack && (
                  <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-800">
                    <span className="text-gray-400">Stack Trace:</span>
                    <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                id="btn-error-retry"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-amber-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Render
              </button>
              <button
                id="btn-error-logout"
                onClick={this.handleLogout}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-red-600/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
              <button
                id="btn-error-home"
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-bold text-xs transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
