import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Application root element was not found.');
}

const root = createRoot(rootElement);

root.render(
  <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      <p className="text-sm text-gray-300">AIJOBS loading...</p>
    </div>
  </div>
);

const appModule = import.meta.env.VITE_CANDIDATE_APP === 'true'
  ? import('./mobile/CandidateMobileApp.tsx')
  : import('./App.tsx');

appModule
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AIJOBS] Application startup failed:', error);

    root.render(
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-gray-950 p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-red-400">AIJOBS could not start</h1>
          <p className="mt-3 text-sm text-gray-300">
            A startup service failed to load. Please refresh once. If the issue continues, share the diagnostic below.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-black/60 p-3 text-xs text-red-300">{message}</pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
          >
            Reload AIJOBS
          </button>
        </div>
      </div>
    );
  });
