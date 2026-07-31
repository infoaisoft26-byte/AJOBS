import {
  AlertCircle,
  CheckCircle2,
  Code,
  File,
  FileCode,
  Key,
  Lock,
  Share,
  ShieldCheck,
  Upload,
  X
} from "lucide-react";
import { useState } from "react";


interface AadhaarOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (data: {
    maskedAadhaar: string;
    verifiedName: string;
    verificationStatus: string;
    publicId?: string;
  }) => void;
  userId: string;
}

export default function AadhaarOfflineModal({
  isOpen,
  onClose,
  onVerified,
  userId
}: AadhaarOfflineModalProps) {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [shareCode, setShareCode] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".zip") && !file.name.endsWith(".xml")) {
        setError("Invalid file format. Please upload UIDAI e-KYC ZIP or XML package.");
        return;
      }
      setZipFile(file);
      setError("");
    }
  };

  const handleProcessAadhaar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!consentAccepted) {
      setError("Voluntary consent is required under the Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016.");
      return;
    }

    if (!zipFile) {
      setError("Please select the downloaded Offline e-KYC ZIP/XML file.");
      return;
    }

    if (!shareCode || shareCode.length !== 4 || !/^\d{4}$/.test(shareCode)) {
      setError("Please enter your 4-digit UIDAI Passcode/Share Code.");
      return;
    }

    setLoading(true);

    try {
      // Create FormData to send file to backend API endpoint
      const formData = new FormData();
      formData.append("aadhaarZip", zipFile);
      formData.append("shareCode", shareCode);
      formData.append("userId", userId);

      const res = await fetch("/api/kyc/verify-aadhaar-offline", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Aadhaar e-KYC validation failed.");
      }

      setSuccessData(data.data);
      setTimeout(() => {
        onVerified({
          maskedAadhaar: data.data.maskedAadhaar,
          verifiedName: data.data.name,
          verificationStatus: "verified",
          publicId: data.data.publicId
        });
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to process Aadhaar e-KYC file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Paperless Offline e-KYC (UIDAI)</h3>
            <p className="text-xs text-gray-400">Zero raw Aadhaar storage. Secure local XML signature decryption.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successData ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs text-emerald-300">
            <div className="flex items-center space-x-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Aadhaar e-KYC Digital Verification Succeeded!</span>
            </div>
            <p>Name: <strong className="text-white">{successData.name}</strong></p>
            <p>Masked ID: <strong className="text-white">{successData.maskedAadhaar}</strong></p>
          </div>
        ) : (
          <form onSubmit={handleProcessAadhaar} className="space-y-4">
            {/* Voluntary Consent Checkbox */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-2 text-gray-300">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-900"
                />
                <span className="text-[11px] leading-relaxed">
                  I voluntarily consent to share my encrypted UIDAI Offline e-KYC XML package for identity verification on AIJobs. AIJobs will never store my full 12-digit Aadhaar number.
                </span>
              </label>
            </div>

            {/* ZIP Upload */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Upload UIDAI Offline e-KYC (.zip / .xml)
              </label>
              <div className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-xl p-4 text-center cursor-pointer transition-all bg-white/5">
                <input
                  type="file"
                  accept=".zip,.xml"
                  onChange={handleFileChange}
                  className="hidden"
                  id="aadhaar-zip-upload"
                />
                <label htmlFor="aadhaar-zip-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                  <FileCode className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">
                    {zipFile ? zipFile.name : "Choose downloaded .zip file from UIDAI MyAadhaar Portal"}
                  </span>
                  <span className="text-[10px] text-gray-400">Supported formats: .zip or .xml</span>
                </label>
              </div>
            </div>

            {/* Share Code */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                4-Digit Passcode / Share Code
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  maxLength={4}
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 1234"
                  required
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white font-mono tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? "Decrypting Digital Signature..." : "Validate & Decrypt e-KYC"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
