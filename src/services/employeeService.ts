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
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { 
  AttendanceBreak, 
  AttendanceRecord, 
  AttendanceRegularization, 
  AttendanceStatus, 
  EmployeeAdvance, 
  EmployeeAuditLog, 
  EmployeePayroll, 
  EmployeeProfile, 
  HolidayItem, 
  LeaveBalance, 
  LeaveRequest, 
  OfficeLocation, 
  PayrollPolicy, 
  PayrollRun, 
  SalaryRevision, 
  SalaryStructure, 
  ShiftConfig 
} from "../types/employeeTypes";
import { detectAntiFraudFlags, evaluateGeofence } from "../utils/geofence";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('[Firestore Employee Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Default Seed Configuration Constants
export const DEFAULT_OFFICE_LOCATION: OfficeLocation = {
  officeLocationId: "office_hq_01",
  name: "AIJobs Headquarters",
  address: "Building 42, Tech Park, Cyber City, Bangalore",
  latitude: 12.971598,
  longitude: 77.594562,
  allowedRadiusMeters: 300,
  isPrimary: true
};

export const DEFAULT_SHIFT: ShiftConfig = {
  shiftId: "shift_general",
  shiftName: "General Shift",
  startTime: "09:30",
  endTime: "18:30",
  graceMinutes: 15,
  minimumHalfDayMinutes: 240, // 4 hours
  minimumFullDayMinutes: 480, // 8 hours
  weeklyOffDays: [0, 6], // Sun, Sat
  isActive: true
};

export const DEFAULT_SALARY_STRUCTURE: SalaryStructure = {
  structureId: "structure_standard",
  structureName: "Standard Software & Staffing Structure",
  basicPercentage: 50,
  hraPercentage: 20,
  conveyanceAllowance: 1600,
  specialAllowancePercentage: 15,
  otherAllowanceFixed: 2000,
  pfPercentage: 12,
  esiPercentage: 0.75,
  professionalTaxFixed: 200,
  tdsPercentage: 5,
  isDefault: true
};

export const DEFAULT_PAYROLL_POLICY: PayrollPolicy = {
  payrollDivisorMethod: "calendar_days",
  fixedDivisorDays: 30,
  halfDayLopRule: "0.5_lop",
  lateDeductionPolicy: "3_lates_equal_half_day_lop",
  overtimePayRateMultiplier: 1.25
};

// ==========================================
// AUDIT LOGGING SERVICE
// ==========================================
export async function createEmployeeAuditLog(log: Omit<EmployeeAuditLog, "logId" | "timestamp">) {
  try {
    const logRef = doc(collection(db, "employee_audit_logs"));
    const newLog: EmployeeAuditLog = {
      ...log,
      logId: logRef.id,
      timestamp: new Date().toISOString()
    };
    await setDoc(logRef, newLog);
  } catch (err) {
    console.warn("Failed to create employee audit log:", err);
  }
}

// ==========================================
// OFFICE LOCATIONS & SHIFTS & HOLIDAYS
// ==========================================
export async function getOfficeLocations(): Promise<OfficeLocation[]> {
  try {
    const snap = await getDocs(collection(db, "office_locations"));
    const list: OfficeLocation[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as OfficeLocation);
    });
    if (list.length === 0) {
      // Seed default HQ
      await setDoc(doc(db, "office_locations", DEFAULT_OFFICE_LOCATION.officeLocationId), DEFAULT_OFFICE_LOCATION);
      return [DEFAULT_OFFICE_LOCATION];
    }
    return list;
  } catch (err) {
    console.error("Error loading office locations:", err);
    return [DEFAULT_OFFICE_LOCATION];
  }
}

export async function saveOfficeLocation(loc: OfficeLocation) {
  try {
    const locId = loc.officeLocationId || `office_${Date.now()}`;
    const payload = { ...loc, officeLocationId: locId, createdAt: loc.createdAt || new Date().toISOString() };
    await setDoc(doc(db, "office_locations", locId), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "office_locations");
  }
}

export async function getShifts(): Promise<ShiftConfig[]> {
  try {
    const snap = await getDocs(collection(db, "shifts"));
    const list: ShiftConfig[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as ShiftConfig);
    });
    if (list.length === 0) {
      await setDoc(doc(db, "shifts", DEFAULT_SHIFT.shiftId), DEFAULT_SHIFT);
      return [DEFAULT_SHIFT];
    }
    return list;
  } catch (err) {
    console.error("Error loading shifts:", err);
    return [DEFAULT_SHIFT];
  }
}

