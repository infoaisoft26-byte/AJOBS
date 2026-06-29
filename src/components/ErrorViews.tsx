import { ArrowLeft, Home, Compass, Terminal } from "lucide-react";

interface ErrorViewProps {
  onBackToHome: () => void;
}

export function NotFoundView({ onBackToHome }: ErrorViewProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 max-w-md bg-gray-900/40 border border-gray-800/80 rounded-2xl p-8 backdrop-blur-md shadow-xl">
        <div className="text-blue-500 font-mono text-sm tracking-widest uppercase mb-2">Error 404</div>
        <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 mb-6 mx-auto flex items-center justify-center border border-blue-500/20">
          <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
          Destination Offline
        </h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          The quadrant or recruitment interface you requested does not exist or has been refactored under our active production pipelines.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            id="btn-404-home"
            onClick={onBackToHome}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            <Home className="w-4 h-4" />
            Home Base
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServerErrorView({ onBackToHome }: ErrorViewProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 max-w-md bg-gray-900/40 border border-gray-800/80 rounded-2xl p-8 backdrop-blur-md shadow-xl">
        <div className="text-red-500 font-mono text-sm tracking-widest uppercase mb-2">Error 500</div>
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 mb-6 mx-auto flex items-center justify-center border border-red-500/20">
          <Terminal className="w-8 h-8 animate-pulse" />
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
          Internal Grid Failure
        </h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Our distributed server components failed to synchronize correctly. This is usually transient under extreme AI generation loads.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            id="btn-500-home"
            onClick={onBackToHome}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-red-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back Home
          </button>
        </div>
      </div>
    </div>
  );
}
