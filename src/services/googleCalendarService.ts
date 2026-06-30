import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize state
export const initCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in via Google with Calendar Scopes
export const signInWithGoogleCalendar = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to extract Google OAuth token from credential handshake");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    console.error("Google Calendar OAuth error:", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getCalendarAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectCalendar = () => {
  cachedAccessToken = null;
};

// Google Calendar API Event Methods
export interface CalendarEventPayload {
  summary: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  timezone?: string;
  location?: string;
  attendeeEmail?: string;
}

export const GoogleCalendarService = {
  /**
   * Create Event in Primary Calendar
   */
  async createEvent(token: string, payload: CalendarEventPayload) {
    try {
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: payload.summary,
          description: payload.description,
          start: {
            dateTime: payload.startTime,
            timeZone: payload.timezone || "Asia/Kolkata"
          },
          end: {
            dateTime: payload.endTime,
            timeZone: payload.timezone || "Asia/Kolkata"
          },
          location: payload.location || "",
          attendees: payload.attendeeEmail ? [{ email: payload.attendeeEmail }] : [],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 30 },
              { method: "popup", minutes: 15 }
            ]
          }
        })
      });

      if (!response.ok) {
        const errDetail = await response.text();
        throw new Error(`Google API returned status ${response.status}: ${errDetail}`);
      }

      const data = await response.json();
      console.log("[Google Calendar] Event successfully created on remote server:", data.id);
      return data;
    } catch (err) {
      console.error("Failed to create Google Calendar Event:", err);
      throw err;
    }
  },

  /**
   * Delete Event
   */
  async deleteEvent(token: string, eventId: string) {
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok && response.status !== 410) { // 410 means already deleted
        const errDetail = await response.text();
        throw new Error(`Google API returned status ${response.status}: ${errDetail}`);
      }

      console.log("[Google Calendar] Event deleted from remote server:", eventId);
      return true;
    } catch (err) {
      console.error("Failed to delete Google Calendar Event:", err);
      return false;
    }
  },

  /**
   * Update Event
   */
  async updateEvent(token: string, eventId: string, payload: CalendarEventPayload) {
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: payload.summary,
          description: payload.description,
          start: {
            dateTime: payload.startTime,
            timeZone: payload.timezone || "Asia/Kolkata"
          },
          end: {
            dateTime: payload.endTime,
            timeZone: payload.timezone || "Asia/Kolkata"
          },
          location: payload.location || "",
          attendees: payload.attendeeEmail ? [{ email: payload.attendeeEmail }] : []
        })
      });

      if (!response.ok) {
        throw new Error(`Google API update error status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error("Failed to update Google Calendar Event:", err);
      throw err;
    }
  }
};
