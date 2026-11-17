import { auth } from "../firebase";

/**
 * Best-effort candidate profile mirror. Firestore remains the live app source
 * while Neon receives the same verified profile for reporting and AI workflows.
 */
export async function syncCandidateProfileToNeon(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdToken();
  const response = await fetch("/api/neon/candidate-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({})
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error("Candidate Neon sync failed (" + response.status + "): " + message.slice(0,180));
  }
  return true;
}
