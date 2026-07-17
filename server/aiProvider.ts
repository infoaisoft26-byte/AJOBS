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
    imageInlineData?: { mimeType: string; data: string }
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
    imageInlineData?: { mimeType: string; data: string }
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

    // Call using correct @google/genai guidelines
    const response = await this.client.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config
    });

    if (!response.text) {
      throw new Error("Empty text response received from Gemini model");
    }

    return response.text;
  }
}

// 2. OpenAI Provider placeholder implementation (allows seamless swap later)
export class OpenAIProvider implements AIProvider {
  name = "openai";

  async generateContent(
    prompt: string, 
    systemInstruction?: string,
    responseMimeType?: string,
    imageInlineData?: { mimeType: string; data: string }
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
    imageInlineData?: { mimeType: string; data: string }
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
        console.log(`[AIOrchestrator] Call attempt ${attempt}/${maxRetries} to [${provider.name}]`);

        // Timeout race pattern
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI service request timed out")), timeoutMs)
        );

        const apiPromise = provider.generateContent(prompt, systemInstruction, responseMimeType, imageInlineData);
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
        console.error(`[AIOrchestrator] Attempt ${attempt} failed: ${err.message || err}`);
        telemetryStore.errorsCount++;

        if (attempt >= maxRetries) {
          telemetryStore.failedAiRequests++;
          throw err; // Bubbles up to route handler to trigger graceful fallback logic
        }

        // Exponential backoff
        console.log(`[AIOrchestrator] Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // double the backoff delay
      }
    }

    throw new Error("AI Content generation failed on all retry attempts.");
  }
}

// Global Orchestrator instance
export const aiOrchestrator = new AIOrchestrator();
