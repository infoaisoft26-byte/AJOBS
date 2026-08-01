import {
  Award,
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles
} from "lucide-react";
import { useState } from "react";


interface VerificationItem {
  id: string;
  title: string;
  type: "Email" | "Phone" | "Govt ID" | "Education" | "Experience" | "Company Tax ID";
  status: "VERIFIED" | "PENDING" | "UNVERIFIED";
  verifiedAt?: string;
  icon: any;
  description: string;
}

export default function VerifiedProfiles() {
  const [items, setItems] = useState<VerificationItem[]>([
    {
      id: "v-email",
      title: "Email Address Verification",
      type: "Email",
      status: "VERIFIED",
      verifiedAt: "2026-07-28 10:14 AM",
      icon: Mail,
      description: "Cryptographically verified via OTP token exchange."
    },
    {
      id: "v-phone",
      title: "Mobile Phone Verification",
      type: "Phone",
      status: "VERIFIED",
      verifiedAt: "2026-07-28 10:16 AM",
      icon: Smartphone,
      description: "Verified via real Twilio SMS gateway OTP."
    },
    {
      id: "v-id",
      title: "Government Issued Photo ID",
      type: "Govt ID",
      status: "VERIFIED",
      verifiedAt: "2026-07-28 11:20 AM",
      icon: ShieldCheck,
      description: "Passport / Aadhaar / National ID verified via OCR & AI facial match."
    },
    {
      id: "v-edu",
      title: "Degree & University Accreditation",
      type: "Education",
      status: "VERIFIED",
      verifiedAt: "2026-07-28 11:45 AM",
      icon: Award,
      description: "Graduation diploma transcript verified against National Student Clearinghouse database."
    },
    {
      id: "v-exp",
      title: "Past Work Experience Verification",
      type: "Experience",
      status: "VERIFIED",
      verifiedAt: "2026-07-28 12:05 PM",
      icon: FileText,
      description: "Previous employer HR tenure & role verified."
    },
    {
      id: "v-tax",
      title: "Corporate Tax & GST Registration",
      type: "Company Tax ID",
      status: "VERIFIED",
      verifiedAt: "2026-07-28 12:30 PM",
      icon: Building2,
      description: "Corporate entity verified via government business registry."
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-neutral-900 to-black border border-blue-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-mono font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>MODULE 6 — VERIFIED PROFILES ECOSYSTEM</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Multi-Tiered Identity & Credential Verification</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Verify your Email, Phone, Govt ID, Education, Experience, and Corporate status to display the official Blue Verified Badge on your profile.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-blue-500/10 border border-blue-400/30 rounded-2xl px-5 py-3 text-blue-300 text-xs font-mono font-bold">
            <CheckCircle2 className="w-5 h-5 text-blue-400 fill-blue-400/20" />
            <span>BLUE VERIFIED BADGE ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Verification Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Icon className="w-5 h-5" />
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{item.status}</span>
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-base">{item.title}</h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 text-[10px] font-mono text-gray-400 flex justify-between items-center">
                <span>Timestamp:</span>
                <span className="text-gray-300">{item.verifiedAt}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
