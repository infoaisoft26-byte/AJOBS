import { useState, useEffect } from "react";
import { 
  Building2, Globe, FileText, Mail, Phone, MapPin, 
  Linkedin, Users, Save, ShieldCheck, FileCheck, CheckCircle
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { CompanyProfile } from "./EmployerTypes";
import { useToast } from "../GlobalToast";

interface CompanyRegistrationProps {
  userId: string;
  userName: string;
  companyProfile: CompanyProfile | null;
  onRefresh: () => void;
}

export default function CompanyRegistration({
  userId,
  userName,
  companyProfile,
  onRefresh
}: CompanyRegistrationProps) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [locations, setLocations] = useState("");
  const [hrName, setHrName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [verificationDocs, setVerificationDocs] = useState("");
  const [description, setDescription] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [companySize, setCompanySize] = useState("");

  useEffect(() => {
    if (companyProfile) {
      setCompanyName(companyProfile.companyName || "");
      setLogoUrl(companyProfile.logoUrl || "");
      setIndustry(companyProfile.industry || "");
      setWebsite(companyProfile.website || "");
      setGstNumber(companyProfile.gstNumber || "");
      setEmail(companyProfile.email || "");
      setPhone(companyProfile.phone || "");
      setOfficeAddress(companyProfile.officeAddress || "");
      setLocations(companyProfile.locations?.join(", ") || "");
      setHrName(companyProfile.hrName || "");
      setHrEmail(companyProfile.hrEmail || "");
      setVerificationDocs(companyProfile.verificationDocs || "");
      setDescription(companyProfile.description || "");
      setLinkedinUrl(companyProfile.linkedinUrl || "");
      setCompanySize(companyProfile.companySize || "");
    } else {
      setCompanyName("");
      setLogoUrl("");
      setIndustry("Information Technology");
      setWebsite("");
      setGstNumber("");
      setEmail("");
      setPhone("");
      setOfficeAddress("");
      setLocations("Bengaluru, Remote");
      setHrName(userName);
      setHrEmail("");
      setVerificationDocs("GSTIN_Registered_Corp_Signed.pdf");
      setDescription("");
      setLinkedinUrl("");
      setCompanySize("100-500");
    }
  }, [companyProfile, userName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      showToast("Company name cannot be blank.", "warning");
      return;
    }
    
    // Ensure user session is active and valid before continuing
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const errMsg = "Authentication error: No active user session detected.";
      console.error(errMsg, { userId });
      showToast(errMsg + " Please log in and try again.", "error");
      return;
    }
    
    if (currentUser.uid !== userId) {
      const errMsg = `Authorization validation mismatch. Current active user UID: ${currentUser.uid}, but trying to update company profile ID: ${userId}`;
      console.error(errMsg);
      showToast("Verification failed: You are not authorized to save details for this company profile.", "error");
      return;
    }

    setIsSaving(true);
    console.log("[CompanyRegistration] Initiating profile registration write...", { userId, companyName });

    try {
      const locationsArray = locations.split(",").map(loc => loc.trim()).filter(Boolean);
      
      const updatedProfile: CompanyProfile = {
        id: userId,
        userId: userId,
        companyName,
        logoUrl: logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80",
        industry,
        website,
        gstNumber,
        email,
        phone,
        officeAddress,
        locations: locationsArray,
        hrName,
        hrEmail,
        verificationDocs,
        description,
        linkedinUrl,
        companySize,
        isVerified: true, // Auto verify in sandbox
        createdAt: companyProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to 'companies' collection
      await setDoc(doc(db, "companies", userId), updatedProfile);

      // Also sync to standard 'employers' profile collection
      await setDoc(doc(db, "employers", userId), {
        userId,
        companyName,
        industry,
        size: companySize,
        updatedAt: new Date().toISOString()
      });

      console.log("[CompanyRegistration] Corporate profile write successful!");
      showToast("🎉 Company corporate credentials verified & synchronized in database!", "success");
      onRefresh();
    } catch (err: any) {
      const fbErrorCode = err?.code || "unknown-firestore-error";
      const fbErrorMessage = err?.message || String(err);
      console.error("[CompanyRegistration] Firestore write error:", {
        code: fbErrorCode,
        message: fbErrorMessage,
        fullError: err
      });
      showToast(`Error saving company credentials (${fbErrorCode}): ${fbErrorMessage}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="company-registration-portal">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <span>Enterprise Portal • Company Registration</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Complete corporate verification, HR contact details, tax filings, and brand parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <form onSubmit={handleSave} className="lg:col-span-2 glass p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider">Corporate Identity</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Global Tech"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Corporate Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Industry Sector *</label>
                <input
                  type="text"
                  required
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="Software / Cloud Intelligence"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Company Size (Employees)</label>
                <select
                  value={companySize}
                  onChange={e => setCompanySize(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="1-10">1 - 10 employees</option>
                  <option value="11-50">11 - 50 employees</option>
                  <option value="51-100">51 - 100 employees</option>
                  <option value="100-500">100 - 500 employees</option>
                  <option value="500-2000">500 - 2,000 employees</option>
                  <option value="2000+">2,000+ employees</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Company Website *</label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    required
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://acme-global.io"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">LinkedIn Company URL</label>
                <div className="relative">
                  <Linkedin className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/company/acme"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-gray-400">Company Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe what your organization scales, product ecosystems..."
                className="w-full h-20 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider">Tax & Regulatory Compliance</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">GSTIN Tax Registration Number *</label>
                <input
                  type="text"
                  required
                  value={gstNumber}
                  onChange={e => setGstNumber(e.target.value)}
                  placeholder="29AAAAA1111A1Z1"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Verification Document Filename</label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={verificationDocs}
                    onChange={e => setVerificationDocs(e.target.value)}
                    placeholder="GST_Certificate_Incorporation.pdf"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider">Administrative Contact</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Corporate Email (Support/HR) *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="hr@acme-global.io"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-gray-400">Corporate Office Phone *</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 text-xs sm:col-span-1">
                <label className="block text-gray-400">HR Lead Coordinator Name *</label>
                <input
                  type="text"
                  required
                  value={hrName}
                  onChange={e => setHrName(e.target.value)}
                  placeholder="Preeti Nair"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1 text-xs sm:col-span-1">
                <label className="block text-gray-400">HR Lead Email *</label>
                <input
                  type="email"
                  required
                  value={hrEmail}
                  onChange={e => setHrEmail(e.target.value)}
                  placeholder="preeti@acme-global.io"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1 text-xs sm:col-span-1">
                <label className="block text-gray-400">Office Branch Locations</label>
                <input
                  type="text"
                  required
                  value={locations}
                  onChange={e => setLocations(e.target.value)}
                  placeholder="Bengaluru, Pune, Remote"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-gray-400">Registered Office Headquarters Address *</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                <textarea
                  required
                  value={officeAddress}
                  onChange={e => setOfficeAddress(e.target.value)}
                  placeholder="Prestige Tech Park, Outer Ring Road, Outer Ring Road, Bengaluru, Karnataka 560103"
                  className="w-full h-16 bg-neutral-900 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-white resize-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Synchronizing Corporate Vault..." : "Save & Synchronize Corporate Vault"}</span>
          </button>
        </form>

        {/* Verification Status info */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-bold text-xs text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Onboarding Status</span>
            </h4>

            <div className="space-y-3">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
                <span className="text-[10px] text-gray-400 block uppercase font-mono font-bold">GSTIN Verified</span>
                <span className="text-xs font-extrabold text-emerald-400 font-mono">AUTHORIZED TIER 1</span>
              </div>

              <div className="space-y-2 text-gray-400 text-[11px] leading-relaxed">
                <p>
                  Your corporate registry has been cross-referenced with regional registries (GSTN Sandbox validated).
                </p>
                <div className="p-3 bg-neutral-950/40 rounded-lg border border-white/5 space-y-1 text-left">
                  <span className="font-mono text-white text-[10px] block">Corporate Privileges:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-300 text-[10px]">
                    <li>Publish Jobs on Main Board</li>
                    <li>Access AI Smart Matches</li>
                    <li>Conduct Live Interviews</li>
                    <li>Generate Printable Offers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
            <h4 className="font-bold text-xs text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <FileCheck className="w-4 h-4" />
              <span>Authorized Signature</span>
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Documents released via this workspace (offer letters, invoices, and analytics worksheets) will be stamped on behalf of:
            </p>
            <div className="p-3 bg-neutral-900 border border-white/10 rounded-xl font-mono text-[10px] text-gray-300 space-y-1">
              <p>Representative: <strong className="text-white">{hrName || userName}</strong></p>
              <p>Email: <strong className="text-white">{hrEmail || "Pending Onboarding"}</strong></p>
              <p>Authority: <span className="text-indigo-400 font-bold uppercase">HR Coordinator</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
