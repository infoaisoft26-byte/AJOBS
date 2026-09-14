import "./aiProvider.js";

declare module "./aiProvider.js" {
  interface AIProvider {
    generateContent(
      prompt: string,
      systemInstruction?: string,
      responseMimeType?: string,
      imageInlineData?: { mimeType: string; data: string },
      model?: string,
      enableSearch?: boolean,
      responseSchema?: any
    ): Promise<string>;
  }
}

export {};
