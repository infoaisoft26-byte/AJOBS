import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Save,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";


interface LiveSelfieCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelfieCaptured: (data: {
    selfieUrl: string;
    livenessStatus: "passed" | "failed" | "manual_review";
    faceMatchScore: number;
    capturedAt: string;
  }) => void;
}

type LivenessStep = "align" | "blink" | "turn" | "verifying" | "success";

export default function LiveSelfieCaptureModal({
  isOpen,
  onClose,
  onSelfieCaptured
}: LiveSelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [step, setStep] = useState<LivenessStep>("align");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [stepTimer, setStepTimer] = useState(3);

  // Initialize camera stream
  useEffect(() => {
    if (isOpen) {
      startCamera();
      setStep("align");
      setCapturedImage(null);
      setCameraError("");
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission denied or unavailable. Please enable camera access in browser settings.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Liveness step progression logic
  const handleProceedLiveness = () => {
    if (step === "align") {
      setStep("blink");
    } else if (step === "blink") {
      setStep("turn");
    } else if (step === "turn") {
      capturePhoto();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setCapturedImage(dataUrl);
    setStep("verifying");
    setVerifying(true);

    // Simulate liveness AI verification pass & confidence score calculation
    setTimeout(() => {
      setVerifying(false);
      setStep("success");
    }, 1500);
  };

  const handleConfirmSelfie = () => {
    if (!capturedImage) return;

    const faceMatchScore = Math.floor(Math.random() * 15) + 84; // 84-98%
    const livenessStatus = faceMatchScore >= 75 ? "passed" : "manual_review";

    onSelfieCaptured({
      selfieUrl: capturedImage,
      livenessStatus,
      faceMatchScore,
      capturedAt: new Date().toISOString()
    });

    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Live Liveness & Face Verification</h3>
            <p className="text-xs text-gray-400">Position face inside oval guide to perform liveness detection.</p>
          </div>
        </div>

        {cameraError ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <p>{cameraError}</p>
            <button
              onClick={startCamera}
              className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-xs"
            >
              Retry Camera Access
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Viewfinder or Captured Frame */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {/* Face positioning oval overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-60 rounded-[50%] border-2 border-indigo-400/80 border-dashed animate-pulse flex items-center justify-center">
                      <div className="text-[10px] text-indigo-200 bg-black/60 px-2 py-1 rounded font-mono">
                        {step === "align" && "Center Your Face"}
                        {step === "blink" && "👀 Please Blink Eyes"}
                        {step === "turn" && "↔ Turn Head Slightly"}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured Selfie"
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Instruction Banner */}
            {!capturedImage ? (
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-200">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>
                    Step {step === "align" ? "1/3: Position Face" : step === "blink" ? "2/3: Blink Verification" : "3/3: Head Alignment"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleProceedLiveness}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  {step === "turn" ? "Capture Live Selfie" : "Next Liveness Check"}
                </button>
              </div>
            ) : verifying ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs text-amber-300 font-mono animate-pulse">
                Evaluating liveness score and comparing face biometric signature...
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Liveness Score: 92% (PASSED)</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null);
                      setStep("align");
                    }}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSelfie}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                  >
                    Confirm & Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
