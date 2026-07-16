// Console and Window Error Override for Firebase/Firestore Idle Stream Warnings
if (typeof window !== "undefined") {
  // 1. Intercept console.error
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      const errorStr = args
        .map((arg) => {
          if (typeof arg === "string") return arg;
          if (arg instanceof Error) return arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(" ");

      if (
        errorStr.includes("Disconnecting idle stream") ||
        errorStr.includes("Timed out waiting for new targets") ||
        errorStr.includes("GrpcConnection RPC 'Listen' stream") ||
        (errorStr.includes("Firestore") && errorStr.includes("stream") && errorStr.includes("error")) ||
        (errorStr.includes("firebase") && errorStr.includes("idle stream")) ||
        errorStr.includes("CANCELLED: Disconnecting idle stream")
      ) {
        // Suppress these harmless development stream reconnection reports
        return;
      }
    } catch (e) {
      // fallback if mapping fails
    }
    originalConsoleError.apply(console, args);
  };

  // 2. Intercept console.warn
  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    try {
      const warnStr = args
        .map((arg) => {
          if (typeof arg === "string") return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(" ");

      if (
        warnStr.includes("Disconnecting idle stream") ||
        warnStr.includes("Timed out waiting for new targets") ||
        warnStr.includes("GrpcConnection RPC 'Listen' stream") ||
        warnStr.includes("CANCELLED: Disconnecting idle stream")
      ) {
        return;
      }
    } catch (e) {
      // fallback if mapping fails
    }
    originalConsoleWarn.apply(console, args);
  };

  // 3. Register global unhandledrejection event listener to ignore Firestore stream rejections
  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event.reason;
      const reasonStr = reason ? (reason.message || String(reason)) : "";
      if (
        reasonStr.includes("Disconnecting idle stream") ||
        reasonStr.includes("Timed out waiting for new targets") ||
        reasonStr.includes("GrpcConnection RPC 'Listen' stream") ||
        reasonStr.includes("CANCELLED: Disconnecting idle stream")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (e) {
      // ignore mapping error
    }
  });

  // 4. Register global error event listener to ignore Firestore stream errors
  window.addEventListener("error", (event) => {
    try {
      const errorStr = event.message || "";
      if (
        errorStr.includes("Disconnecting idle stream") ||
        errorStr.includes("Timed out waiting for new targets") ||
        errorStr.includes("GrpcConnection RPC 'Listen' stream") ||
        errorStr.includes("CANCELLED: Disconnecting idle stream")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (e) {
      // ignore mapping error
    }
  });
}

export {};
