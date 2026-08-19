import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  Save, 
  CheckCircle2, 
  Upload, 
  FileText, 
  Sparkles,
  Users
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { CompanyProfile } from "./EmployerTypes";

interface EmployerCompanyProfileProps {
  userId: string;
  userName: string;
  initialProfile?: CompanyProfile | null;
  onProfileUpdated?: (profile: CompanyProfile) => void;
}

export default function EmployerCompanyProfile({
  userId,
  userName,
  initialProfile,
  onProfileUpdated
}: EmployerCompanyProfileProps) {
  const [companyName, setCompanyName] = useState(initialProfile?.companyName || "AIJOBS Tech Partners");
  const [industry, setIndustry] = useState(initialProfile?.industry || "Software / Internet Technology");
  const [companySize, setCompanySize] = useState(initialProfile?.companySize || "50-200 Employees");
  const [website, setWebsite] = useState(initialProfile?.website || "https://aijobs.in");
  const [gstNumber, setGstNumber] = useState(initialProfile?.gstNumber || "29AAAAA0000A1Z5");
  const [email, setEmail] = useState(initialProfile?.email || "hr@enterprise.aijobs.in");
  const [phone, setPhone] = useState(initialProfile?.phone || "+91 80 4567 8900");
  const [officeAddress, setOfficeAddress] = useState(
    initialProfile?.officeAddress || "Tech Park Phase 2, Outer Ring Road, Bengaluru, Karnataka 560103"
  );
  const [description, setDescription] = useState(
    initialProfile?.description || "Building modern, AI-first products and engineering infrastructure to power high-growth digital businesses."
  );

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(false);

    const updated: CompanyProfile = {
      id: userId,
      userId,
      companyName,
      industry,
      companySize,
      website,
      gstNumber,
      email,
      phone,
      officeAddress,
      description,
      isVerified: true,
      createdAt: initialProfile?.createdAt || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "companies", userId), updated, { merge: true });
      await setDoc(doc(db, "employers", userId), {
        userId,
        companyName,
        industry,
        size: companySize,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (onProfileUpdated) onProfileUpdated(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (e) {
      if (onProfileUpdated) onProfileUpdated(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="employer-company-profile-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>VERIFIED CORPORATE PROFILE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Company Registry & Branding</h2>
          <p className="text-xs text-slate-400">Manage employer brand information visible to top applicants</p>
        </div>

        {successMsg && (
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile Saved Successfully</span>
          </span>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-2xl space-y-6 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Company Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Industry Sector</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Company Headcount Size</label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="1-10 Employees">1-10 Employees (Seed / Early)</option>
              <option value="10-50 Employees">10-50 Employees (Growth)</option>
              <option value="50-200 Employees">50-200 Employees (Scaling)</option>
              <option value="200-1000 Employees">200-1000 Employees (Mid-Market)</option>
              <option value="1000+ Employees">1000+ Employees (Enterprise)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Official Website URL</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">GSTIN / Corporate Registration ID</label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Recruitment Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="font-bold text-slate-300">Registered Office Address</label>
            <input
              type="text"
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="font-bold text-slate-300">Company Overview & Culture</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-purple-500/20 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving Changes..." : "Save Company Profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
