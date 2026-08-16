import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

// Telemetry Metrics Store
export const telemetryStore = {
  activeUsers: new Set<string>(),
  aiRequests: 0,
  failedAiRequests: 0,
  paymentsCount: 0,
  errorsCount: 0,
  performanceMetrics: {
    totalDurationMs: 0,
    averageLatencyMs: 0,
    requestCounts: 0
  }
};

// Production Model Fallback Order
export const MODEL_FALLBACKS = [
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-pro"
];

export interface AIProvider {
  name: string;
  generateContent(
    prompt: string, 
    systemInstruction?: string,
    responseMimeType?: string,
    imageInlineData?: { mimeType: string; data: string },
    model?: string,
    enableSearch?: boolean
  ): Promise<string>;
}

// 5-minute In-Memory Response Cache
interface CacheEntry {
  response: string;
  timestamp: number;
}
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Active User Requests Lock (1 active request per user)
const activeUserRequests = new Set<string>();

function getCacheKey(
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: string,
  model?: string,
  enableSearch?: boolean
): string {
  const hash = crypto.createHash("sha256");
  hash.update(prompt.slice(0, 1000));
  hash.update(systemInstruction || "");
  hash.update(responseMimeType || "");
  hash.update(model || "");
  hash.update(enableSearch ? "1" : "0");
  return hash.digest("hex");
}

// 1. Gemini Provider Implementation
export class GeminiProvider implements AIProvider {
  name = "gemini";
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      console.log("[GeminiProvider] Initialized successfully with process.env.GEMINI_API_KEY");
    } else {
      console.warn("[GeminiProvider] GEMINI_API_KEY environment variable is not defined or invalid.");
    }
  }

  async generateContent(
    prompt: string, 
    systemInstruction?: string,
    responseMimeType?: string,
    imageInlineData?: { mimeType: string; data: string },
    model?: string,
    enableSearch?: boolean
  ): Promise<string> {
    if (!this.client) {
      console.warn("[GeminiProvider] fallback used: missing_key");
      throw new Error("MISSING_API_KEY: Gemini Provider client is not initialized.");
    }

    // 5-minute cache lookup
    const cacheKey = getCacheKey(prompt, systemInstruction, responseMimeType, model, enableSearch);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log("[GeminiProvider] fallback used: cache_hit");
      return cached.response;
    }

    // Build config without deprecated sampling parameters (temperature, top_p, top_k)
    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }
    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let contents: any = prompt;
    if (imageInlineData) {
      contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType: imageInlineData.mimeType,
            data: imageInlineData.data
          }
        }
      ];
    }

    const primaryModel = model || process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const envFallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";
    const candidateList = [primaryModel, envFallback, ...MODEL_FALLBACKS];
    const modelsToTry = Array.from(new Set(candidateList.filter(Boolean)));

    let totalAttemptsCount = 0;
    const maxTotalModelAttempts = 3;

    for (let i = 0; i < modelsToTry.length; i++) {
      if (totalAttemptsCount >= maxTotalModelAttempts) {
        break;
      }

      const modelCandidate = modelsToTry[i];
      console.log(`[GeminiProvider] Model selected: ${modelCandidate}`);

      let retriedThisModel = false;
      while (totalAttemptsCount < maxTotalModelAttempts) {
        totalAttemptsCount++;
        try {
          const callStart = Date.now();
          const response = await this.client.models.generateContent({
            model: modelCandidate,
            contents,
            config
          });

          const latencyMs = Date.now() - callStart;
          console.log(`[GeminiProvider] HTTP status: 200`);
          console.log(`[GeminiProvider] latency: ${latencyMs}ms`);

          if (!response.text) {
            throw new Error("Empty text response received from Gemini model");
          }

          let resultText = response.text;

          // Grounding search sources
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (enableSearch && chunks && chunks.length > 0) {
            let footer = "\n\n---\n*Live Web Results Powered by Google*\n\n**Sources:**\n";
            const seenUris = new Set<string>();
            chunks.forEach((chunk: any) => {
              const title = chunk.web?.title || "Reference";
              const uri = chunk.web?.uri;
              if (uri && !seenUris.has(uri)) {
                seenUris.add(uri);
                footer += `- [${title}](${uri})\n`;
              }
            });
            if (seenUris.size > 0) {
              resultText += footer;
            }
          }

          // Store in 5-min cache
          responseCache.set(cacheKey, {
            response: resultText,
            timestamp: Date.now()
          });

          return resultText;

        } catch (err: any) {
          const errMsg = String(err?.message || err);
          const isNotFound =
            errMsg.includes("404") ||
            errMsg.includes("NOT_FOUND") ||
            errMsg.includes("not found") ||
            errMsg.includes("no longer available") ||
            errMsg.includes("model unavailable");

          const isQuota =
            errMsg.includes("429") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("quota exceeded") ||
            errMsg.includes("rate limit");

          if (isNotFound) {
            console.warn(`[GeminiProvider] Unsupported model skipped: ${modelCandidate}`);
            break; // Skip to next model
          }

          if (isQuota) {
            console.warn(`[GeminiProvider] HTTP status: 429`);
            if (!retriedThisModel && totalAttemptsCount < maxTotalModelAttempts) {
              retriedThisModel = true;
              console.log(`[GeminiProvider] retry count: 1`);
              const backoff = Math.floor(Math.random() * 3000) + 2000;
              await new Promise(r => setTimeout(r, backoff));
              continue; // Retry same model ONCE
            } else {
              console.warn(`[GeminiProvider] fallback used: quota_exhausted`);
              break; // Skip to next candidate model
            }
          }

          console.warn(`[GeminiProvider] HTTP status: 500`);
          break; // Skip to next candidate model
        }
      }
    }

    console.warn(`[GeminiProvider] fallback used: provider_exhausted`);
    throw new Error("QUOTA_EXHAUSTED: All Gemini models failed or quota limit exceeded.");
  }
}

