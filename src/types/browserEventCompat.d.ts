import type React from "react";

declare global {
  interface Window {
    addEventListener(
      type: "keydown",
      listener: (event: React.KeyboardEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: "keydown",
      listener: (event: React.KeyboardEvent) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }
}

export {};
