import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, ShieldAlert, Key, Database, Eye, Settings, 
  User, Sliders, Play, RefreshCw, CheckCircle2, AlertCircle, Info, Sparkles, AlertTriangle
} from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { 
  evaluateAbacPolicy, 
  mapUserToAbacSubject, 
  ABAC_POLICIES, 
  SubjectAttributes, 
  ResourceAttributes 
} from "../services/abacService";

interface AbacInspectorProps {
  userId: string;
  userRole: "candidate" | "consultancy" | "employer" | "admin";
  onAttributeUpdated?: () => void;
}

export default function AbacControlInspector({ userId, userRole, onAttributeUpdated }: AbacInspectorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Firestore Document States
  const [userDoc, setUserDoc] = useState<any>(null);
  const [roleDoc, setRoleDoc] = useState<any>(null);
  
  // ABAC Subject attributes representing state
  const [subject, setSubject] = useState<SubjectAttributes | null>(null);

  // Simulation Tool State
  const [simResource, setSimResource] = useState<"job" | "candidate_profile" | "client_record" | "financial_report" | "system_log" | "api_endpoint">("job");
  const [simAction, setSimAction] = useState<"read" | "write" | "apply" | "execute" | "delete" | "export">("apply");
  const [simSalary, setSimSalary] = useState(2800000);
  const [simIsAiOnly, setSimIsAiOnly] = useState(true);
  const [simClientCount, setSimClientCount] = useState(5);
  const [simCandidateScore, setSimCandidateScore] = useState(92);
  const [simConfidentiality, setSimConfidentiality] = useState<"low" | "medium" | "high">("high");
  const [simEndpointPath, setSimEndpointPath] = useState("/api/admin-platform-insights");
  
  // Simulation Outcome
  const [simResult, setSimResult] = useState<any>(null);

  // Load User attributes from Firestore
  const loadAttributes = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      let uData = null;
      if (userSnap.exists()) {
        uData = userSnap.data();
        setUserDoc(uData);
      }

      let rCol = "candidates";
      if (userRole === "consultancy") rCol = "consultancies";
      if (userRole === "employer") rCol = "employers";
      if (userRole === "admin") rCol = "admins";

      const roleRef = doc(db, rCol, userId);
      const roleSnap = await getDoc(roleRef);
      let rData = null;
      if (roleSnap.exists()) {
        rData = roleSnap.data();
        setRoleDoc(rData);
      }

      if (uData || rData) {
        const subAttributes = mapUserToAbacSubject(userId, uData, rData);
        setSubject(subAttributes);
      }
    } catch (err) {
      console.error("Error loading ABAC attributes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttributes();
  }, [userId, userRole]);

  // Run simulation whenever subject or simulation params alter
  useEffect(() => {
    if (!subject) return;

    // Build resource mock attributes
    const resourceAttr: ResourceAttributes = {
      id: simResource === "api_endpoint" ? simEndpointPath : "res_target_id",
      type: simResource,
      salary: simSalary,
      isAiVerifiedOnly: simIsAiOnly,
      overallScore: simCandidateScore,
      isSuperstar: simCandidateScore >= 90,
      confidentialityLevel: simConfidentiality
    };

    const outcome = evaluateAbacPolicy(subject, resourceAttr, simAction);
    setSimResult(outcome);
  }, [
    subject, simResource, simAction, simSalary, simIsAiOnly, 
    simClientCount, simCandidateScore, simConfidentiality, simEndpointPath
  ]);

  // Save modified attributes to Firestore
  const saveAttributes = async (updatedFields: Partial<SubjectAttributes>) => {
    if (!subject) return;
    setSaving(true);
    setMessage(null);
    try {
      let rCol = "candidates";
      if (userRole === "consultancy") rCol = "consultancies";
      if (userRole === "employer") rCol = "employers";
      if (userRole === "admin") rCol = "admins";

      const roleRef = doc(db, rCol, userId);
      const userRef = doc(db, "users", userId);

      // Prepare updates
      const updatedSubject = { ...subject, ...updatedFields };

      // Dispatch specific fields back to appropriate collections
      if (userRole === "candidate") {
        await updateDoc(roleRef, {
          skills: updatedSubject.skills || [],
          aiInterviewScore: updatedSubject.aiInterviewScore || 0,
          resumeScore: updatedSubject.resumeScore || 0,
          experience: `${updatedSubject.experienceYears || 0}+ Years Web Developer`
        });
        await updateDoc(userRef, {
          subscription: updatedSubject.subscription || "Free Tier"
        });
      } else if (userRole === "consultancy") {
        await updateDoc(roleRef, {
          pricingPlan: updatedSubject.pricingPlan || "Free",
          clientsCount: updatedSubject.clientsCount || 0,
          revenue: updatedSubject.revenue || 0
        });
      } else if (userRole === "employer") {
        await updateDoc(roleRef, {
          size: updatedSubject.size || "1-10",
          industry: updatedSubject.industry || "Technology"
        });
      } else if (userRole === "admin") {
        await updateDoc(roleRef, {
          level: updatedSubject.adminLevel || "Standard Admin",
          status: updatedSubject.adminStatus || "active"
        });
      }

      setSubject(updatedSubject);
      setMessage({ text: "ABAC user attributes updated in Firestore successfully!", type: "success" });
      if (onAttributeUpdated) onAttributeUpdated();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: `Failed to update Firestore attributes: ${err.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        <span className="ml-3 font-mono text-xs text-gray-400">Loading ABAC Engine...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-purple-950/20 border border-purple-500/20 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="font-display font-black text-sm text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Real-Time ABAC Guard Active</span>
            </h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
            This workspace enforces **Attribute-Based Access Control (ABAC)**. Your dashboard views, accessible records, and backend API capabilities are dynamically validated against attributes defined in your Firestore profile.
          </p>
        </div>
        <button
          onClick={loadAttributes}
          className="px-3.5 py-1.5 self-start md:self-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Firestore</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Subject Profile & Attribute Editor (6 cols) */}
        <div className="lg:col-span-7 space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-white/5">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Subject Attributes (Firestore Editor)</h4>
          </div>

          {subject && (
            <div className="space-y-4">
              
              {/* Common Metadata */}
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-gray-400 bg-black/35 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="block text-gray-500 text-[9px]">SUBJECT IDENTIFIER</span>
                  <span className="text-purple-300 font-bold truncate block">{subject.userId}</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-[9px]">ASSIGNED IDENTITY ROLE</span>
                  <span className="text-emerald-400 font-bold uppercase block">{subject.role}</span>
                </div>
              </div>

              {/* CANDIDATE SPECIFIC CONTROLS */}
              {userRole === "candidate" && (
                <div className="space-y-4 pt-2">
                  {/* Subscription Tier */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Subscription Plan Tier</label>
                    <select
                      value={subject.subscription || "Free Tier"}
                      onChange={(e) => saveAttributes({ subscription: e.target.value })}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                    >
                      <option value="Free Tier">Free Tier (No high-salary access)</option>
                      <option value="Starter Suite">Starter Suite (Access to high-salary)</option>
                      <option value="Pro Agency">Pro Agency (Premium tier)</option>
                      <option value="Enterprise Access">Enterprise Access (Unlimited tier)</option>
                    </select>
                  </div>

                  {/* Slider: AI Interview Score */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-semibold">AI Interview Performance Score</span>
                      <span className={`font-mono font-bold ${subject.aiInterviewScore && subject.aiInterviewScore >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                        {subject.aiInterviewScore || 0}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={subject.aiInterviewScore || 0}
                      onChange={(e) => setSubject(prev => prev ? { ...prev, aiInterviewScore: parseInt(e.target.value, 10) } : null)}
                      onMouseUp={() => saveAttributes({ aiInterviewScore: subject.aiInterviewScore })}
                      onTouchEnd={() => saveAttributes({ aiInterviewScore: subject.aiInterviewScore })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <p className="text-[9px] text-gray-500">Scores below 80% lock premium 'AI Verified Only' jobs.</p>
                  </div>

                  {/* Slider: Resume ATS Match Score */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-semibold">ATS Resume Match Score</span>
                      <span className={`font-mono font-bold ${subject.resumeScore && subject.resumeScore >= 85 ? "text-emerald-400" : "text-amber-400"}`}>
                        {subject.resumeScore || 0}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={subject.resumeScore || 0}
                      onChange={(e) => setSubject(prev => prev ? { ...prev, resumeScore: parseInt(e.target.value, 10) } : null)}
                      onMouseUp={() => saveAttributes({ resumeScore: subject.resumeScore })}
                      onTouchEnd={() => saveAttributes({ resumeScore: subject.resumeScore })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <p className="text-[9px] text-gray-500">ATS scores over 85% bypass salary limits even on standard tier accounts.</p>
                  </div>

                  {/* Slider: Experience */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-semibold">Years of Technical Experience</span>
                      <span className="font-mono font-bold text-purple-400">{subject.experienceYears || 0} Years</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={subject.experienceYears || 0}
                      onChange={(e) => setSubject(prev => prev ? { ...prev, experienceYears: parseInt(e.target.value, 10) } : null)}
                      onMouseUp={() => saveAttributes({ experienceYears: subject.experienceYears })}
                      onTouchEnd={() => saveAttributes({ experienceYears: subject.experienceYears })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* CONSULTANCY SPECIFIC CONTROLS */}
              {userRole === "consultancy" && (
                <div className="space-y-4 pt-2">
                  {/* Agency Pricing Plan */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Agency Pricing Plan</label>
                    <select
                      value={subject.pricingPlan || "Free"}
                      onChange={(e) => saveAttributes({ pricingPlan: e.target.value as any })}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                    >
                      <option value="Free">Free Tier (3 Clients Limit)</option>
                      <option value="Starter">Starter Suite (10 Clients Limit)</option>
                      <option value="Professional">Professional Plan (Unlimited Clients)</option>
                      <option value="Enterprise">Enterprise License (Unlimited Clients + Export)</option>
                    </select>
                  </div>

                  {/* Clients Count */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-semibold">Active Clients In Portfolio</span>
                      <span className="font-mono font-bold text-emerald-400">{subject.clientsCount || 0} Clients</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={subject.clientsCount || 0}
                      onChange={(e) => setSubject(prev => prev ? { ...prev, clientsCount: parseInt(e.target.value, 10) } : null)}
                      onMouseUp={() => saveAttributes({ clientsCount: subject.clientsCount })}
                      onTouchEnd={() => saveAttributes({ clientsCount: subject.clientsCount })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <p className="text-[9px] text-gray-500">Exceeding plan limits triggers a dashboard lock warning on client creation.</p>
                  </div>
                </div>
              )}

              {/* EMPLOYER SPECIFIC CONTROLS */}
              {userRole === "employer" && (
                <div className="space-y-4 pt-2">
                  {/* Company Size */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Organization Size (Employees)</label>
                    <select
                      value={subject.size || "1-10"}
                      onChange={(e) => saveAttributes({ size: e.target.value })}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                    >
                      <option value="1-10">Micro (1-10 employees)</option>
                      <option value="11-50">Small (11-50 employees)</option>
                      <option value="51-200">Medium (51-200 employees)</option>
                      <option value="201-500">Large (201-500 employees)</option>
                      <option value="1000+">Enterprise (1000+ employees)</option>
                    </select>
                    <p className="text-[9px] text-gray-500 mt-1">Sizes below 50 employees lock immediate access to superstar candidates (Score &gt;= 90%).</p>
                  </div>
                </div>
              )}

              {/* ADMIN SPECIFIC CONTROLS */}
              {userRole === "admin" && (
                <div className="space-y-4 pt-2">
                  {/* Admin Level */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Admin Clearance Level</label>
                    <select
                      value={subject.adminLevel || "Standard Admin"}
                      onChange={(e) => saveAttributes({ adminLevel: e.target.value as any })}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                    >
                      <option value="Auditor">Auditor (Read-Only Logs, no log deletions)</option>
                      <option value="Standard Admin">Standard Admin (CMS/Job updates, no revenue logs)</option>
                      <option value="Super Admin">Super Admin (Full clearance / Revenue metrics)</option>
                    </select>
                  </div>

                  {/* Admin Status */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Clearance Status</label>
                    <select
                      value={subject.adminStatus || "active"}
                      onChange={(e) => saveAttributes({ adminStatus: e.target.value as any })}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                    >
                      <option value="active">Active (Access allowed)</option>
                      <option value="inactive">Inactive (Access completely revoked)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Status Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-xl border text-[11px] flex items-center space-x-2 ${
                      message.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                  >
                    {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{message.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Real-Time ABAC Simulator & Policy Log (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Active Policies List */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-white/5">
              <Database className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Active Policy Rules</h4>
            </div>
            
            <div className="space-y-3 text-[11px] text-gray-400 max-h-48 overflow-y-auto pr-1">
              {Object.entries(ABAC_POLICIES).map(([key, value]) => (
                <div key={key} className="p-2.5 bg-black/20 rounded-xl border border-white/5 space-y-1">
                  <span className="font-mono text-[9px] text-emerald-400 font-bold block">{key}</span>
                  <p className="leading-relaxed text-gray-300">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive ABAC Request Simulator */}
          <div className="bg-gradient-to-br from-[#0c0816]/40 to-black/60 border border-purple-500/15 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-white/5">
              <Play className="w-4 h-4 text-purple-400 fill-purple-400" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">ABAC Request Simulator</h4>
            </div>

            <div className="space-y-3">
              {/* Select Resource Type */}
              <div>
                <label className="block text-[10px] text-gray-500 font-mono mb-1">RESOURCE TYPE</label>
                <select
                  value={simResource}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    setSimResource(r);
                    if (r === "job") setSimAction("apply");
                    else if (r === "client_record") setSimAction("read");
                    else if (r === "financial_report") setSimAction("read");
                    else if (r === "api_endpoint") setSimAction("execute");
                    else setSimAction("read");
                  }}
                  className="w-full bg-black/45 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="job">Job Posting</option>
                  <option value="client_record">CRM Client Record</option>
                  <option value="candidate_profile">Candidate Profile</option>
                  <option value="financial_report">Financial Revenue Index</option>
                  <option value="system_log">System Audit Logs</option>
                  <option value="api_endpoint">Backend API Endpoint</option>
                </select>
              </div>

              {/* Dynamic Parameter Sliders depending on Selected Resource */}
              {simResource === "job" && (
                <div className="space-y-3 p-3 bg-black/30 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-gray-500 font-mono">ANNUAL SALARY (₹)</label>
                    <div className="flex items-center justify-between">
                      <input
                        type="range"
                        min="500000"
                        max="4000000"
                        step="100000"
                        value={simSalary}
                        onChange={(e) => setSimSalary(parseInt(e.target.value, 10))}
                        className="w-2/3 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-mono text-xs text-purple-300 font-bold">₹{(simSalary/100000).toFixed(1)} Lakhs</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-semibold">Requires 'AI Verified' Tag?</span>
                    <button
                      type="button"
                      onClick={() => setSimIsAiOnly(!simIsAiOnly)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        simIsAiOnly 
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300" 
                          : "bg-white/5 border-white/10 text-gray-400"
                      }`}
                    >
                      {simIsAiOnly ? "YES" : "NO"}
                    </button>
                  </div>
                </div>
              )}

              {simResource === "candidate_profile" && (
                <div className="space-y-1.5 p-3 bg-black/30 rounded-xl border border-white/5">
                  <label className="block text-[9px] text-gray-500 font-mono">CANDIDATE AI INTERVIEW SCORE</label>
                  <div className="flex items-center justify-between">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={simCandidateScore}
                      onChange={(e) => setSimCandidateScore(parseInt(e.target.value, 10))}
                      className="w-2/3 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="font-mono text-xs text-purple-300 font-bold">{simCandidateScore}%</span>
                  </div>
                </div>
              )}

              {simResource === "api_endpoint" && (
                <div className="space-y-1.5 p-3 bg-black/30 rounded-xl border border-white/5">
                  <label className="block text-[9px] text-gray-500 font-mono">TARGET ROUTE PATH</label>
                  <select
                    value={simEndpointPath}
                    onChange={(e) => setSimEndpointPath(e.target.value)}
                    className="w-full bg-black/45 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="/api/admin-platform-insights">/api/admin-platform-insights</option>
                    <option value="/api/consultancy-natural-search">/api/consultancy-natural-search</option>
                    <option value="/api/analyze-resume">/api/analyze-resume</option>
                  </select>
                </div>
              )}

              {/* ACTION TYPE */}
              <div>
                <label className="block text-[10px] text-gray-500 font-mono mb-1">OPERATION ACTION</label>
                <div className="grid grid-cols-3 gap-2">
                  {["read", "apply", "execute", "delete", "export", "write"].map((act) => {
                    const isAvailable = (simResource === "job" && ["read", "apply"].includes(act)) ||
                                        (simResource === "client_record" && ["read", "write"].includes(act)) ||
                                        (simResource === "api_endpoint" && act === "execute") ||
                                        (simResource === "financial_report" && act === "read") ||
                                        (simResource === "system_log" && ["read", "delete"].includes(act)) ||
                                        (simResource === "candidate_profile" && ["read", "apply", "delete", "export"].includes(act));
                    
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => isAvailable && setSimAction(act as any)}
                        disabled={!isAvailable}
                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold font-mono uppercase transition-all ${
                          !isAvailable 
                            ? "bg-transparent border-white/5 text-gray-600 cursor-not-allowed"
                            : simAction === act
                              ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                              : "bg-black/45 border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
                        }`}
                      >
                        {act}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SIMULATION RESULT SCREEN */}
              {simResult && (
                <div className={`p-4 rounded-xl border mt-3 transition-all ${
                  simResult.granted 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" 
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                }`}>
                  <div className="flex items-center space-x-2 mb-1.5">
                    {simResult.granted ? (
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4.5 h-4.5 text-red-400 shrink-0" />
                    )}
                    <span className="font-mono text-xs font-extrabold uppercase">
                      {simResult.granted ? "Access Granted" : "Access Blocked (ABAC)"}
                    </span>
                  </div>
                  
                  <p className="text-[11px] leading-relaxed text-gray-300">
                    {simResult.reason}
                  </p>

                  {simResult.requiredUpgrade && (
                    <div className="mt-3 pt-2 border-t border-red-500/15 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400 font-mono flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                        <span>Upgrade Path Triggered:</span>
                      </span>
                      <span className="font-bold bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 border border-amber-500/25">
                        {simResult.requiredUpgrade}
                      </span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