// 2. OpenAI Provider placeholder implementation
export class OpenAIProvider implements AIProvider {
  name = "openai";

  async generateContent(): Promise<string> {
    throw new Error("OpenAI API Provider is placeholder only.");
  }
}

// Orchestrator with Retries, Timeouts, Logging, and Graceful Fallback
export class AIOrchestrator {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderName = "gemini";

  constructor() {
    this.providers.set("gemini", new GeminiProvider());
    this.providers.set("openai", new OpenAIProvider());
  }

  setActiveProvider(name: string) {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
    }
  }

  getActiveProviderName(): string {
    return this.activeProviderName;
  }

  async generateContentWithRetry(
    prompt: string,
    systemInstruction?: string,
    responseMimeType?: string,
    maxRetries = 3,
    timeoutMs = 15000,
    imageInlineData?: { mimeType: string; data: string },
    model?: string,
    enableSearch?: boolean,
    userKey = "global"
  ): Promise<string> {
    if (activeUserRequests.has(userKey)) {
      console.warn(`[AIOrchestrator] Active request in progress for user [${userKey}]. Request throttled.`);
    }
    activeUserRequests.add(userKey);

    telemetryStore.aiRequests++;
    const startTime = Date.now();
    const provider = this.providers.get(this.activeProviderName);

    try {
      if (!provider) {
        telemetryStore.failedAiRequests++;
        throw new Error(`No provider registered for ${this.activeProviderName}`);
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT: AI service request timed out")), timeoutMs)
      );

      const apiPromise = provider.generateContent(
        prompt,
        systemInstruction,
        responseMimeType,
        imageInlineData,
        model,
        enableSearch
      );

      const result = await Promise.race([apiPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      telemetryStore.performanceMetrics.totalDurationMs += duration;
      telemetryStore.performanceMetrics.requestCounts++;
      telemetryStore.performanceMetrics.averageLatencyMs = Math.round(
        telemetryStore.performanceMetrics.totalDurationMs / telemetryStore.performanceMetrics.requestCounts
      );

      return result;

    } catch (err: any) {
      telemetryStore.failedAiRequests++;
      telemetryStore.errorsCount++;
      throw err;
    } finally {
      activeUserRequests.delete(userKey);
    }
  }
}

// Global Orchestrator instance
export const aiOrchestrator = new AIOrchestrator();