export async function saveShift(shift: ShiftConfig) {
  try {
    const shiftId = shift.shiftId || `shift_${Date.now()}`;
    const payload = { ...shift, shiftId, createdAt: shift.createdAt || new Date().toISOString() };
    await setDoc(doc(db, "shifts", shiftId), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "shifts");
  }
}

export async function getHolidays(year: number = new Date().getFullYear()): Promise<HolidayItem[]> {
  try {
    const snap = await getDocs(collection(db, "holidays"));
    const list: HolidayItem[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as HolidayItem;
      if (data.year === year || !data.year) {
        list.push(data);
      }
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error("Error fetching holidays:", err);
    return [];
  }
}

export async function saveHoliday(item: HolidayItem) {
  try {
    const holidayId = item.holidayId || `holiday_${Date.now()}`;
    const payload = { ...item, holidayId };
    await setDoc(doc(db, "holidays", holidayId), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "holidays");
  }
}

// ==========================================
// EMPLOYEE PROFILES MANAGEMENT
// ==========================================
export async function getEmployeeProfiles(): Promise<EmployeeProfile[]> {
  try {
    const snap = await getDocs(collection(db, "employees"));
    const list: EmployeeProfile[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as EmployeeProfile);
    });
    return list;
  } catch (err) {
    console.error("Error fetching employees:", err);
    return [];
  }
}

export async function getEmployeeByUid(uid: string): Promise<EmployeeProfile | null> {
  try {
    const snap = await getDocs(query(collection(db, "employees"), where("uid", "==", uid)));
    if (!snap.empty) {
      return snap.docs[0].data() as EmployeeProfile;
    }
    return null;
  } catch (err) {
    console.error("Error fetching employee by uid:", err);
    return null;
  }
}

export async function saveEmployeeProfile(emp: EmployeeProfile) {
  try {
    const empId = emp.employeeId || `EMP${Math.floor(1000 + Math.random() * 9000)}`;
    const payload: EmployeeProfile = {
      ...emp,
      employeeId: empId,
      createdAt: emp.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, "employees", empId), payload);

    // Also sync role / internal flag in `users` collection if UID exists
    if (emp.uid) {
      await updateDoc(doc(db, "users", emp.uid), {
        role: "employee",
        isInternalEmployee: true,
        employeeId: empId,
        department: emp.department,
        designation: emp.designation
      }).catch(async () => {
        // Create user doc if not present
        await setDoc(doc(db, "users", emp.uid), {
          uid: emp.uid,
          email: emp.email,
          name: emp.fullName,
          role: "employee",
          isInternalEmployee: true,
          employeeId: empId,
          department: emp.department,
          designation: emp.designation,
          createdAt: new Date().toISOString()
        });
      });
    }

    await createEmployeeAuditLog({
      employeeId: empId,
      employeeName: emp.fullName,
      action: "MANUAL_CORRECTION",
      performedBy: auth.currentUser?.email || "Admin",
      newValue: `Updated profile for ${emp.fullName} (${emp.designation})`
    });

    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "employees");
  }
}

// ==========================================
// ATTENDANCE PUNCH (CHECK-IN / CHECK-OUT / BREAK)
// ==========================================
export async function getTodayAttendance(employeeId: string, dateStr?: string): Promise<AttendanceRecord | null> {
  try {
    const today = dateStr || new Date().toISOString().split("T")[0];
    const snap = await getDocs(
      query(
        collection(db, "attendance"),
        where("employeeId", "==", employeeId),
        where("date", "==", today)
      )
    );
    if (!snap.empty) {
      return snap.docs[0].data() as AttendanceRecord;
    }
    return null;
  } catch (err) {
    console.error("Error getting today's attendance:", err);
    return null;
  }
}

