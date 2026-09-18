import React, { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const CandidateMobileApp = lazy(() => import("./mobile/CandidateMobileApp"));
const isCandidateApp = import.meta.env.VITE_CANDIDATE_APP === "true";

const CANONICAL_ORIGIN = "https://aijobs1.in";
const LEGACY_HOSTS = new Set([
  "www.aijobs1.in",
  "aijobs1.vercel.app",
  "aijobs-14.vercel.app",
  "aijobs.vercel.app",
]);

if (typeof window !== "undefined" && LEGACY_HOSTS.has(window.location.hostname)) {
  const target = `${CANONICAL_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
  throw new Error("Redirecting to canonical AIJOBS domain.");
}

// Production candidate homepage should render immediately without the legacy cinematic intro.
if (typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "")) {
  sessionStorage.setItem("aijobs_intro_seen", "true");
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element was not found.");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    {isCandidateApp ? (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="text-sm text-gray-300">AIJOBS loading...</p>
            </div>
          </div>
        }
      >
        <CandidateMobileApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
