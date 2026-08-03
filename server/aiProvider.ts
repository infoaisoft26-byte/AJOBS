import { GoogleGenAI } from "@google/genai";

// Telemetry Metrics Store (In-Memory for simplicity, or synchronized)
export const telemetryStore = {
  activeUsers: new Set<string>(), // Track unique active user IDs
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

// Interface representing an abstract AI Provider (decoupled layer)
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

// 1. Gemini Provider implementation
export class GeminiProvider implements AIProvider {
  name = "gemini";
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
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
      console.warn("[GeminiProvider] GEMINI_API_KEY environment variable is not defined.");
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
      throw new Error("Gemini Provider client is not initialized (missing API key)");
    }

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

    const primaryModel = model || "gemini-2.5-flash";
    const candidateList = [
      primaryModel,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest"
    ];
    const modelsToTry = Array.from(new Set(candidateList.filter(Boolean)));

    let lastError: any = null;
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelCandidate = modelsToTry[i];
      try {
        const response = await this.client.models.generateContent({
          model: modelCandidate,
          contents,
          config
        });

        if (!response.text) {
          throw new Error("Empty text response received from Gemini model");
        }

        let resultText = response.text;

        // Handle grounding metadata if googleSearch was enabled
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

        return resultText;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isQuotaOrDemand =
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE");

        if (isQuotaOrDemand && i < modelsToTry.length - 1) {
          console.warn(`[GeminiProvider] Model ${modelCandidate} hit quota/demand limit. Swapping to fallback candidate ${modelsToTry[i + 1]}...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("All Gemini model candidates failed.");
  }
}

// 2. OpenAI Provider placeholder implementation (allows seamless swap later)
export class OpenAIProvider implements AIProvider {
  name = "openai";

  async generateContent(
    prompt: string, 
    systemInstruction?: string,
    responseMimeType?: string,
    imageInlineData?: { mimeType: string; data: string },
    model?: string,
    enableSearch?: boolean
  ): Promise<string> {
    console.log("[OpenAIProvider] (Mock Integration Interface Called) Prompt:", prompt.slice(0, 50));
    throw new Error("OpenAI API Provider is currently a placeholder and not fully configured in this environment.");
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
      console.log(`[AIOrchestrator] Active provider switched to: ${name}`);
    } else {
      throw new Error(`Provider ${name} is not registered`);
    }
  }

  getActiveProviderName(): string {
    return this.activeProviderName;
  }

  /**
   * Generates content with robust exponential backoff retries, timeouts, and logging.
   */
  async generateContentWithRetry(
    prompt: string,
    systemInstruction?: string,
    responseMimeType?: string,
    maxRetries = 3,
    timeoutMs = 15000,
    imageInlineData?: { mimeType: string; data: string },
    model?: string,
    enableSearch?: boolean
  ): Promise<string> {
    telemetryStore.aiRequests++;
    const startTime = Date.now();
    const provider = this.providers.get(this.activeProviderName);

    if (!provider) {
      telemetryStore.failedAiRequests++;
      throw new Error(`No provider registered for ${this.activeProviderName}`);
    }

    let attempt = 0;
    let delay = 1000; // start with 1 second delay

    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`[AIOrchestrator] Call attempt ${attempt}/${maxRetries} to [${provider.name}] with model [${model || "default"}] and search [${!!enableSearch}]`);

        // Timeout race pattern
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI service request timed out")), timeoutMs)
        );

        const apiPromise = provider.generateContent(prompt, systemInstruction, responseMimeType, imageInlineData, model, enableSearch);
        const result = await Promise.race([apiPromise, timeoutPromise]);

        // Success: Track telemetry
        const duration = Date.now() - startTime;
        telemetryStore.performanceMetrics.totalDurationMs += duration;
        telemetryStore.performanceMetrics.requestCounts++;
        telemetryStore.performanceMetrics.averageLatencyMs = Math.round(
          telemetryStore.performanceMetrics.totalDurationMs / telemetryStore.performanceMetrics.requestCounts
        );

        console.log(`[AIOrchestrator] Successful response from [${provider.name}] in ${duration}ms`);
        return result;

      } catch (err: any) {
        const errMsg = String(err?.message || err);
        const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
        const summary = isQuota
          ? "Quota limit exceeded (429 / RESOURCE_EXHAUSTED)"
          : errMsg.slice(0, 150);

        console.error(`[AIOrchestrator] Attempt ${attempt}/${maxRetries} failed: ${summary}`);
        telemetryStore.errorsCount++;

        if (attempt >= maxRetries) {
          telemetryStore.failedAiRequests++;
          throw err; // Bubbles up to route handler to trigger graceful fallback logic
        }

        // Exponential backoff (longer backoff if quota exceeded)
        const backoffDelay = isQuota ? Math.max(delay, 2500) : delay;
        console.log(`[AIOrchestrator] Retrying in ${backoffDelay}ms...`);
        await new Promise((res) => setTimeout(res, backoffDelay));
        delay *= 2;
      }
    }

    throw new Error("AI Content generation failed on all retry attempts.");
  }
}

// Global Orchestrator instance
export const aiOrchestrator = new AIOrchestrator();