export async function checkInEmployee(params: {
  employee: EmployeeProfile;
  latitude: number;
  longitude: number;
  accuracy: number;
  workMode: WorkMode;
  offices: OfficeLocation[];
  shifts: ShiftConfig[];
  browserInfo?: string;
}) {
  const { employee, latitude, longitude, accuracy, workMode, offices, shifts, browserInfo } = params;
  const today = new Date().toISOString().split("T")[0];

  // 1. Check existing record
  const existing = await getTodayAttendance(employee.employeeId, today);
  if (existing) {
    throw new Error(JSON.stringify({ success: false, error: "ALREADY_CHECKED_IN", message: "You have already checked in for today." }));
  }

  // 2. Authoritative Server Time
  const serverTimeIso = new Date().toISOString();
  const checkInDateObj = new Date(serverTimeIso);

  // 3. Evaluate shift & grace minutes
  const empShift = shifts.find(s => s.shiftId === employee.shiftId) || DEFAULT_SHIFT;
  const [shiftHours, shiftMins] = empShift.startTime.split(":").map(Number);
  const shiftStartObj = new Date(checkInDateObj);
  shiftStartObj.setHours(shiftHours, shiftMins, 0, 0);

  const graceMillis = (empShift.graceMinutes || 15) * 60 * 1000;
  const graceDeadline = new Date(shiftStartObj.getTime() + graceMillis);

  let isLate = false;
  let lateMinutes = 0;
  if (checkInDateObj > graceDeadline) {
    isLate = true;
    lateMinutes = Math.round((checkInDateObj.getTime() - shiftStartObj.getTime()) / (60 * 1000));
  }

  // 4. Geofence calculation
  const geofenceResult = evaluateGeofence(latitude, longitude, workMode, offices, employee.officeLocationId);
  const antiFraudFlags = detectAntiFraudFlags(
    latitude, 
    longitude, 
    accuracy, 
    geofenceResult.status, 
    workMode, 
    geofenceResult.distanceMeters
  );

  const attendanceId = `att_${employee.employeeId}_${today}`;
  const record: AttendanceRecord = {
    attendanceId,
    employeeId: employee.employeeId,
    employeeName: employee.fullName,
    date: today,
    checkInTime: serverTimeIso,
    latitude,
    longitude,
    locationAccuracy: accuracy,
    geofenceStatus: geofenceResult.status,
    distanceFromOfficeMeters: geofenceResult.distanceMeters,
    officeLocationId: geofenceResult.matchedOfficeId,
    officeLocationName: geofenceResult.nearestOfficeName,
    workMode,
    status: isLate ? "Late" : "Present",
    isLate,
    lateMinutes,
    earlyExitMinutes: 0,
    totalWorkingMinutes: 0,
    totalBreakMinutes: 0,
    netWorkingMinutes: 0,
    overtimeMinutes: 0,
    browser: browserInfo || typeof navigator !== "undefined" ? navigator.userAgent : "Web",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Web",
    antiFraudFlags,
    managerApprovalStatus: (geofenceResult.status === "OUTSIDE_OFFICE" || workMode === "Work From Home" || workMode === "Field Work") ? "pending" : "approved",
    createdAt: serverTimeIso,
    updatedAt: serverTimeIso
  };

  await setDoc(doc(db, "attendance", attendanceId), record);

  await createEmployeeAuditLog({
    employeeId: employee.employeeId,
    employeeName: employee.fullName,
    action: "CHECK_IN",
    performedBy: employee.email,
    newValue: `Checked in at ${new Date(serverTimeIso).toLocaleTimeString()} (${workMode}, ${geofenceResult.status})`
  });

  return record;
}

export async function checkOutEmployee(params: {
  employee: EmployeeProfile;
  attendanceRecord: AttendanceRecord;
  latitude: number;
  longitude: number;
  accuracy: number;
  shifts: ShiftConfig[];
}) {
  const { employee, attendanceRecord, latitude, longitude, accuracy, shifts } = params;

  if (attendanceRecord.checkOutTime) {
    throw new Error(JSON.stringify({ success: false, error: "ALREADY_CHECKED_OUT", message: "Attendance check-out already recorded." }));
  }

  const serverTimeIso = new Date().toISOString();
  const checkOutObj = new Date(serverTimeIso);
  const checkInObj = new Date(attendanceRecord.checkInTime);

  // Total gross duration in minutes
  const grossMinutes = Math.max(0, Math.round((checkOutObj.getTime() - checkInObj.getTime()) / (60 * 1000)));

  // Calculate total breaks
  const breaks = await getAttendanceBreaks(attendanceRecord.attendanceId);
  let totalBreakMins = 0;
  breaks.forEach(b => {
    if (b.breakDurationMinutes) {
      totalBreakMins += b.breakDurationMinutes;
    } else if (b.breakStart && b.breakEnd) {
      totalBreakMins += Math.round((new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime()) / (60 * 1000));
    }
  });

  const netWorkingMins = Math.max(0, grossMinutes - totalBreakMins);

  // Shift requirements check
  const empShift = shifts.find(s => s.shiftId === employee.shiftId) || DEFAULT_SHIFT;
  const minFullDayMins = empShift.minimumFullDayMinutes || 480;
  const minHalfDayMins = empShift.minimumHalfDayMinutes || 240;

  let finalStatus: AttendanceStatus = attendanceRecord.status;
  let earlyExitMinutes = 0;

  // Shift end time calculation for early exit
  const [endH, endM] = empShift.endTime.split(":").map(Number);
  const shiftEndObj = new Date(checkOutObj);
  shiftEndObj.setHours(endH, endM, 0, 0);

  if (checkOutObj < shiftEndObj) {
    earlyExitMinutes = Math.round((shiftEndObj.getTime() - checkOutObj.getTime()) / (60 * 1000));
  }

  if (netWorkingMins < minHalfDayMins) {
    finalStatus = "Absent";
  } else if (netWorkingMins < minFullDayMins && finalStatus !== "Late") {
    finalStatus = "Half Day";
  }

  // Overtime
  let overtimeMinutes = 0;
  if (netWorkingMins > minFullDayMins) {
    overtimeMinutes = netWorkingMins - minFullDayMins;
  }

  const updatedRecord: Partial<AttendanceRecord> = {
    checkOutTime: serverTimeIso,
    checkOutLatitude: latitude,
    checkOutLongitude: longitude,
    totalWorkingMinutes: grossMinutes,
    totalBreakMinutes: totalBreakMins,
    netWorkingMinutes: netWorkingMins,
    earlyExitMinutes,
    overtimeMinutes,
    overtimeStatus: overtimeMinutes > 0 ? "overtimePending" : undefined,
    status: finalStatus,
    updatedAt: serverTimeIso
  };

  await updateDoc(doc(db, "attendance", attendanceRecord.attendanceId), updatedRecord);

  await createEmployeeAuditLog({
    employeeId: employee.employeeId,
    employeeName: employee.fullName,
    action: "CHECK_OUT",
    performedBy: employee.email,
    newValue: `Checked out at ${new Date(serverTimeIso).toLocaleTimeString()} (Net Hours: ${(netWorkingMins / 60).toFixed(2)}h)`
  });

  return { ...attendanceRecord, ...updatedRecord };
}

