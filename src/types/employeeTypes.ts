export type EmployeeRole = 
  | "HR" 
  | "Recruitment Executive" 
  | "Operations" 
  | "Support" 
  | "Accounts" 
  | "Sales" 
  | "Manager" 
  | "Team Leader" 
  | "Software Engineer"
  | "Other";

export type EmploymentType = "Full-Time" | "Part-Time" | "Contract" | "Intern";
export type WorkMode = "Office" | "Work From Home" | "Field Work" | "Client Visit";
export type EmployeeStatus = "Active" | "On Leave" | "Inactive" | "Terminated";
export type GeofenceStatus = "INSIDE_OFFICE" | "OUTSIDE_OFFICE" | "REMOTE" | "FIELD_VISIT";
export type AttendanceStatus = "Present" | "Absent" | "Half Day" | "Late" | "On Leave" | "Weekly Off" | "Holiday" | "Work From Home" | "Field Duty";
export type OvertimeStatus = "overtimePending" | "overtimeApproved" | "overtimeRejected";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "request_explanation";
export type LeaveType = "Casual Leave" | "Sick Leave" | "Paid Leave" | "Unpaid Leave" | "Comp Off" | "Optional Holiday";
export type PayrollStatus = "draft" | "calculated" | "reviewed" | "approved" | "paid" | "locked";
export type PaymentStatus = "pending" | "processing" | "paid" | "failed";

export interface EmployeeProfile {
  employeeId: string;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: EmployeeRole;
  managerId?: string;
  managerName?: string;
  joiningDate: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  officeLocationId?: string;
  monthlySalary: number;
  salaryStructureId?: string;
  shiftId: string;
  status: EmployeeStatus;
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    panNumber: string;
    pfAccount?: string;
    esiAccount?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficeLocation {
  officeLocationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface ShiftConfig {
  shiftId: string;
  shiftName: string;
  startTime: string; // HH:mm format (e.g., "09:30")
  endTime: string;   // HH:mm format (e.g., "18:30")
  graceMinutes: number; // e.g. 15
  minimumHalfDayMinutes: number; // e.g. 240 (4 hours)
  minimumFullDayMinutes: number; // e.g. 480 (8 hours)
  weeklyOffDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isActive?: boolean;
  createdAt?: string;
}

export interface AttendanceBreak {
  breakId: string;
  attendanceId: string;
  employeeId: string;
  breakStart: string; // ISO timestamp
  breakEnd?: string;   // ISO timestamp
  breakDurationMinutes?: number;
  reason?: string;
}

export interface AttendanceRecord {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
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
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRegularization {
  requestId: string;
  employeeId: string;
  employeeName: string;
  attendanceId?: string;
  date: string; // YYYY-MM-DD
  type: "missed_checkin" | "missed_checkout" | "time_correction" | "status_correction";
  currentStatus: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: AttendanceStatus;
  reason: string;
  attachmentUrl?: string;
  status: ApprovalStatus;
  managerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LeaveRequest {
  leaveId: string;
  employeeId: string;
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
  appliedAt: string;
}

export interface LeaveBalance {
  balanceId: string;
  employeeId: string;
  year: number;
  leaveType: LeaveType;
  openingBalance: number;
  earned: number;
  used: number;
  remaining: number;
  carriedForward: number;
  updatedAt: string;
}

export interface HolidayItem {
  holidayId: string;
  date: string; // YYYY-MM-DD
  holidayName: string;
  location?: string;
  isMandatory: boolean; // true = mandatory, false = optional
  year: number;
}

export interface SalaryStructure {
  structureId: string;
  structureName: string;
  basicPercentage: number; // e.g. 50%
  hraPercentage: number;   // e.g. 20%
  conveyanceAllowance: number;
  specialAllowancePercentage: number;
  otherAllowanceFixed: number;
  
  // Deductions
  pfPercentage: number;      // e.g. 12%
  esiPercentage: number;     // e.g. 0.75%
  professionalTaxFixed: number; // e.g. 200
  tdsPercentage: number;     // e.g. 5%
  
  isDefault?: boolean;
  createdAt?: string;
}

export interface PayrollPolicy {
  payrollDivisorMethod: "calendar_days" | "working_days" | "fixed_30";
  fixedDivisorDays: number; // e.g. 30
  halfDayLopRule: "0.5_lop" | "2_half_days_equal_1_lop" | "no_lop";
  lateDeductionPolicy: "3_lates_equal_half_day_lop" | "none" | "custom";
  overtimePayRateMultiplier: number; // e.g. 1.25 or 1.5
}

export interface PayrollRun {
  runId: string;
  month: number; // 1-12
  year: number;  // YYYY
  monthYearString: string; // e.g. "August 2026"
  totalEmployees: number;
  totalGrossSalary: number;
  totalLopDeductions: number;
  totalNetSalary: number;
  status: PayrollStatus;
  generatedAt: string;
  generatedBy: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
}

export interface EmployeePayroll {
  payrollId: string;
  runId: string;
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  designation: string;
  role: string;
  month: number;
  year: number;
  monthYearString: string;
  
  // Attendance Summary Snapshot
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
  
  // Salary Breakdown
  monthlyGrossSalary: number;
  dailySalaryRate: number;
  basicPay: number;
  hraPay: number;
  conveyancePay: number;
  specialAllowancePay: number;
  otherAllowancesPay: number;
  overtimePay: number;
  
  // Deductions Breakdown
  lopDeductionAmount: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  tdsDeduction: number;
  advanceLoanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  netSalary: number;
  
  // Payment Status
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  bankReference?: string;
  utrReference?: string;
  paymentDate?: string;
  processedBy?: string;
  
  createdAt: string;
  updatedAt?: string;
}

export interface SalaryRevision {
  revisionId: string;
  employeeId: string;
  employeeName: string;
  effectiveFrom: string; // YYYY-MM-DD
  oldSalary: number;
  newSalary: number;
  reason: string;
  approvedBy: string;
  createdAt: string;
}

export interface EmployeeAdvance {
  advanceId: string;
  employeeId: string;
  employeeName: string;
  principalAmount: number;
  monthlyInstallment: number;
  remainingBalance: number;
  reason: string;
  status: "active" | "cleared" | "rejected";
  approvedBy: string;
  grantedAt: string;
}

export interface EmployeeAuditLog {
  logId: string;
  employeeId?: string;
  employeeName?: string;
  action: 
    | "CHECK_IN" 
    | "CHECK_OUT" 
    | "BREAK_START" 
    | "BREAK_END" 
    | "MISSED_PUNCH_REQUEST" 
    | "REGULARIZATION_REQUEST" 
    | "MANUAL_CORRECTION" 
    | "MANAGER_APPROVAL" 
    | "LEAVE_APPROVAL" 
    | "PAYROLL_GENERATED" 
    | "PAYROLL_APPROVED" 
    | "SALARY_PAID"
    | "SALARY_REVISED";
  performedBy: string; // User email or UID
  performedByName?: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  ipAddress?: string;
}
