import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

// In-memory cache for the Google OAuth access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initiates the Google login popup with Google Sheets and Google Drive scopes
 * to retrieve and cache the required Google API access token.
 */
export async function connectGoogleSheets(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  if (isSigningIn) {
    throw new Error("Authorization is already in progress.");
  }

  isSigningIn = true;
  try {
    const provider = new GoogleAuthProvider();
    // Add specific Google Sheets and Drive scopes
    provider.addScope("https://www.googleapis.com/auth/spreadsheets");
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    provider.addScope("https://www.googleapis.com/auth/drive.readonly");

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential || !credential.accessToken) {
      throw new Error("Failed to retrieve access token from Google sign-in.");
    }

    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error: any) {
    console.error("Error connecting to Google Sheets:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Checks if the user is already authenticated with Google Sheets in this session.
 */
export function isGoogleSheetsConnected(): boolean {
  return cachedAccessToken !== null;
}

/**
 * Clears the cached Google Sheets credentials.
 */
export function disconnectGoogleSheets(): void {
  cachedAccessToken = null;
}

interface SpreadsheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a new Google Spreadsheet and populates it with the provided headers and rows.
 */
export async function exportToGoogleSheets(
  title: string,
  headers: string[],
  rows: any[][]
): Promise<SpreadsheetResult> {
  const token = cachedAccessToken || (await connectGoogleSheets());
  if (!token) {
    throw new Error("Access token is not available. Please connect first.");
  }

  // 1. Create Spreadsheet
  const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: title || `AIJobs Export ${new Date().toLocaleDateString()}`,
      },
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    console.error("Failed to create spreadsheet:", errText);
    throw new Error(`Google Sheets creation failed: ${createResponse.statusText}`);
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Format payload: headers as row 1, then data rows
  const valueData = [headers, ...rows];

  // 3. Write/Append values to Sheet1!A1
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=RAW`;
  const updateResponse = await fetch(updateUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range: "Sheet1!A1",
      majorDimension: "ROWS",
      values: valueData,
    }),
  });

  if (!updateResponse.ok) {
    const errText = await updateResponse.text();
    console.error("Failed to write to spreadsheet:", errText);
    throw new Error(`Google Sheets write failed: ${updateResponse.statusText}`);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
  };
}