// ==========================================
// BREAK MANAGEMENT
// ==========================================
export async function getAttendanceBreaks(attendanceId: string): Promise<AttendanceBreak[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "attendance_breaks"), where("attendanceId", "==", attendanceId))
    );
    const list: AttendanceBreak[] = [];
    snap.forEach(d => list.push(d.data() as AttendanceBreak));
    return list;
  } catch (err) {
    console.error("Error getting breaks:", err);
    return [];
  }
}

export async function startBreak(attendanceId: string, employeeId: string, reason?: string) {
  const breaks = await getAttendanceBreaks(attendanceId);
  const activeBreak = breaks.find(b => !b.breakEnd);
  if (activeBreak) {
    throw new Error("You are already on a break.");
  }

  const breakRef = doc(collection(db, "attendance_breaks"));
  const newBreak: AttendanceBreak = {
    breakId: breakRef.id,
    attendanceId,
    employeeId,
    breakStart: new Date().toISOString(),
    reason: reason || "Routine Break"
  };

  await setDoc(breakRef, newBreak);

  await createEmployeeAuditLog({
    employeeId,
    action: "BREAK_START",
    performedBy: auth.currentUser?.email || employeeId,
    newValue: `Started break at ${new Date().toLocaleTimeString()}`
  });

  return newBreak;
}

export async function endBreak(attendanceId: string, employeeId: string) {
  const breaks = await getAttendanceBreaks(attendanceId);
  const activeBreak = breaks.find(b => !b.breakEnd);
  if (!activeBreak) {
    throw new Error("No active break found to end.");
  }

  const nowIso = new Date().toISOString();
  const startMs = new Date(activeBreak.breakStart).getTime();
  const durationMins = Math.round((new Date(nowIso).getTime() - startMs) / (60 * 1000));

  await updateDoc(doc(db, "attendance_breaks", activeBreak.breakId), {
    breakEnd: nowIso,
    breakDurationMinutes: durationMins
  });

  await createEmployeeAuditLog({
    employeeId,
    action: "BREAK_END",
    performedBy: auth.currentUser?.email || employeeId,
    newValue: `Ended break (${durationMins} mins)`
  });

  return { ...activeBreak, breakEnd: nowIso, breakDurationMinutes: durationMins };
}

// ==========================================
// MISSED PUNCH & REGULARIZATION & LEAVES
// ==========================================
export async function submitRegularizationRequest(req: Omit<AttendanceRegularization, "requestId" | "status" | "createdAt">) {
  try {
    const ref = doc(collection(db, "attendance_regularization"));
    const payload: AttendanceRegularization = {
      ...req,
      requestId: ref.id,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    await setDoc(ref, payload);

    await createEmployeeAuditLog({
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      action: "REGULARIZATION_REQUEST",
      performedBy: req.employeeName,
      newValue: `Submitted regularization request for ${req.date}: ${req.reason}`
    });

    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "attendance_regularization");
  }
}

