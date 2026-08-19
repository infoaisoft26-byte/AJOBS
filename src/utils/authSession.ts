/**
 * Centralized session and local state sanitization utility
 * Ensures no remnants of previous user data, dashboards, role identifiers,
 * or temporary caches persist across logout/login cycles.
 */

export function clearUserSessionState(): void {
  try {
    // 1. Session Storage Clearing
    if (typeof window !== "undefined" && window.sessionStorage) {
      const keysToClear = [
        "aijobs_search_query",
        "aijobs_search_exp",
        "aijobs_search_loc",
        "aijobs_auth_role",
        "aijobs_temp_email",
        "aijobs_temp_otp_token",
        "aijobs_candidate_draft",
        "aijobs_recruiter_cache",
        "aijobs_admin_session",
        "aijobs_lead_attribution",
        "aijobs_resend_cooldown",
        "aijobs_intro_seen"
      ];
      
      keysToClear.forEach(k => {
        try {
          window.sessionStorage.removeItem(k);
        } catch (e) {}
      });
    }

    // 2. Local Storage User Cache Sanitization
    if (typeof window !== "undefined" && window.localStorage) {
      const localStorageKeys = [
        "aijobs_user_profile",
        "aijobs_user_role",
        "aijobs_auth_token",
        "aijobs_candidate_bookmarks",
        "aijobs_cached_dashboard_stats",
        "aijobs_admin_filters",
        "aijobs_recruiter_filter_state",
        "aijobs_saved_jobs",
        "aijobs_recent_searches",
        "firebase:authUser"
      ];

      localStorageKeys.forEach(k => {
        try {
          window.localStorage.removeItem(k);
        } catch (e) {}
      });

      // Clear any keys matching aijobs_
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith("aijobs_") || key.startsWith("cache_") || key.includes("dashboard"))) {
          window.localStorage.removeItem(key);
        }
      }
    }

    // 3. Dispatch global reset event to notify any mounted listeners
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("aijobs-session-cleared"));
    }
  } catch (err) {
    console.warn("[AuthSession] Error clearing session state:", err);
  }
}
