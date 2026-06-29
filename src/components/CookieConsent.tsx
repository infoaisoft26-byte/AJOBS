import { useState, useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("aijobs_cookie_consent");
    if (!consent) {
      // Delay display slightly for better user flow
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("aijobs_cookie_consent", "accepted");
    setVisible(false);
    // Initialize GA4 or performance cookies if accepted
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted"
      });
    }
  };

  const handleDecline = () => {
    localStorage.setItem("aijobs_cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div 
      className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md bg-gray-950/95 border border-blue-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-bottom-6 duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 border border-blue-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm text-white">Privacy Preferences</h4>
            <button 
              onClick={() => setVisible(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Dismiss preferences"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            We use localized and analytics endpoints to optimize your recruitment discovery workflows. By clicking accept, you consent to our telemetry best-practices.
          </p>
          <div className="flex gap-2 pt-1 justify-end">
            <button
              onClick={handleDecline}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors font-medium border border-gray-800 rounded-lg"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-md shadow-blue-600/10"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default CookieConsent;