export async function getRegularizationRequests(employeeId?: string): Promise<AttendanceRegularization[]> {
  try {
    const colRef = collection(db, "attendance_regularization");
    const snap = employeeId 
      ? await getDocs(query(colRef, where("employeeId", "==", employeeId)))
      : await getDocs(colRef);
    const list: AttendanceRegularization[] = [];
    snap.forEach(d => list.push(d.data() as AttendanceRegularization));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error("Error getting regularization requests:", err);
    return [];
  }
}

export async function processRegularizationRequest(requestId: string, status: "approved" | "rejected", managerNotes?: string) {
  try {
    const docRef = doc(db, "attendance_regularization", requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Request not found");

    const reqData = snap.data() as AttendanceRegularization;
    await updateDoc(docRef, {
      status,
      managerNotes: managerNotes || "",
      reviewedBy: auth.currentUser?.email || "Manager",
      reviewedAt: new Date().toISOString()
    });

    // If approved, update or create the attendance record
    if (status === "approved" && reqData.employeeId && reqData.date) {
      const existing = await getTodayAttendance(reqData.employeeId, reqData.date);
      if (existing) {
        await updateDoc(doc(db, "attendance", existing.attendanceId), {
          status: reqData.requestedStatus || "Present",
          checkInTime: reqData.requestedCheckIn || existing.checkInTime,
          checkOutTime: reqData.requestedCheckOut || existing.checkOutTime,
          isLate: false,
          managerApprovalStatus: "approved",
          updatedAt: new Date().toISOString()
        });
      } else {
        const newAttId = `att_${reqData.employeeId}_${reqData.date}`;
        await setDoc(doc(db, "attendance", newAttId), {
          attendanceId: newAttId,
          employeeId: reqData.employeeId,
          employeeName: reqData.employeeName,
          date: reqData.date,
          checkInTime: reqData.requestedCheckIn || `${reqData.date}T09:30:00.000Z`,
          checkOutTime: reqData.requestedCheckOut || `${reqData.date}T18:30:00.000Z`,
          latitude: 0,
          longitude: 0,
          locationAccuracy: 0,
          geofenceStatus: "INSIDE_OFFICE",
          workMode: "Office",
          status: reqData.requestedStatus || "Present",
          isLate: false,
          lateMinutes: 0,
          earlyExitMinutes: 0,
          totalWorkingMinutes: 480,
          totalBreakMinutes: 0,
          netWorkingMinutes: 480,
          overtimeMinutes: 0,
          managerApprovalStatus: "approved",
          createdAt: new Date().toISOString()
        });
      }
    }

    await createEmployeeAuditLog({
      employeeId: reqData.employeeId,
      action: "MANAGER_APPROVAL",
      performedBy: auth.currentUser?.email || "Manager",
      newValue: `Regularization ${status.toUpperCase()} for ${reqData.date}`
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "attendance_regularization");
  }
}

// ==========================================
// LEAVE MANAGEMENT & BALANCES
// ==========================================
export async function getLeaveBalances(employeeId: string, year: number = new Date().getFullYear()): Promise<LeaveBalance[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "leave_balances"), where("employeeId", "==", employeeId))
    );
    const list: LeaveBalance[] = [];
    snap.forEach(d => {
      const data = d.data() as LeaveBalance;
      if (data.year === year) list.push(data);
    });

    if (list.length === 0) {
      // Seed default balances
      const defaultTypes: Array<{ type: LeaveType; earned: number }> = [
        { type: "Casual Leave", earned: 12 },
        { type: "Sick Leave", earned: 12 },
        { type: "Paid Leave", earned: 15 },
        { type: "Unpaid Leave", earned: 0 },
        { type: "Comp Off", earned: 0 }
      ];

      for (const item of defaultTypes) {
        const balId = `bal_${employeeId}_${year}_${item.type.replace(/\s+/g, "_")}`;
        const bal: LeaveBalance = {
          balanceId: balId,
          employeeId,
          year,
          leaveType: item.type,
          openingBalance: item.earned,
          earned: item.earned,
          used: 0,
          remaining: item.earned,
          carriedForward: 0,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "leave_balances", balId), bal);
        list.push(bal);
      }
    }

    return list;
  } catch (err) {
    console.error("Error getting leave balances:", err);
    return [];
  }
}

