import { useState, useCallback, useEffect } from "react";

export interface GeolocationCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GeolocationPermissionState = "idle" | "explaining" | "requesting" | "granted" | "denied";

export function useGeolocationAuthorization() {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GeolocationPermissionState>("idle");
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Check if browser permission was already granted previously
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          setStatus("granted");
        } else if (result.state === "denied") {
          setStatus("denied");
        }
      }).catch(() => {
        // Fallback for browsers that don't support permissions.query
      });
    }
  }, []);

  /**
   * Prompts the explanation dialog first before requesting getCurrentPosition
   */
  const requestLocationWithExplanation = useCallback(() => {
    setError(null);
    setShowExplanationModal(true);
    setStatus("explaining");
  }, []);

  /**
   * Called when user confirms understanding in the explanation dialog
   */
  const confirmAndRequestLocation = useCallback(() => {
    setShowExplanationModal(false);
    setStatus("requesting");
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation API is not supported by your browser.");
      setStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setStatus("granted");
      },
      (err) => {
        console.warn("Geolocation permission error:", err.message);
        setStatus("denied");
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission was denied. Location access is required for attendance verification and anti-fraud geofencing. Please enable location permissions in browser site settings.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location information is currently unavailable. Please ensure GPS is enabled on your device.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Please retry in an open area with good GPS signal.");
        } else {
          setError(err.message || "Failed to retrieve location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, []);

  const cancelExplanation = useCallback(() => {
    setShowExplanationModal(false);
    if (status === "explaining") {
      setStatus("idle");
    }
  }, [status]);

  return {
    coords,
    error,
    status,
    showExplanationModal,
    requestLocationWithExplanation,
    confirmAndRequestLocation,
    cancelExplanation
  };
}
