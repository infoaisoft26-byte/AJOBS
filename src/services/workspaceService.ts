import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";

// Scopes we requested and got authorized for:
export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.body.readonly",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly"
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

// Request offline access and consent if required
provider.setCustomParameters({
  prompt: "consent"
});

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Auth State Listener
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google with requested workspace scopes
export const workspaceSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Google Auth Provider.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Workspace Sign-In error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setWorkspaceAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const workspaceLogout = async () => {
  cachedAccessToken = null;
};

// Dynamic Google Picker & client SDK Loader
export const loadGooglePickerApi = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).gapi && (window as any).google?.picker) {
      resolve();
      return;
    }

    // Load gapi script
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const gapi = (window as any).gapi;
      if (gapi) {
        gapi.load("picker", {
          callback: () => {
            console.log("[WorkspaceService] Google Picker API loaded successfully.");
            resolve();
          },
          onerror: (err: any) => {
            console.error("[WorkspaceService] Failed to load Google Picker callback.", err);
            reject(new Error("Failed to load Google Picker API modules."));
          }
        });
      } else {
        reject(new Error("gapi object not found after script load"));
      }
    };
    script.onerror = (err) => {
      console.error("[WorkspaceService] Error loading api.js script tag:", err);
      reject(new Error("Failed to load Google API Client (api.js) script."));
    };
    document.body.appendChild(script);
  });
};

// Fetch list of Google Forms from Drive
export const listGoogleFormsFromDrive = async (token: string) => {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,createdTime,iconLink)&pageSize=30`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list forms from Drive: ${res.statusText}. Details: ${errText}`);
  }
  
  const data = await res.json();
  return data.files || [];
};

// Batch update to add screening questions
export const addDefaultQuestionsToForm = async (token: string, formId: string) => {
  const url = `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`;
  const body = {
    requests: [
      {
        createItem: {
          item: {
            title: "Candidate Full Name",
            questionItem: {
              question: {
                required: true,
                textQuestion: {}
              }
            }
          },
          location: { index: 0 }
        }
      },
      {
        createItem: {
          item: {
            title: "Candidate Email Address",
            questionItem: {
              question: {
                required: true,
                textQuestion: {}
              }
            }
          },
          location: { index: 1 }
        }
      },
      {
        createItem: {
          item: {
            title: "Years of Professional Experience",
            questionItem: {
              question: {
                required: true,
                choiceQuestion: {
                  type: "RADIO",
                  options: [
                    { value: "0-2 years (Entry/Junior)" },
                    { value: "3-5 years (Mid-Level)" },
                    { value: "5+ years (Senior/Lead)" }
                  ]
                }
              }
            }
          },
          location: { index: 2 }
        }
      },
      {
        createItem: {
          item: {
            title: "Briefly explain your key skills / projects",
            questionItem: {
              question: {
                required: false,
                textQuestion: { paragraph: true }
              }
            }
          },
          location: { index: 3 }
        }
      }
    ]
  };
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to add default questions: ${res.statusText}. Details: ${errText}`);
  }
  
  return await res.json();
};

// Create a new Google Form
export const createGoogleForm = async (token: string, title: string, description: string) => {
  const url = "https://forms.googleapis.com/v1/forms";
  const body = {
    info: {
      title: title,
      description: description
    }
  };
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create form: ${res.statusText}. Details: ${errText}`);
  }
  
  const form = await res.json();
  
  // Let's also add some default items (e.g. Name, Email, Experience level)
  try {
    await addDefaultQuestionsToForm(token, form.formId);
  } catch (err) {
    console.warn("Failed to add default questions, but form was created:", err);
  }
  
  return form;
};

// Fetch details of a form
export const getGoogleFormDetails = async (token: string, formId: string) => {
  const url = `https://forms.googleapis.com/v1/forms/${formId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch form details: ${res.statusText}. Details: ${errText}`);
  }
  
  return await res.json();
};

// Fetch responses for a form
export const getGoogleFormResponses = async (token: string, formId: string) => {
  const url = `https://forms.googleapis.com/v1/forms/${formId}/responses`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch form responses: ${res.statusText}. Details: ${errText}`);
  }
  
  const data = await res.json();
  return data.responses || [];
};
