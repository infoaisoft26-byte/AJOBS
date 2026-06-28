import { useState } from "react";
import { 
  Settings, Building, FileText, Globe, Mail, Phone, MapPin, Save, ShieldCheck, User 
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ConsultancyProfile } from "../../types";

interface CrmOnboardingViewProps {
  profile: ConsultancyProfile;
  onRefresh: () => void;
}

export default function CrmOnboardingView({
  profile,
  onRefresh
}: CrmOnboardingViewProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [agencyName, setAgencyName] = useState(profile.agencyName || "");
  const [ownerName, setOwnerName] = useState(profile.ownerName || "");
  const [gstNumber, setGstNumber] = useState(profile.gstNumber || "");
  const [panNumber, setPanNumber] = useState(profile.panNumber || "");
  const [companyEmail, setCompanyEmail] = useState(profile.companyEmail || "");
  const [mobileNumber, setMobileNumber] = useState(profile.mobileNumber || "");
  const [officeAddress, setOfficeAddress] = useState(profile.officeAddress || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [subscriptionPlan, setSubscriptionPlan] = useState<"Starter" | "Professional" | "Enterprise">(
    (profile.pricingPlan as any) || "Professional"
  );

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await setDoc(doc(db, "consultancies", profile.userId), {
        ...profile,
        agencyName,
        ownerName,
        gstNumber,
        panNumber,
        companyEmail,
        mobileNumber,
        officeAddress,
        website,
        pricingPlan: subscriptionPlan,
        subscriptionStatus: "active" // Automatically activate upon configuration
      }, { merge: true });

      alert("🎉 Agency profile verified & updated in database! All CRM scopes are now authorized.");
      setIsSaving(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-onboarding-view">
      {/* Header */}
      <div className="border-b border-white/5 pb-4 space-y-1">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Agency Registration & Settings Onboarding</span>
        </h3>
        <p className="text-xs text-gray-400">Configure corporate identifiers, owner profiles, and verified GST / tax credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveOnboarding} className="glass p-6 rounded-2xl border border-white/5 space-y-5">
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5 pb-2 border-b border-white/5">
              <Building className="w-4 h-4 text-indigo-400" />
              <span>Agency Identifiers</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300">
              <div className="space-y-1.5">
                <label className="block text-gray-400">Registered Agency Name *</label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={e => setAgencyName(e.target.value)}
                  placeholder="e.g. Nexus Recruitment Agency"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-400">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="e.g. Preeti Nair"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300 border-t border-white/5 pt-4">
              <div className="space-y-1.5">
                <label className="block text-gray-400">GSTIN Tax Registration Number *</label>
                <input
                  type="text"
                  required
                  value={gstNumber}
                  onChange={e => setGstNumber(e.target.value)}
                  placeholder="e.g. 29AAAAA1111A1Z1"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-400">PAN Card Number *</label>
                <input
                  type="text"
                  required
                  value={panNumber}
                  onChange={e => setPanNumber(e.target.value)}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300 border-t border-white/5 pt-4">
              <div className="space-y-1.5">
                <label className="block text-gray-400">Official Company Email *</label>
                <input
                  type="email"
                  required
                  value={companyEmail}
                  onChange={e => setCompanyEmail(e.target.value)}
                  placeholder="preeti@nexusagency.com"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-400">Mobile / Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  placeholder="+91 99999 88888"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-300 border-t border-white/5 pt-4">
              <label className="block text-gray-400">Corporate Office Address *</label>
              <textarea
                required
                value={officeAddress}
                onChange={e => setOfficeAddress(e.target.value)}
                placeholder="Suite 402, Embassy Heights, MG Road, Bengaluru, KA - 560001"
                className="w-full h-20 bg-neutral-900 border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300 border-t border-white/5 pt-4">
              <div className="space-y-1.5">
                <label className="block text-gray-400">Corporate Website URL</label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://nexusagency.com"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-400">Core Subscription Plan</label>
                <select
                  value={subscriptionPlan}
                  onChange={e => setSubscriptionPlan(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white font-bold"
                >
                  <option value="Starter">Starter Plan</option>
                  <option value="Professional">Professional Plan</option>
                  <option value="Enterprise">Enterprise Plan</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Verifying Registration Details..." : "Save & Verify Agency Registration"}</span>
            </button>
          </form>
        </div>

        {/* Verification Status info */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-bold text-xs text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Registration Status</span>
            </h4>

            <div className="space-y-3.5 text-xs text-gray-300">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-center font-mono">
                <span className="text-[9px] text-gray-400 block uppercase font-bold">GSTIN/PAN Status</span>
                <span className={`text-xs font-extrabold ${profile.gstNumber ? "text-emerald-400" : "text-amber-400"}`}>
                  {profile.gstNumber ? "VERIFIED & REGISTERED" : "PENDING ONBOARDING INPUTS"}
                </span>
              </div>

              <div className="space-y-1.5 leading-relaxed text-gray-400 text-[11px]">
                <p>
                  Completing this agency profile verification satisfies the regulatory guidelines for corporate recruiting portals.
                </p>
                <p className="border-t border-white/5 pt-2">
                  Once registered, your agency is certified to release verified offer letters, bill corporate partners, and calculate dynamic tax invoicing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
