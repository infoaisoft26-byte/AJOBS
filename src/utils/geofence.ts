import { GeofenceStatus, OfficeLocation, WorkMode } from "../types/employeeTypes";

/**
 * Calculates the geodesic distance between two latitude/longitude points in meters using Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates employee punch location against assigned or default office locations.
 */
export function evaluateGeofence(
  lat: number,
  lng: number,
  workMode: WorkMode,
  offices: OfficeLocation[],
  assignedOfficeId?: string
): {
  status: GeofenceStatus;
  distanceMeters: number;
  nearestOfficeName: string;
  matchedOfficeId?: string;
} {
  if (workMode === "Work From Home") {
    return {
      status: "REMOTE",
      distanceMeters: 0,
      nearestOfficeName: "Work From Home"
    };
  }

  if (workMode === "Field Work" || workMode === "Client Visit") {
    return {
      status: "FIELD_VISIT",
      distanceMeters: 0,
      nearestOfficeName: "Field Visit"
    };
  }

  if (!offices || offices.length === 0) {
    // Default fallback if no office configured
    return {
      status: "INSIDE_OFFICE",
      distanceMeters: 0,
      nearestOfficeName: "Main Office"
    };
  }

  let targetOffices = offices;
  if (assignedOfficeId) {
    const matched = offices.filter(o => o.officeLocationId === assignedOfficeId);
    if (matched.length > 0) targetOffices = matched;
  }

  let minDistance = Infinity;
  let nearestOffice = offices[0];
  let isInside = false;

  for (const office of targetOffices) {
    const dist = calculateHaversineDistanceMeters(lat, lng, office.latitude, office.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestOffice = office;
    }
    const allowedRadius = office.allowedRadiusMeters || 200;
    if (dist <= allowedRadius) {
      isInside = true;
      nearestOffice = office;
      minDistance = dist;
      break;
    }
  }

  return {
    status: isInside ? "INSIDE_OFFICE" : "OUTSIDE_OFFICE",
    distanceMeters: minDistance,
    nearestOfficeName: nearestOffice.name,
    matchedOfficeId: nearestOffice.officeLocationId
  };
}

/**
 * Anti-fraud heuristic checker to flag suspicious attendance punches.
 */
export function detectAntiFraudFlags(
  lat: number,
  lng: number,
  accuracy: number,
  geofenceStatus: GeofenceStatus,
  workMode: WorkMode,
  distanceMeters: number
): string[] {
  const flags: string[] = [];

  // 1. Poor GPS accuracy check
  if (accuracy > 150) {
    flags.push(`Low Location Accuracy (${Math.round(accuracy)}m)`);
  }

  // 2. Outside geofence for Office mode
  if (workMode === "Office" && geofenceStatus === "OUTSIDE_OFFICE") {
    flags.push(`Outside Office Radius (${distanceMeters}m away)`);
  }

  // 3. Impossible or null coordinates
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    flags.push("Invalid GPS Coordinates");
  }

  return flags;
}