export async function submitLeaveRequest(leave: Omit<LeaveRequest, "leaveId" | "status" | "appliedAt">) {
  try {
    const ref = doc(collection(db, "leave_requests"));
    const payload: LeaveRequest = {
      ...leave,
      leaveId: ref.id,
      status: "pending",
      appliedAt: new Date().toISOString()
    };
    await setDoc(ref, payload);

    await createEmployeeAuditLog({
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      action: "LEAVE_APPROVAL",
      performedBy: leave.employeeName,
      newValue: `Applied for ${leave.leaveType} from ${leave.startDate} to ${leave.endDate}`
    });

    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "leave_requests");
  }
}

export async function getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
  try {
    const colRef = collection(db, "leave_requests");
    const snap = employeeId 
      ? await getDocs(query(colRef, where("employeeId", "==", employeeId)))
      : await getDocs(colRef);
    const list: LeaveRequest[] = [];
    snap.forEach(d => list.push(d.data() as LeaveRequest));
    return list.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  } catch (err) {
    console.error("Error getting leave requests:", err);
    return [];
  }
}

export async function processLeaveRequest(leaveId: string, status: "approved" | "rejected", managerNotes?: string) {
  try {
    const docRef = doc(db, "leave_requests", leaveId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Leave request not found");

    const leaveData = snap.data() as LeaveRequest;
    await updateDoc(docRef, {
      status,
      managerNotes: managerNotes || "",
      approvedBy: auth.currentUser?.email || "Manager",
      approvedAt: new Date().toISOString()
    });

    if (status === "approved") {
      // Deduct from balance
      const balances = await getLeaveBalances(leaveData.employeeId);
      const match = balances.find(b => b.leaveType === leaveData.leaveType);
      if (match) {
        const newUsed = match.used + leaveData.totalDays;
        const newRemaining = Math.max(0, match.earned - newUsed);
        await updateDoc(doc(db, "leave_balances", match.balanceId), {
          used: newUsed,
          remaining: newRemaining,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await createEmployeeAuditLog({
      employeeId: leaveData.employeeId,
      action: "LEAVE_APPROVAL",
      performedBy: auth.currentUser?.email || "Manager",
      newValue: `Leave ${status.toUpperCase()} (${leaveData.leaveType}, ${leaveData.totalDays} days)`
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "leave_requests");
  }
}

// ==========================================
// AUTOMATIC PAYROLL ENGINE
// ==========================================
export async function getSalaryStructures(): Promise<SalaryStructure[]> {
  try {
    const snap = await getDocs(collection(db, "salary_structures"));
    const list: SalaryStructure[] = [];
    snap.forEach(d => list.push(d.data() as SalaryStructure));
    if (list.length === 0) {
      await setDoc(doc(db, "salary_structures", DEFAULT_SALARY_STRUCTURE.structureId), DEFAULT_SALARY_STRUCTURE);
      return [DEFAULT_SALARY_STRUCTURE];
    }
    return list;
  } catch (err) {
    console.error("Error loading salary structures:", err);
    return [DEFAULT_SALARY_STRUCTURE];
  }
}

export async function calculateEmployeeMonthlyPayroll(
  employee: EmployeeProfile,
  month: number,
  year: number,
  structure: SalaryStructure = DEFAULT_SALARY_STRUCTURE,
  policy: PayrollPolicy = DEFAULT_PAYROLL_POLICY
): Promise<EmployeePayroll> {
  const monthYearString = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const calendarDays = new Date(year, month, 0).getDate();

  // Fetch month attendance records
  const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(calendarDays).padStart(2, "0")}`;

  const attSnap = await getDocs(
    query(
      collection(db, "attendance"),
      where("employeeId", "==", employee.employeeId),
      where("date", ">=", startDateStr),
      where("date", "<=", endDateStr)
    )
  );

  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let lateCount = 0;
  let wfhDays = 0;
  let fieldDays = 0;
  let approvedOvertimeMins = 0;

  attSnap.forEach(d => {
    const rec = d.data() as AttendanceRecord;
    if (rec.status === "Present") presentDays++;
    else if (rec.status === "Late") { presentDays++; lateCount++; }
    else if (rec.status === "Half Day") halfDays++;
    else if (rec.status === "Work From Home") { presentDays++; wfhDays++; }
    else if (rec.status === "Field Duty") { presentDays++; fieldDays++; }
    else if (rec.status === "Absent") absentDays++;

    if (rec.overtimeStatus === "overtimeApproved" && rec.overtimeMinutes) {
      approvedOvertimeMins += rec.overtimeMinutes;
    }
  });

  // Fetch approved leaves for month
  const leavesSnap = await getDocs(
    query(
      collection(db, "leave_requests"),
      where("employeeId", "==", employee.employeeId),
      where("status", "==", "approved")
    )
  );

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0; // LOP

  leavesSnap.forEach(d => {
    const l = d.data() as LeaveRequest;
    if (l.startDate >= startDateStr && l.startDate <= endDateStr) {
      if (l.leaveType === "Unpaid Leave") unpaidLeaveDays += l.totalDays;
      else paidLeaveDays += l.totalDays;
    }
  });

  // Half day LOP treatment
  if (policy.halfDayLopRule === "0.5_lop") {
    unpaidLeaveDays += halfDays * 0.5;
  } else if (policy.halfDayLopRule === "2_half_days_equal_1_lop") {
    unpaidLeaveDays += Math.floor(halfDays / 2);
  }

  // Divisor calculation
  let divisorDays = calendarDays;
  if (policy.payrollDivisorMethod === "fixed_30") divisorDays = 30;
  else if (policy.payrollDivisorMethod === "working_days") divisorDays = 26; // approx working days

  const grossSalary = employee.monthlySalary || 50000;
  const dailyRate = Math.round(grossSalary / divisorDays);

  // Components breakdown
  const basicPay = Math.round((grossSalary * structure.basicPercentage) / 100);
  const hraPay = Math.round((grossSalary * structure.hraPercentage) / 100);
  const conveyancePay = structure.conveyanceAllowance || 1600;
  const specialAllowancePay = Math.round((grossSalary * structure.specialAllowancePercentage) / 100);
  const otherAllowancesPay = structure.otherAllowanceFixed || 2000;

  // Overtime pay
  const overtimeHours = Number((approvedOvertimeMins / 60).toFixed(1));
  const hourlyRate = dailyRate / 8;
  const overtimePay = Math.round(overtimeHours * hourlyRate * (policy.overtimePayRateMultiplier || 1.25));

  // Deductions
  const lopDeductionAmount = Math.round(dailyRate * unpaidLeaveDays);
  const pfDeduction = Math.round((basicPay * structure.pfPercentage) / 100);
  const esiDeduction = grossSalary <= 21000 ? Math.round((grossSalary * structure.esiPercentage) / 100) : 0;
  const professionalTax = structure.professionalTaxFixed || 200;
  const tdsDeduction = Math.round((grossSalary * structure.tdsPercentage) / 100);

  // Advances / Loan recovery check
  let advanceLoanDeduction = 0;
  const advSnap = await getDocs(
    query(
      collection(db, "employee_advances"),
      where("employeeId", "==", employee.employeeId),
      where("status", "==", "active")
    )
  );

  advSnap.forEach(d => {
    const adv = d.data() as EmployeeAdvance;
    advanceLoanDeduction += Math.min(adv.remainingBalance, adv.monthlyInstallment);
  });

  const totalDeductions = lopDeductionAmount + pfDeduction + esiDeduction + professionalTax + tdsDeduction + advanceLoanDeduction;
  const netSalary = Math.max(0, grossSalary + overtimePay - totalDeductions);

  const payrollId = `pay_${employee.employeeId}_${year}_${String(month).padStart(2, "0")}`;

  return {
    payrollId,
    runId: `run_${year}_${String(month).padStart(2, "0")}`,
    employeeId: employee.employeeId,
    employeeName: employee.fullName,
    email: employee.email,
    department: employee.department,
    designation: employee.designation,
    role: employee.role,
    month,
    year,
    monthYearString,
    calendarDays,
    workingDays: divisorDays,
    presentDays,
    absentDays,
    halfDays,
    paidLeaveDays,
    unpaidLeaveDays,
    lateCount,
    wfhDays,
    fieldDays,
    approvedOvertimeHours: overtimeHours,
    monthlyGrossSalary: grossSalary,
    dailySalaryRate: dailyRate,
    basicPay,
    hraPay,
    conveyancePay,
    specialAllowancePay,
    otherAllowancesPay,
    overtimePay,
    lopDeductionAmount,
    pfDeduction,
    esiDeduction,
    professionalTax,
    tdsDeduction,
    advanceLoanDeduction,
    otherDeductions: 0,
    totalDeductions,
    netSalary,
    paymentStatus: "pending",
    createdAt: new Date().toISOString()
  };
}

export async function generatePayrollRun(month: number, year: number): Promise<PayrollRun> {
  const monthYearString = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const runId = `run_${year}_${String(month).padStart(2, "0")}`;

  const employees = await getEmployeeProfiles();
  const activeEmps = employees.filter(e => e.status !== "Terminated");

  if (activeEmps.length === 0) {
    throw new Error("No active internal employees found for payroll processing.");
  }

  const structures = await getSalaryStructures();
  const defaultStruct = structures[0] || DEFAULT_SALARY_STRUCTURE;

  let totalGross = 0;
  let totalLop = 0;
  let totalNet = 0;

  for (const emp of activeEmps) {
    const item = await calculateEmployeeMonthlyPayroll(emp, month, year, defaultStruct, DEFAULT_PAYROLL_POLICY);
    item.runId = runId;
    await setDoc(doc(db, "employee_payroll", item.payrollId), item);

    totalGross += item.monthlyGrossSalary;
    totalLop += item.lopDeductionAmount;
    totalNet += item.netSalary;
  }

  const runRecord: PayrollRun = {
    runId,
    month,
    year,
    monthYearString,
    totalEmployees: activeEmps.length,
    totalGrossSalary: totalGross,
    totalLopDeductions: totalLop,
    totalNetSalary: totalNet,
    status: "draft",
    generatedAt: new Date().toISOString(),
    generatedBy: auth.currentUser?.email || "Admin"
  };

  await setDoc(doc(db, "payroll_runs", runId), runRecord);

  await createEmployeeAuditLog({
    action: "PAYROLL_GENERATED",
    performedBy: auth.currentUser?.email || "Admin",
    newValue: `Generated draft payroll run for ${monthYearString} (${activeEmps.length} employees, Net ₹${totalNet.toLocaleString("en-IN")})`
  });

  return runRecord;
}

export async function approvePayrollRun(runId: string) {
  const docRef = doc(db, "payroll_runs", runId);
  await updateDoc(docRef, {
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy: auth.currentUser?.email || "Finance Admin"
  });

  await createEmployeeAuditLog({
    action: "PAYROLL_APPROVED",
    performedBy: auth.currentUser?.email || "Finance Admin",
    newValue: `Approved and locked payroll run ${runId}`
  });
}

export async function markSalaryPaid(payrollId: string, details: {
  paymentMethod: string;
  bankReference: string;
  utrReference: string;
}) {
  const docRef = doc(db, "employee_payroll", payrollId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Payroll record not found");

  const data = snap.data() as EmployeePayroll;
  const nowIso = new Date().toISOString();

  await updateDoc(docRef, {
    paymentStatus: "paid",
    paymentMethod: details.paymentMethod,
    bankReference: details.bankReference,
    utrReference: details.utrReference,
    paymentDate: nowIso,
    processedBy: auth.currentUser?.email || "Finance Officer"
  });

  // Deduct advance balance if applicable
  if (data.advanceLoanDeduction > 0) {
    const advSnap = await getDocs(
      query(collection(db, "employee_advances"), where("employeeId", "==", data.employeeId), where("status", "==", "active"))
    );
    advSnap.forEach(async (d) => {
      const adv = d.data() as EmployeeAdvance;
      const newBal = Math.max(0, adv.remainingBalance - data.advanceLoanDeduction);
      await updateDoc(doc(db, "employee_advances", adv.advanceId), {
        remainingBalance: newBal,
        status: newBal === 0 ? "cleared" : "active"
      });
    });
  }

  await createEmployeeAuditLog({
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    action: "SALARY_PAID",
    performedBy: auth.currentUser?.email || "Finance Officer",
    newValue: `Marked salary PAID for ${data.monthYearString} (Net ₹${data.netSalary.toLocaleString("en-IN")}, UTR: ${details.utrReference})`
  });
}

export async function getEmployeePayrollHistory(employeeId: string): Promise<EmployeePayroll[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "employee_payroll"), where("employeeId", "==", employeeId))
    );
    const list: EmployeePayroll[] = [];
    snap.forEach(d => list.push(d.data() as EmployeePayroll));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error("Error fetching employee payroll history:", err);
    return [];
  }
}

export async function getPayrollRuns(): Promise<PayrollRun[]> {
  try {
    const snap = await getDocs(collection(db, "payroll_runs"));
    const list: PayrollRun[] = [];
    snap.forEach(d => list.push(d.data() as PayrollRun));
    return list.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  } catch (err) {
    console.error("Error fetching payroll runs:", err);
    return [];
  }
}

export async function getEmployeePayrollsByRun(runId: string): Promise<EmployeePayroll[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "employee_payroll"), where("runId", "==", runId))
    );
    const list: EmployeePayroll[] = [];
    snap.forEach(d => list.push(d.data() as EmployeePayroll));
    return list;
  } catch (err) {
    console.error("Error fetching payroll run items:", err);
    return [];
  }
}
