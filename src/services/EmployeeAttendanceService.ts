import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { AttendanceRecord, ShiftDefinition, LeaveRequest } from "../types/attendance";
import { 
  AttendanceStatus, 
  EmployeeAuditLog, 
  OfficeLocation, 
  WorkMode 
} from "../types/employeeTypes";
import { calculateHaversineDistanceMeters, detectAntiFraudFlags, evaluateGeofence } from "../utils/geofence";
import { getOfficeLocations, getShifts, createEmployeeAuditLog } from "./employeeService";

export class EmployeeAttendanceService {
  /**
   * Calculates distance in meters between user position and office location metadata.
   */
  static calculateDistanceToOffice(
    userLat: number,
    userLng: number,
    office: OfficeLocation
  ): number {
    return calculateHaversineDistanceMeters(
      userLat,
      userLng,
      office.latitude,
      office.longitude
    );
  }

  /**
   * Retrieves today's attendance record for an employee.
   */
  static async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    const todayStr = new Date().toISOString().split("T")[0];
    const attendanceDocId = `att_${employeeId}_${todayStr}`;
    const docSnap = await getDoc(doc(db, "attendance", attendanceDocId));
    if (docSnap.exists()) {
      return docSnap.data() as AttendanceRecord;
    }
    return null;
  }

  /**
   * Executes secure attendance check-in using serverTimestamp and geofence evaluation.
   */
  static async checkIn(params: {
    employeeId: string;
    employeeName: string;
    employeeUid?: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    workMode: WorkMode;
    officeLocationId?: string;
  }): Promise<AttendanceRecord> {
    const todayStr = new Date().toISOString().split("T")[0];
    const attendanceDocId = `att_${params.employeeId}_${todayStr}`;
    const nowISO = new Date().toISOString();

    // Load office locations and shifts
    const [offices, shifts] = await Promise.all([
      getOfficeLocations(),
      getShifts()
    ]);

    const activeShift = shifts.find(s => s.isActive) || shifts[0];
    const geofenceResult = evaluateGeofence(
      params.latitude,
      params.longitude,
      params.workMode,
      offices,
      params.officeLocationId
    );

    const fraudFlags = detectAntiFraudFlags(
      params.latitude,
      params.longitude,
      params.accuracy,
      geofenceResult.status,
      params.workMode,
      geofenceResult.distanceMeters
    );

    // Calculate if late according to shift grace time
    const now = new Date();
    const [shiftStartH, shiftStartM] = (activeShift?.startTime || "09:30").split(":").map(Number);
    const shiftStartTime = new Date();
    shiftStartTime.setHours(shiftStartH, shiftStartM, 0, 0);

    const graceMinutes = activeShift?.graceMinutes || 15;
    const graceCutoff = new Date(shiftStartTime.getTime() + graceMinutes * 60000);

    const isLate = now > graceCutoff;
    const lateMinutes = isLate ? Math.round((now.getTime() - shiftStartTime.getTime()) / 60000) : 0;
    const status: AttendanceStatus = isLate ? "Late" : "Present";

    const attendanceRef = doc(db, "attendance", attendanceDocId);
    
    // Construct record with Firestore serverTimestamp for high-security compliance
    const record: AttendanceRecord = {
      attendanceId: attendanceDocId,
      employeeId: params.employeeId,
      employeeUid: params.employeeUid || auth.currentUser?.uid || "",
      employeeName: params.employeeName,
      date: todayStr,
      checkInTime: nowISO,
      latitude: params.latitude,
      longitude: params.longitude,
      locationAccuracy: params.accuracy,
      geofenceStatus: geofenceResult.status,
      distanceFromOfficeMeters: geofenceResult.distanceMeters,
      officeLocationId: geofenceResult.matchedOfficeId,
      officeLocationName: geofenceResult.nearestOfficeName,
      workMode: params.workMode,
      status,
      isLate,
      lateMinutes,
      earlyExitMinutes: 0,
      totalWorkingMinutes: 0,
      totalBreakMinutes: 0,
      netWorkingMinutes: 0,
      overtimeMinutes: 0,
      antiFraudFlags: fraudFlags,
      managerApprovalStatus: fraudFlags.length > 0 ? "pending" : "approved",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(attendanceRef, {
      ...record,
      checkInTimeServer: serverTimestamp()
    }, { merge: true });

    await createEmployeeAuditLog({
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      action: "CHECK_IN",
      performedBy: auth.currentUser?.email || params.employeeId,
      newValue: `Checked in at ${now.toLocaleTimeString()} (${params.workMode}, Geofence: ${geofenceResult.status}, Distance: ${geofenceResult.distanceMeters}m)`
    });

    return record;
  }

  /**
   * Executes secure attendance check-out using serverTimestamp.
   */
  static async checkOut(params: {
    employeeId: string;
    employeeName: string;
    latitude: number;
    longitude: number;
  }): Promise<AttendanceRecord> {
    const todayStr = new Date().toISOString().split("T")[0];
    const attendanceDocId = `att_${params.employeeId}_${todayStr}`;
    const nowISO = new Date().toISOString();

    const attendanceRef = doc(db, "attendance", attendanceDocId);
    const docSnap = await getDoc(attendanceRef);

    if (!docSnap.exists()) {
      throw new Error("No check-in record found for today.");
    }

    const existingData = docSnap.data() as AttendanceRecord;
    const checkInTimeDate = new Date(existingData.checkInTime);
    const checkOutTimeDate = new Date();

    const totalWorkingMinutes = Math.max(
      0,
      Math.round((checkOutTimeDate.getTime() - checkInTimeDate.getTime()) / 60000)
    );
    const netWorkingMinutes = Math.max(0, totalWorkingMinutes - (existingData.totalBreakMinutes || 0));

    // Determine shift early exit if any
    const shifts = await getShifts();
    const activeShift = shifts.find(s => s.isActive) || shifts[0];
    const [shiftEndH, shiftEndM] = (activeShift?.endTime || "18:30").split(":").map(Number);
    const shiftEndTime = new Date();
    shiftEndTime.setHours(shiftEndH, shiftEndM, 0, 0);

    const earlyExitMinutes = checkOutTimeDate < shiftEndTime 
      ? Math.round((shiftEndTime.getTime() - checkOutTimeDate.getTime()) / 60000) 
      : 0;

    const updatedFields = {
      checkOutTime: nowISO,
      checkOutLatitude: params.latitude,
      checkOutLongitude: params.longitude,
      totalWorkingMinutes,
      netWorkingMinutes,
      earlyExitMinutes,
      updatedAt: serverTimestamp(),
      checkOutTimeServer: serverTimestamp()
    };

    await updateDoc(attendanceRef, updatedFields);

    await createEmployeeAuditLog({
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      action: "CHECK_OUT",
      performedBy: auth.currentUser?.email || params.employeeId,
      newValue: `Checked out at ${checkOutTimeDate.toLocaleTimeString()} (Net working hours: ${(netWorkingMinutes / 60).toFixed(1)} hrs)`
    });

    return {
      ...existingData,
      ...updatedFields
    };
  }

  /**
   * Fetches historical attendance logs for an employee.
   */
  static async getAttendanceHistory(employeeId: string, limitCount: number = 30): Promise<AttendanceRecord[]> {
    try {
      const q = query(
        collection(db, "attendance"),
        where("employeeId", "==", employeeId),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      const list: AttendanceRecord[] = [];
      snap.forEach(d => list.push(d.data() as AttendanceRecord));
      return list.slice(0, limitCount);
    } catch (err) {
      console.error("Error fetching attendance history:", err);
      return [];
    }
  }

  /**
   * Submits missed punch regularization request.
   */
  static async requestRegularization(params: {
    employeeId: string;
    employeeName: string;
    date: string;
    type: "missed_checkin" | "missed_checkout" | "time_correction" | "status_correction";
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason: string;
  }) {
    const regRef = doc(collection(db, "attendance_regularization"));
    const payload = {
      requestId: regRef.id,
      ...params,
      currentStatus: "Pending Approval",
      status: "pending",
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp()
    };

    await setDoc(regRef, payload);

    await createEmployeeAuditLog({
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      action: "REGULARIZATION_REQUEST",
      performedBy: auth.currentUser?.email || params.employeeId,
      newValue: `Submitted regularization for ${params.date} (${params.type}). Reason: ${params.reason}`
    });

    return payload;
  }

  /**
   * Submits a leave application.
   */
  static async applyLeave(params: {
    employeeId: string;
    employeeName: string;
    leaveType: any;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
  }) {
    const leaveRef = doc(collection(db, "leaves"));
    const payload = {
      leaveId: leaveRef.id,
      ...params,
      status: "pending",
      appliedAt: new Date().toISOString(),
      appliedAtServer: serverTimestamp()
    };

    await setDoc(leaveRef, payload);

    await createEmployeeAuditLog({
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      action: "LEAVE_APPROVAL",
      performedBy: auth.currentUser?.email || params.employeeId,
      newValue: `Applied for ${params.leaveType} (${params.startDate} to ${params.endDate}, ${params.totalDays} day(s))`
    });

    return payload;
  }
}
