import { 
  GeofenceStatus, 
  AttendanceStatus, 
  OvertimeStatus, 
  ApprovalStatus, 
  LeaveType, 
  WorkMode,
  PaymentStatus,
  PayrollStatus
} from "./employeeTypes";

export interface AttendanceRecord {
  attendanceId: string;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | any; // ISO string or FieldValue
  checkOutTime?: string | any; // ISO string or FieldValue
  latitude: number;
  longitude: number;
  locationAccuracy: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  geofenceStatus: GeofenceStatus;
  distanceFromOfficeMeters?: number;
  officeLocationId?: string;
  officeLocationName?: string;
  workMode: WorkMode;
  status: AttendanceStatus;
  isLate: boolean;
  lateMinutes: number;
  earlyExitMinutes: number;
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  netWorkingMinutes: number;
  overtimeMinutes: number;
  overtimeStatus?: OvertimeStatus;
  deviceId?: string;
  browser?: string;
  userAgent?: string;
  ipAddress?: string;
  antiFraudFlags?: string[];
  managerApprovalStatus?: ApprovalStatus;
  managerNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export interface ShiftDefinition {
  shiftId: string;
  shiftName: string;
  startTime: string; // HH:mm format (e.g. "09:30")
  endTime: string;   // HH:mm format (e.g. "18:30")
  graceMinutes: number;
  minimumHalfDayMinutes: number;
  minimumFullDayMinutes: number;
  weeklyOffDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isActive?: boolean;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export interface LeaveRequest {
  leaveId: string;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalDays: number;
  isHalfDay?: boolean;
  halfDaySession?: "first_half" | "second_half";
  reason: string;
  status: ApprovalStatus;
  managerNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  appliedAt: string | any;
}

export interface PayrollSnapshot {
  payrollId: string;
  runId: string;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  email: string;
  department: string;
  designation: string;
  role: string;
  month: number;
  year: number;
  monthYearString: string;
  
  // Real-time compliance snapshot
  calendarDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number; // LOP days
  lateCount: number;
  wfhDays: number;
  fieldDays: number;
  approvedOvertimeHours: number;
  
  // Financial breakdown
  monthlyGrossSalary: number;
  dailySalaryRate: number;
  basicPay: number;
  hraPay: number;
  conveyancePay: number;
  specialAllowancePay: number;
  otherAllowancesPay: number;
  overtimePay: number;
  
  // Deductions
  lopDeductionAmount: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  tdsDeduction: number;
  advanceLoanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  netSalary: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  bankReference?: string;
  utrReference?: string;
  paymentDate?: string;
  processedBy?: string;
  
  createdAt: string | any;
  updatedAt?: string | any;
}
