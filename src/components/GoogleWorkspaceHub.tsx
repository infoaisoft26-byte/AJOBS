import React, { useState, useEffect } from "react";
import { 
  Sparkles, FileText, Database, Plus, RefreshCw, ExternalLink, 
  Layers, CheckCircle, FolderOpen, AlertCircle, FileSpreadsheet, 
  FileUp, Link2, Info, Loader2, Check, CloudLightning
} from "lucide-react";
import { motion } from "motion/react";
import { 
  workspaceSignIn, 
  getWorkspaceAccessToken, 
  workspaceLogout, 
  loadGooglePickerApi, 
  listGoogleFormsFromDrive, 
  createGoogleForm, 
  getGoogleFormDetails, 
  getGoogleFormResponses 
} from "../services/workspaceService";
import { useToast } from "./GlobalToast";

declare const google: any;

interface GoogleWorkspaceHubProps {
  userId: string;
  userName: string;
  userRole: string; // "candidate" | "employer" / "recruiter" | "admin" etc.
}

export default function GoogleWorkspaceHub({ userId, userName, userRole }: GoogleWorkspaceHubProps) {
  const { showToast } = useToast();
  const [accessToken, setAccessToken] = useState<string | null>(getWorkspaceAccessToken());
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Forms states
  const [forms, setForms] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFormDetails, setSelectedFormDetails] = useState<any | null>(null);
  const [selectedFormResponses, setSelectedFormResponses] = useState<any[]>([]);
  const [isLoadingFormResponses, setIsLoadingFormResponses] = useState(false);

  // Picker states
  const [pickedFile, setPickedFile] = useState<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
    sizeBytes?: number;
  } | null>(null);

  // Load Google SDKs on mount
  useEffect(() => {
    const initSdk = async () => {
      setIsLoadingApi(true);
      try {
        await loadGooglePickerApi();
        setIsApiLoaded(true);
      } catch (err: any) {
        console.error("Failed to load Google Picker SDK", err);
        showToast("Google Picker API failed to initialize. Re-attempting...", "error");
      } finally {
        setIsLoadingApi(false);
      }
    };
    initSdk();
  }, [showToast]);

  // Sync token from service on load
  useEffect(() => {
    const token = getWorkspaceAccessToken();
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Handle Google Login with Workspace Scopes
  const handleGoogleSignIn = async () => {
    try {
      const result = await workspaceSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        setGoogleUser(result.user);
        showToast("Connected to Google Workspace successfully!", "success");
        // Automatically fetch recent forms
        fetchForms(result.accessToken);
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to authenticate with Google Workspace.", "error");
    }
  };

  const handleDisconnect = async () => {
    await workspaceLogout();
    setAccessToken(null);
    setGoogleUser(null);
    setForms([]);
    setPickedFile(null);
    setSelectedFormId(null);
    setSelectedFormDetails(null);
    setSelectedFormResponses([]);
    showToast("Disconnected from Google Workspace.", "info");
  };

  // Fetch recent Google Forms from Google Drive API
  const fetchForms = async (token = accessToken) => {
    if (!token) return;
    setIsLoadingForms(true);
    try {
      const list = await listGoogleFormsFromDrive(token);
      setForms(list);
    } catch (err: any) {
      console.error(err);
      showToast("Could not retrieve Google Forms from Drive.", "error");
    } finally {
      setIsLoadingForms(false);
    }
  };

  // Create a brand new Google Form with Candidate Screen Template
  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      showToast("Authentication required.", "warning");
      return;
    }
    if (!newFormTitle.trim()) {
      showToast("Form title is required.", "warning");
      return;
    }

    setIsCreatingForm(true);
    try {
      const title = newFormTitle;
      const desc = newFormDesc || "AIJobs Automated Candidate Sourcing & Evaluation Screening Form";
      const form = await createGoogleForm(accessToken, title, desc);
      showToast(`Form "${title}" successfully created!`, "success");
      setNewFormTitle("");
      setNewFormDesc("");
      fetchForms(); // Reload forms list
      
      // Select newly created form
      handleSelectForm(form.formId);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to create Google Form.", "error");
    } finally {
      setIsCreatingForm(false);
    }
  };

  // Select a Google Form to view details and list applicants responses
  const handleSelectForm = async (formId: string) => {
    if (!accessToken) return;
    setSelectedFormId(formId);
    setIsLoadingFormResponses(true);
    try {
      // 1. Fetch form metadata
      const details = await getGoogleFormDetails(accessToken, formId);
      setSelectedFormDetails(details);

      // 2. Fetch responses
      const responsesList = await getGoogleFormResponses(accessToken, formId);
      setSelectedFormResponses(responsesList);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to fetch Google Form details or submissions.", "error");
    } finally {
      setIsLoadingFormResponses(false);
    }
  };

  // Google Drive Picker trigger
  const handleLaunchPicker = () => {
    if (!accessToken) {
      showToast("Please sign in to Google Workspace first.", "warning");
      return;
    }
    if (!isApiLoaded) {
      showToast("Google API SDK is still loading. Try again in a moment.", "warning");
      return;
    }

    try {
      // Dynamic Picker Origin detection to support frames and reverse proxies seamlessly
      const pickerOrigin =
        window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0
          ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
          : window.location.origin;

      console.log("[Google Picker] Launching with origin:", pickerOrigin);

      const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
      view.setMimeTypes("application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document");

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            setPickedFile({
              id: doc.id,
              name: doc.name,
              url: doc.url,
              mimeType: doc.mimeType,
              sizeBytes: doc.sizeBytes
            });
            showToast(`Selected file: ${doc.name}`, "success");
          }
        })
        .setOrigin(pickerOrigin)
        .setTitle("Select Candidate Resume / Corporate Job Specification Document")
        .build();

      picker.setVisible(true);
    } catch (err: any) {
      console.error("Failed to build Google Picker", err);
      showToast("Error launching Picker. Please check third-party cookies or permissions.", "error");
    }
  };

  return (
    <div className="space-y-6 container mx-auto px-4 py-6" id="workspace-hub-root">
      {/* Upper Status Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-purple-900/40 border border-indigo-500/20 rounded-2xl gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="text-xl font-display font-extrabold text-white tracking-wide">
              Google Workspace Hub
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Directly connect your corporate Google Drive files and Google Forms evaluation templates to our recruitment pipeline.
          </p>
        </div>

        {/* Authentication Button Control */}
        {!accessToken ? (
          <button
            onClick={handleGoogleSignIn}
            className="gsi-material-button font-sans w-full md:w-auto shrink-0 shadow-lg shadow-indigo-500/10 cursor-pointer transition-transform hover:scale-[1.01]"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-semibold text-xs text-slate-800">Sign in with Google</span>
            </div>
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-400/20 rounded-xl flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] font-mono font-bold text-indigo-300">GOOGLE LINKED</p>
                <p className="text-[9px] font-mono text-gray-400">{googleUser?.email || "Workspace active"}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="py-2 px-4 bg-red-500/15 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-300 rounded-xl font-mono text-xs transition-colors shrink-0 cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!accessToken ? (
        /* Sign In Request screen */
        <div className="p-12 text-center bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-4">
          <CloudLightning className="w-12 h-12 text-indigo-500/50 animate-bounce" />
          <h3 className="font-extrabold text-white text-base">Google Authentication Required</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed font-mono">
            Access secure client-side features for Google Forms templates generation, live response analytics, and native Google Picker integrations.
          </p>
          <button
            onClick={handleGoogleSignIn}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono rounded-xl transition-all font-bold flex items-center gap-2 shadow-md shadow-indigo-500/15 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Connect Workspace Sandbox</span>
          </button>
        </div>
      ) : (
        /* Workspace control deck */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: File Picker & Form Builder */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Native Google Picker Module Card */}
            <div className="p-5 bg-[#0a0a0f] border border-white/10 rounded-2xl space-y-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                <span>Google Picker Service</span>
              </span>

              <div className="space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Browse contracts, portfolios, custom JD drafts, or PDF resumes on your cloud drive. Loads in a secure native modal with permission from Google.
                </p>

                <button
                  type="button"
                  onClick={handleLaunchPicker}
                  className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Launch Google Drive Picker</span>
                </button>
              </div>

              {pickedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-[11px] font-mono text-gray-200 font-bold break-words line-clamp-2">
                      📁 {pickedFile.name}
                    </p>
                    <span className="text-[8px] font-mono px-1 py-0.5 bg-indigo-500/25 rounded text-indigo-300 uppercase">
                      Picked
                    </span>
                  </div>
                  <div className="space-y-1 text-[9px] font-mono text-gray-400">
                    <p>ID: <span className="text-gray-300">{pickedFile.id}</span></p>
                    <p>Type: <span className="text-gray-300">{pickedFile.mimeType.split("/")[1] || "Document"}</span></p>
                    {pickedFile.sizeBytes && (
                      <p>Size: <span className="text-gray-300">{(pickedFile.sizeBytes / 1024).toFixed(1)} KB</span></p>
                    )}
                  </div>
                  <a
                    href={pickedFile.url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center justify-center gap-1.5 py-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-indigo-400 rounded-lg transition-colors border border-white/5 font-mono"
                  >
                    <span>View file on Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </motion.div>
              )}
            </div>

            {/* Template Form Sourcing Card */}
            <div className="p-5 bg-[#0a0a0f] border border-white/10 rounded-2xl space-y-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-pink-400" />
                <span>Form Sourcing Generator</span>
              </span>

              <p className="text-xs text-gray-400 leading-relaxed font-mono">
                Deploy an automated, structured applicant intake and screening form to collect details like email, experience, and key skills.
              </p>

              <form onSubmit={handleCreateForm} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400">Form Title</label>
                  <input
                    type="text"
                    value={newFormTitle}
                    onChange={(e) => setNewFormTitle(e.target.value)}
                    placeholder="e.g., Senior Node Engineer Screen"
                    required
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono outline-none focus:border-pink-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400">Form Description</label>
                  <textarea
                    value={newFormDesc}
                    onChange={(e) => setNewFormDesc(e.target.value)}
                    placeholder="Short summary for the candidate..."
                    rows={2}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono outline-none focus:border-pink-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingForm}
                  className="w-full py-2 bg-pink-500/10 hover:bg-pink-500 hover:text-white border border-pink-500/30 text-pink-300 font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingForm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating & Templating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Deploy Screen Template Form</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>

          {/* Right panel: Active Forms List & Form Responses Viewer */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Active Forms from Drive list */}
            <div className="p-5 bg-[#0a0a0f] border border-white/10 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Google Forms templates list ({forms.length})</span>
                </span>
                <button
                  onClick={() => fetchForms()}
                  disabled={isLoadingForms}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 cursor-pointer"
                  title="Reload list from Drive"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForms ? "animate-spin" : ""}`} />
                </button>
              </div>

              {isLoadingForms ? (
                <div className="py-12 text-center text-gray-500 font-mono text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Scanning Google Drive files directory...</span>
                </div>
              ) : forms.length === 0 ? (
                <div className="py-8 text-center bg-[#0d0d12] border border-white/5 rounded-xl text-gray-500 font-mono text-[10px] italic">
                  No applicant forms detected. Deploy a template screen form on the left pane!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  {forms.map((form) => (
                    <div 
                      key={form.id}
                      onClick={() => handleSelectForm(form.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between h-24 ${
                        selectedFormId === form.id 
                          ? "bg-emerald-500/10 border-emerald-500/40 shadow-md shadow-emerald-500/5" 
                          : "bg-[#0d0d12] border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white font-mono truncate">{form.name}</p>
                        <p className="text-[8px] font-mono text-gray-500">
                          Created: {new Date(form.createdTime).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center gap-1.5 pt-2 border-t border-white/5">
                        <span className="text-[8px] font-mono text-emerald-400 font-bold">
                          {selectedFormId === form.id ? "● Active Inspection" : "View Responses"}
                        </span>
                        
                        <a 
                          href={form.webViewLink}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 text-[9px] font-mono flex items-center gap-1"
                        >
                          <span>Open Form</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Responses inspection table */}
            <div className="p-5 bg-[#0a0a0f] border border-white/10 rounded-2xl space-y-4">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Live Responses Analyzer</span>
              </span>

              {selectedFormId ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-bold text-white font-mono">
                        {selectedFormDetails?.info?.title || "Evaluating Google Form"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        ID: <span className="text-gray-300 font-bold">{selectedFormId}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/15 rounded-lg text-blue-300 font-bold">
                        {selectedFormResponses.length} Submissions
                      </span>
                      <button
                        onClick={() => handleSelectForm(selectedFormId)}
                        disabled={isLoadingFormResponses}
                        className="p-1 px-2.5 bg-white/5 text-[9px] font-mono border border-white/5 text-gray-300 hover:text-white rounded-lg cursor-pointer"
                      >
                        {isLoadingFormResponses ? "Refreshing..." : "Sync Responses"}
                      </button>
                    </div>
                  </div>

                  {isLoadingFormResponses ? (
                    <div className="py-12 text-center text-gray-500 font-mono text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Pulling submissions data from Google Forms API...</span>
                    </div>
                  ) : selectedFormResponses.length === 0 ? (
                    <div className="py-12 text-center bg-[#0d0d12] border border-white/5 rounded-xl text-gray-500 font-mono text-xs">
                      No responses yet. Share the form link with candidates to receive screening profiles.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0d0d12]">
                      <table className="w-full text-left font-mono text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-gray-400 border-b border-white/5 font-bold">
                            <th className="p-3">Applicant (Email)</th>
                            <th className="p-3">Experience</th>
                            <th className="p-3">Answers / Overview</th>
                            <th className="p-3 text-right">Submitted Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-300">
                          {selectedFormResponses.map((resp: any, index: number) => {
                            // Extrapolate answer fields based on question map
                            const answers = resp.answers || {};
                            const answerValues = Object.values(answers).map((ans: any) => {
                              const textAnswers = ans.textAnswers?.answers || [];
                              return textAnswers.map((ta: any) => ta.value).join(", ");
                            });

                            // Display first answer as Candidate Name, second as Email, third as Experience, fourth as brief info
                            const name = answerValues[0] || "Candidate " + (index + 1);
                            const email = answerValues[1] || "No Email Provided";
                            const exp = answerValues[2] || "—";
                            const description = answerValues[3] || "No details provided";

                            return (
                              <tr key={resp.responseId} className="hover:bg-white/[0.02]">
                                <td className="p-3">
                                  <div className="font-bold text-white">{name}</div>
                                  <div className="text-[9px] text-gray-400">{email}</div>
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/10 rounded-lg text-indigo-300 text-[9px] font-bold">
                                    {exp}
                                  </span>
                                </td>
                                <td className="p-3 max-w-xs truncate" title={description}>
                                  {description}
                                </td>
                                <td className="p-3 text-right text-gray-400">
                                  {new Date(resp.lastSubmittedTime).toLocaleDateString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center bg-[#0d0d12] border border-white/5 rounded-xl text-gray-500 font-mono text-xs flex flex-col items-center justify-center space-y-2">
                  <Database className="w-8 h-8 text-blue-500/40 mb-1" />
                  <span>Select a Google Form template above to fetch and analyze candidate responses.</span>
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
