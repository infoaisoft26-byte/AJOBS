import React, { ChangeEvent, FormEvent, HTMLInputElement, useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Award, Briefcase, CheckCircle2, Download, Edit, Edit3, ExternalLink, FileText, Key, LogOut, MapPin, Phone, RefreshCw, Replace, Save, Sparkles, Target, Upload, Verified, View, X } from "lucide-react";
import { db } from "../firebase";


import { useToast } from "./GlobalToast";
import { formatPhoneNumber } from "../utils/phoneUtils";
import CandidateResumeUploader from "./CandidateResumeUploader";

interface CandidatePreLaunchProfileProps {
  user: UserProfile;
  onLogout: () => void;
}

interface CandidateDocData {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  targetRole?: string;
  location?: string;
  experience?: string;
  skills?: string[];
  resumeUrl?: string;
  resumeFileName?: string;
  updatedAt?: string;
}

export default function CandidatePreLaunchProfile({
  user,
  onLogout
}: CandidatePreLaunchProfileProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [candidateData, setCandidateData] = useState<CandidateDocData>({});
  
  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || "");
  const [editTargetRole, setEditTargetRole] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editSkillsStr, setEditSkillsStr] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Resume Upload State
  const [uploadingResume, setUploadingResume] = useState(false);

  const candidateBadgeId = `CAN-${user.uid.slice(0, 8).toUpperCase()}`;

  const fetchCandidateDoc = async () => {
    setLoading(true);
    try {
      const candidateRef = doc(db, "candidates", user.uid);
      const snap = await getDoc(candidateRef);
      if (snap.exists()) {
        const data = snap.data() as CandidateDocData;
        setCandidateData(data);
        setEditName(data.name || user.name);
        setEditPhone(data.phone || user.phone || "");
        setEditTargetRole(data.targetRole || "Software Engineer");
        setEditLocation(data.location || "Remote / India");
        setEditExperience(data.experience || "1-3 Years");
        setEditSkillsStr(Array.isArray(data.skills) ? data.skills.join(", ") : "");
      } else {
        // Initialize if not present
        const initialData: CandidateDocData = {
          userId: user.uid,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          targetRole: "Software Engineer",
          location: "Remote / India",
          experience: "1-3 Years",
          skills: ["React", "TypeScript", "Node.js"],
          resumeUrl: user.resumeURL || "",
          resumeFileName: user.resumeURL ? "Uploaded_Resume.pdf" : "",
          updatedAt: new Date().toISOString()
        };
        await setDoc(candidateRef, initialData, { merge: true });
        setCandidateData(initialData);
        setEditName(user.name);
        setEditPhone(user.phone || "");
        setEditTargetRole("Software Engineer");
        setEditLocation("Remote / India");
        setEditExperience("1-3 Years");
        setEditSkillsStr("React, TypeScript, Node.js");
      }
    } catch (err) {
      console.error("[PreLaunch Profile Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchCandidateDoc();
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const skillsArray = editSkillsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const formattedPhone = formatPhoneNumber(editPhone.trim());
      const updatedFields = {
        name: editName.trim(),
        phone: formattedPhone,
        targetRole: editTargetRole.trim(),
        location: editLocation.trim(),
        experience: editExperience.trim(),
        skills: skillsArray,
        updatedAt: new Date().toISOString()
      };

      // 1. Update candidate record
      await updateDoc(doc(db, "candidates", user.uid), updatedFields);

      // 2. Update user profile record (without modifying security attributes: role, isBetaTester, internalAccess)
      await updateDoc(doc(db, "users", user.uid), {
        name: editName.trim(),
        phone: formattedPhone,
        updatedAt: new Date().toISOString()
      });

      setCandidateData((prev) => ({ ...prev, ...updatedFields }));
      setIsEditing(false);
      showToast("Candidate profile updated successfully!", "success");
    } catch (err) {
      console.error("[Save Profile Error]:", err);
      showToast("Failed to save candidate profile changes.", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Resume file size must be under 10MB.", "warning");
      return;
    }

    setUploadingResume(true);
    try {
      // Upload to Cloudinary
      const uploadedUrl = await uploadToCloudinary(file, "raw");
      
      const resumeFileName = file.name;

      // Update candidate doc
      await updateDoc(doc(db, "candidates", user.uid), {
        resumeUrl: uploadedUrl,
        resumeFileName,
        updatedAt: new Date().toISOString()
      });

      // Update user doc
      await updateDoc(doc(db, "users", user.uid), {
        resumeURL: uploadedUrl,
        updatedAt: new Date().toISOString()
      });

      setCandidateData((prev) => ({
        ...prev,
        resumeUrl: uploadedUrl,
        resumeFileName
      }));

      showToast("Resume uploaded successfully! Verified for AI pre-matching.", "success");
    } catch (err) {
      console.error("[Resume Upload Error]:", err);
      showToast("Resume upload failed. Please try again.", "error");
    } finally {
      setUploadingResume(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 relative z-10">
      
      {/* PRE-LAUNCH STATUS BANNER */}
      <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-purple-950/80 border border-blue-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
          <div className="space-y-2 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>AIJobs Pre-Launch Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pre-Launch Candidate Profile
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
              Your candidate profile is registered in our launch pipeline. When full AI recruitment matches go live, top global employers and agency recruiters will evaluate your profile automatically.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 w-full md:w-auto">
            <div className="px-4 py-2 bg-black/40 border border-white/10 rounded-2xl text-right">
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Candidate ID</span>
              <span className="text-sm font-mono font-bold text-blue-400">{candidateBadgeId}</span>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-gray-950/60 border border-white/10 rounded-3xl p-12 text-center font-mono text-xs text-gray-400 animate-pulse">
          Loading candidate profile details...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: CANDIDATE SUMMARY CARD */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-950/80 border border-white/10 rounded-3xl p-6 text-center space-y-4 backdrop-blur-xl relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 flex items-center justify-center text-2xl font-black text-white mx-auto shadow-xl">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{user.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{user.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Account Pre-Registered</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 text-left space-y-2.5 text-xs text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-mono text-[10px] uppercase">Candidate ID</span>
                  <span className="font-mono text-blue-300 font-bold">{candidateBadgeId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-mono text-[10px] uppercase">Access Status</span>
                  <span className="text-gray-300 font-semibold capitalize">{user.accountStatus || "Active"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-mono text-[10px] uppercase">Created</span>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile Details</span>
              </button>
            </div>

            {/* RESUME CARD using shared CandidateResumeUploader */}
            <div className="bg-gray-950/80 border border-white/10 rounded-3xl p-6 text-left space-y-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-white">Resume Document</h4>
                </div>
                {candidateData.resumeUrl ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Uploaded
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    Pending
                  </span>
                )}
              </div>

              <CandidateResumeUploader
                userId={user.uid}
                profile={{ ...user, ...candidateData }}
                currentResumeUrl={candidateData.resumeUrl}
                currentResumeName={candidateData.resumeFileName}
                onResumeUploaded={(updated) => {
                  setCandidateData((prev) => ({
                    ...prev,
                    resumeUrl: updated.resumeUrl || updated.resumeURL,
                    resumeFileName: updated.resumeFileName
                  }));
                }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILED PROFILE INFORMATION */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* INFORMATION GRID */}
            <div className="bg-gray-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 text-left space-y-6 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Profile & Preferences</h3>
                  <p className="text-xs text-gray-400">Pre-launch candidate matching configuration</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                
                {/* Target Role */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase">
                    <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                    <span>Target Role</span>
                  </div>
                  <p className="text-sm font-bold text-white">{candidateData.targetRole || "Software Engineer"}</p>
                </div>

                {/* Location */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Preferred Location</span>
                  </div>
                  <p className="text-sm font-bold text-white">{candidateData.location || "Remote / India"}</p>
                </div>

                {/* Phone */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mobile Phone</span>
                  </div>
                  <p className="text-sm font-bold text-white">{candidateData.phone || "Not provided"}</p>
                </div>

                {/* Experience */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] uppercase">
                    <Award className="w-3.5 h-3.5 text-blue-400" />
                    <span>Experience Level</span>
                  </div>
                  <p className="text-sm font-bold text-white">{candidateData.experience || "1-3 Years"}</p>
                </div>

              </div>

              {/* SKILLS CHIPS */}
              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">Key Technical Skills</span>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(candidateData.skills) && candidateData.skills.length > 0 ? (
                    candidateData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 italic">No skills listed yet. Click edit to add skills.</span>
                  )}
                </div>
              </div>

            </div>

            {/* WHAT TO EXPECT AT LAUNCH CARD */}
            <div className="bg-gray-950/80 border border-white/10 rounded-3xl p-6 text-left space-y-4 backdrop-blur-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>What Happens at Official Platform Launch?</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-300">
                <div className="p-3 bg-white/5 rounded-2xl space-y-1">
                  <span className="font-bold text-white block">1. AI ATS Evaluation</span>
                  <p className="text-[11px] text-gray-400">Your uploaded resume is scanned for skills & match metrics.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl space-y-1">
                  <span className="font-bold text-white block">2. AI Mock Interview</span>
                  <p className="text-[11px] text-gray-400">Take a 5-minute AI technical screening interview.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl space-y-1">
                  <span className="font-bold text-white block">3. Direct Recruiter Pitch</span>
                  <p className="text-[11px] text-gray-400">Verified scores are dispatched directly to verified employers.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-gray-950 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-left relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white">Edit Candidate Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-gray-400 font-mono text-[10px] uppercase font-bold block">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 font-mono text-[10px] uppercase font-bold block">Mobile Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-mono text-[10px] uppercase font-bold block">Target Role</label>
                  <input
                    type="text"
                    value={editTargetRole}
                    onChange={(e) => setEditTargetRole(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 font-mono text-[10px] uppercase font-bold block">Preferred Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Bangalore / Remote"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-mono text-[10px] uppercase font-bold block">Experience Level</label>
                  <input
                    type="text"
                    value={editExperience}
                    onChange={(e) => setEditExperience(e.target.value)}
                    placeholder="e.g. 3-5 Years"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-mono text-[10px] uppercase font-bold block">
                  Key Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={editSkillsStr}
                  onChange={(e) => setEditSkillsStr(e.target.value)}
                  placeholder="React, TypeScript, Python, Tailwind"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Candidate Changes</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
