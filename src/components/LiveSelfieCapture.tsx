import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X
} from "lucide-react";

export type LiveSelfieCaptureResult = {
  blob: Blob;
  dataUrl: string;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  capturedAt: string;
};

type CaptureStatus =
  | "idle"
  | "requesting"
  | "camera"
  | "capturing"
  | "preview"
  | "saving"
  | "saved"
  | "error";

interface LiveSelfieCaptureProps {
  onCapture?: (
    result: LiveSelfieCaptureResult
  ) => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

const OUTPUT_SIZE = 640;
const JPEG_QUALITY = 0.82;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to prepare the captured selfie."));
    reader.readAsDataURL(blob);
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to capture the selfie. Please try again."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function getCameraErrorMessage(error: unknown): string {
  const name =
    typeof error === "object" && error && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission was denied. Allow camera access in your browser and try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is being used by another application. Close it and try again.";
  }
  if (name === "OverconstrainedError") {
    return "The requested front camera is unavailable. Please try another device.";
  }

  return error instanceof Error
    ? error.message
    : "Unable to open the camera. Please try again.";
}

export default function LiveSelfieCapture({
  onCapture,
  onCancel,
  disabled = false,
  className = ""
}: LiveSelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureLockRef = useRef(false);

  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [capturedSelfie, setCapturedSelfie] =
    useState<LiveSelfieCaptureResult | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (disabled) return;

    setErrorMessage("");
    setCountdown(null);
    setStatus("requesting");

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Live camera capture requires HTTPS and a supported browser."
        );
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        }
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Camera preview could not be initialized.");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("camera");
    } catch (error) {
      stopCamera();
      setErrorMessage(getCameraErrorMessage(error));
      setStatus("error");
    }
  }, [disabled, stopCamera]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      throw new Error("Camera is not ready. Please wait and try again.");
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const sourceSize = Math.min(sourceWidth, sourceHeight);
    const sourceX = Math.max(0, (sourceWidth - sourceSize) / 2);
    const sourceY = Math.max(0, (sourceHeight - sourceSize) / 2);

    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image capture is not supported by this browser.");
    }

    context.save();
    context.translate(OUTPUT_SIZE, 0);
    context.scale(-1, 1);
    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );
    context.restore();

    const blob = await canvasToJpegBlob(canvas);
    const dataUrl = await blobToDataUrl(blob);

    return {
      blob,
      dataUrl,
      mimeType: "image/jpeg" as const,
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      capturedAt: new Date().toISOString()
    };
  }, []);

  const beginCapture = useCallback(async () => {
    if (captureLockRef.current || status !== "camera" || disabled) return;

    captureLockRef.current = true;
    setErrorMessage("");

    try {
      for (let value = 3; value >= 1; value -= 1) {
        setCountdown(value);
        await new Promise((resolve) => window.setTimeout(resolve, 850));
      }

      setCountdown(null);
      setStatus("capturing");
      const result = await captureFrame();
      setCapturedSelfie(result);
      stopCamera();
      setStatus("preview");
    } catch (error) {
      setCountdown(null);
      setErrorMessage(getCameraErrorMessage(error));
      setStatus(streamRef.current ? "camera" : "error");
    } finally {
      captureLockRef.current = false;
    }
  }, [captureFrame, disabled, status, stopCamera]);

  const retakeSelfie = useCallback(async () => {
    setCapturedSelfie(null);
    setErrorMessage("");
    await startCamera();
  }, [startCamera]);

  const confirmSelfie = useCallback(async () => {
    if (!capturedSelfie || disabled) return;

    setErrorMessage("");
    setStatus("saving");

    try {
      await onCapture?.(capturedSelfie);
      setStatus("saved");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The selfie could not be saved. Please try again."
      );
      setStatus("preview");
    }
  }, [capturedSelfie, disabled, onCapture]);

  const closeCapture = useCallback(() => {
    stopCamera();
    setCountdown(null);
    onCancel?.();
  }, [onCancel, stopCamera]);

  const cameraVisible =
    status === "requesting" ||
    status === "camera" ||
    status === "capturing";

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 text-white shadow-2xl ${className}`}
      aria-label="Live selfie capture"
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Camera className="h-5 w-5 text-indigo-400" />
            Live Selfie Verification
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-400">
            Use your live camera. Gallery uploads are disabled.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={closeCapture}
            className="rounded-full border border-white/10 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close live selfie capture"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-5 p-5">
        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black">
          {cameraVisible && (
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="h-full w-full scale-x-[-1] object-cover"
              aria-label="Live front camera preview"
            />
          )}

          {capturedSelfie && !cameraVisible && (
            <img
              src={capturedSelfie.dataUrl}
              alt="Captured selfie preview"
              className="h-full w-full object-cover"
            />
          )}

          {!cameraVisible && !capturedSelfie && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              {status === "error" ? (
                <AlertCircle className="h-12 w-12 text-red-400" />
              ) : status === "saved" ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              ) : (
                <Camera className="h-12 w-12 text-indigo-400" />
              )}
              <p className="text-sm text-gray-300">
                {status === "saved"
                  ? "Your live selfie was captured successfully."
                  : "Position your face in the guide and capture a clear selfie."}
              </p>
            </div>
          )}

          {cameraVisible && (
            <>
              <div className="pointer-events-none absolute inset-[11%] rounded-[46%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
                Keep your face centered and look at the camera
              </div>
            </>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <span className="text-8xl font-black text-white drop-shadow-2xl">
                {countdown}
              </span>
            </div>
          )}

          {(status === "requesting" ||
            status === "capturing" ||
            status === "saving") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                {status === "requesting"
                  ? "Opening camera..."
                  : status === "capturing"
                    ? "Capturing..."
                    : "Saving..."}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {(status === "idle" || status === "error") && (
            <button
              type="button"
              onClick={startCamera}
              disabled={disabled}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              Open Live Camera
            </button>
          )}

          {status === "camera" && (
            <button
              type="button"
              onClick={beginCapture}
              disabled={disabled || countdown !== null}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              Capture Selfie
            </button>
          )}

          {status === "preview" && (
            <>
              <button
                type="button"
                onClick={retakeSelfie}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retake
              </button>
              <button
                type="button"
                onClick={confirmSelfie}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold transition hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Use This Selfie
              </button>
            </>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-[11px] leading-5 text-gray-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p>
            The camera stops automatically after capture. The selfie remains in
            memory until you confirm it. Add consent text before enabling
            permanent upload.
          </p>
        </div>
      </div>
    </section>
  );
}
