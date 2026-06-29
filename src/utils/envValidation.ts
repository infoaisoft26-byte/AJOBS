/**
 * Production Environment Variable Validation
 * Validates critical environment variables required for the production readiness of AIJobs.
 */

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate GEMINI_API_KEY (Server side check or client warning if missing in dev)
  const isServer = typeof process !== 'undefined' && process.env;
  
  if (isServer) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      errors.push("GEMINI_API_KEY is missing! Real-time AI processing requires this key.");
    } else if (geminiKey === "MY_GEMINI_API_KEY") {
      warnings.push("GEMINI_API_KEY is set to default placeholder value. Please update to a real Google AI Studio key.");
    }

    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      warnings.push("APP_URL is not set. SEO canonical tags and absolute routes will default to window.location.origin.");
    }
  } else {
    // Client side check
    // Public keys/config if needed in the future
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
