import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in AIJobs application:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
          {/* Ambient styling background */}
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="w-full max-w-lg bg-gray-900/80 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl relative z-10 shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-6 mx-auto border border-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-center mb-2">
              System Interface Interrupted
            </h1>
            <p className="text-gray-400 text-center text-sm mb-6">
              AIJobs encountered a runtime error. This incident has been logged, and our engineering endpoints have been notified.
            </p>

            {this.state.error && (
              <div className="bg-black/60 border border-gray-800 rounded-lg p-4 font-mono text-xs text-red-400 mb-6 max-h-40 overflow-auto break-words">
                <span className="font-semibold text-gray-400">Error Diagnostics:</span>
                <br />
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                id="btn-error-reset"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-red-500/10"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Interface
              </button>
              <button
                id="btn-error-home"
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-medium text-sm transition-all duration-200 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Return to Safety
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
