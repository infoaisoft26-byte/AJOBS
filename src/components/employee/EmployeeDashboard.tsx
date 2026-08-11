import React, { useEffect, useState } from "react";
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Coffee, 
  Calendar, 
  FileText, 
  User, 
  LogOut, 
  RefreshCw, 
  Send, 
  ShieldCheck, 
  Award, 
  Briefcase, 
  Building,
  Plus,
  DollarSign,
  ChevronRight,
  Eye,
  Shield,
  Navigation,
  Download
} from "lucide-react";
import { AttendanceHistory } from "./AttendanceHistory";
import { LeaveRequestModal } from "./LeaveRequestModal";
import { generateAttendancePayrollPDF } from "../../utils/generateAttendancePayrollPDF";
import { auth } from "../../firebase";
import { 
  AttendanceRecord, 
  EmployeePayroll, 
  EmployeeProfile, 
  HolidayItem, 
  LeaveBalance, 
  LeaveRequest, 
  OfficeLocation, 
  ShiftConfig, 
  WorkMode,
  AttendanceRegularization
} from "../../types/employeeTypes";
import { 
  endBreak, 
  getAttendanceBreaks, 
  getEmployeeByUid, 
  getEmployeePayrollHistory, 
  getHolidays, 
  getLeaveBalances, 
  getLeaveRequests, 
  getOfficeLocations, 
  getRegularizationRequests, 
  getShifts, 
  saveEmployeeProfile, 
  startBreak, 
  submitLeaveRequest, 
  submitRegularizationRequest,
  DEFAULT_OFFICE_LOCATION,
  DEFAULT_SHIFT
} from "../../services/employeeService";
import { EmployeeAttendanceService } from "../../services/EmployeeAttendanceService";
import { useGeolocationAuthorization } from "../../hooks/useGeolocationAuthorization";
import PayslipModal from "./PayslipModal";

interface EmployeeDashboardProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export default function EmployeeDashboard({ userId, userName, userEmail, onLogout }: EmployeeDashboardProps) {
  const currentUid = userId || auth.currentUser?.uid || "";
  const currentEmail = userEmail || auth.currentUser?.email || "employee@aijobs.com";
  const currentName = userName || auth.currentUser?.displayName || "Employee";

  const [activeTab, setActiveTab] = useState<"punch" | "logs" | "leaves" | "regularization" | "payslips">("punch");
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [isOnBreak, setIsOnBreak] = useState(false);
  
  // Geolocation state
  const [selectedWorkMode, setSelectedWorkMode] = useState<WorkMode>("Office");

  // Live timer state
  const [liveWorkedSeconds, setLiveWorkedSeconds] = useState(0);

  // Leave & Regularization & Payslip states
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [payrolls, setPayrolls] = useState<EmployeePayroll[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<EmployeePayroll | null>(null);

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  
  // Forms
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual Leave" as any,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: ""
  });

  const [regForm, setRegForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "missed_checkin" as any,
    requestedCheckIn: "09:30",
    requestedCheckOut: "18:30",
    reason: ""
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Fetch or initialize Employee Profile
  useEffect(() => {
    async function initEmployeeData() {
      setLoading(true);
      try {
        let emp = await getEmployeeByUid(currentUid);
        if (!emp) {
          // Auto-initialize employee profile if logged in user has internal employee role
          const newEmp: EmployeeProfile = {
            employeeId: `EMP${Math.floor(1000 + Math.random() * 9000)}`,
            uid: currentUid,
            fullName: currentName,
            email: currentEmail,
            phone: "+91 98765 43210",
            department: "Engineering",
            designation: "Software Engineer",
            role: "Software Engineer",
            joiningDate: new Date().toISOString().split("T")[0],
            employmentType: "Full-Time",
            workMode: "Office",
            monthlySalary: 65000,
            shiftId: DEFAULT_SHIFT.shiftId,
            status: "Active"
          };
          emp = await saveEmployeeProfile(newEmp);
        }
        setEmployee(emp);
        if (emp.workMode) setSelectedWorkMode(emp.workMode);

        // Fetch configs
        const [offList, shfList, hols] = await Promise.all([
          getOfficeLocations(),
          getShifts(),
          getHolidays()
        ]);
        setOffices(offList);
        setShifts(shfList);
        setHolidays(hols);

        // Fetch today's record
        if (emp?.employeeId) {
          await refreshTodayData(emp.employeeId);
          await refreshSecondaryData(emp.employeeId);
        }
      } catch (err: any) {
        console.error("Employee init error:", err);
        setMessage({ type: "error", text: "Failed to load employee profile context." });
      } finally {
        setLoading(false);
      }
    }

    if (currentUid) {
      initEmployeeData();
    }
  }, [currentUid]);

  // Geolocation Authorization Hook
  const {
    coords: geoCoords,
    error: geoHookError,
    status: geoHookStatus,
    showExplanationModal,
    requestLocationWithExplanation,
    confirmAndRequestLocation,
    cancelExplanation
  } = useGeolocationAuthorization();

  const refreshTodayData = async (empId: string) => {
    const todayRec = await EmployeeAttendanceService.getTodayAttendance(empId);
    setTodayAttendance(todayRec);
    if (todayRec) {
      const brks = await getAttendanceBreaks(todayRec.attendanceId);
      setBreaks(brks);
      const active = brks.find(b => !b.breakEnd);
      setIsOnBreak(!!active);
    }
  };

  const refreshSecondaryData = async (empId: string) => {
    const [bals, reqs, regs, pays] = await Promise.all([
      getLeaveBalances(empId),
      getLeaveRequests(empId),
      getRegularizationRequests(empId),
      getEmployeePayrollHistory(empId)
    ]);
    setLeaveBalances(bals);
    setLeaveRequests(reqs);
    setRegularizations(regs);
    setPayrolls(pays);
  };

  // Live work duration counter
  useEffect(() => {
    if (!todayAttendance || !todayAttendance.checkInTime || todayAttendance.checkOutTime) {
      return;
    }

    const interval = setInterval(() => {
      const checkInMs = new Date(todayAttendance.checkInTime).getTime();
      const nowMs = Date.now();
      const elapsedSecs = Math.max(0, Math.floor((nowMs - checkInMs) / 1000));
      setLiveWorkedSeconds(elapsedSecs);
    }, 1000);

    return () => clearInterval(interval);
  }, [todayAttendance]);

  // Actions
  const handleCheckIn = async () => {
    if (!employee) return;
    if (!geoCoords) {
      requestLocationWithExplanation();
      setMessage({ type: "info", text: "Please authorize location access to verify your attendance position." });
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const rec = await EmployeeAttendanceService.checkIn({
        employeeId: employee.employeeId,
        employeeName: employee.fullName,
        employeeUid: currentUid,
        latitude: geoCoords.lat,
        longitude: geoCoords.lng,
        accuracy: geoCoords.accuracy,
        workMode: selectedWorkMode,
        officeLocationId: employee.officeLocationId
      });
      setTodayAttendance(rec);
      setMessage({ 
        type: "success", 
        text: `Check-in recorded successfully (${rec.status}) at ${new Date(rec.checkInTime).toLocaleTimeString()}. Geofence: ${rec.geofenceStatus}` 
      });
      await refreshSecondaryData(employee.employeeId);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to check in." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employee || !todayAttendance) return;
    if (!geoCoords) {
      requestLocationWithExplanation();
      setMessage({ type: "info", text: "Please authorize location access to verify check-out location." });
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const updated = await EmployeeAttendanceService.checkOut({
        employeeId: employee.employeeId,
        employeeName: employee.fullName,
        latitude: geoCoords.lat,
        longitude: geoCoords.lng
      });
      setTodayAttendance(updated);
      setMessage({ 
        type: "success", 
        text: `Check-out recorded successfully at ${new Date(updated.checkOutTime!).toLocaleTimeString()}` 
      });
      await refreshSecondaryData(employee.employeeId);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Check-out failed." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBreak = async () => {
    if (!employee || !todayAttendance) return;
    setActionLoading(true);
    try {
      if (isOnBreak) {
        await endBreak(todayAttendance.attendanceId, employee.employeeId);
        setIsOnBreak(false);
        setMessage({ type: "success", text: "Break ended. Resumed work timer." });
      } else {
        await startBreak(todayAttendance.attendanceId, employee.employeeId, "Routine Break");
        setIsOnBreak(true);
        setMessage({ type: "info", text: "Break started. Timer paused." });
      }
      await refreshTodayData(employee.employeeId);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Break operation failed." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportSummaryPDF = async () => {
    if (!employee) return;
    try {
      setActionLoading(true);
      const currentMonthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const records = await EmployeeAttendanceService.getAttendanceHistory(employee.employeeId, 31);
      const latestPayroll = payrolls.length > 0 ? payrolls[0] : null;

      generateAttendancePayrollPDF({
        employee,
        monthName: currentMonthName,
        attendanceRecords: records,
        payrollSnapshot: latestPayroll
      });

      setMessage({ type: "success", text: `Successfully generated and downloaded ${currentMonthName} summary report PDF.` });
    } catch (err: any) {
      console.error("Error exporting PDF report:", err);
      setMessage({ type: "error", text: "Failed to generate PDF report." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setActionLoading(true);
    try {
      await submitRegularizationRequest({
        employeeId: employee.employeeId,
        employeeName: employee.fullName,
        date: regForm.date,
        type: regForm.type,
        currentStatus: "Absent",
        requestedCheckIn: `${regForm.date}T${regForm.requestedCheckIn}:00.000Z`,
        requestedCheckOut: `${regForm.date}T${regForm.requestedCheckOut}:00.000Z`,
        requestedStatus: "Present",
        reason: regForm.reason
      });

      setShowRegModal(false);
      setMessage({ type: "success", text: "Attendance regularization request submitted successfully." });
      await refreshSecondaryData(employee.employeeId);
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to submit regularization request." });
    } finally {
      setActionLoading(false);
    }
  };

  const formatSecondsToHms = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] text-white font-mono">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Authenticating Employee Portal & Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col font-sans">
      {/* Employee Workspace Header */}
      <header className="bg-gradient-to-r from-gray-950 via-indigo-950/40 to-gray-950 border-b border-indigo-500/20 px-4 sm:px-8 py-4 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <User className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">{employee?.fullName || currentName}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  {employee?.employeeId || "EMP"}
                </span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span>{employee?.designation}</span> • <span className="text-indigo-300">{employee?.department}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportSummaryPDF}
              disabled={actionLoading || !employee}
              className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Generate & Download Monthly Attendance & Payroll Summary PDF"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" /> Export Summary PDF
            </button>
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Internal Employee
            </span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-gray-800 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-400" /> Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner Alert Messages */}
        {message && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-medium animate-fadeIn ${
            message.type === "success" 
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200" 
              : message.type === "error" 
              ? "bg-rose-950/40 border-rose-500/30 text-rose-200" 
              : "bg-indigo-950/40 border-indigo-500/30 text-indigo-200"
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{message.text}</div>
            <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-white cursor-pointer">×</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-800 scrollbar-none">
          <button
            onClick={() => setActiveTab("punch")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "punch"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Clock className="w-4 h-4" /> Attendance Clock
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "logs"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Calendar className="w-4 h-4" /> Attendance Logs
          </button>
          <button
            onClick={() => setActiveTab("leaves")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "leaves"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Leave Management
          </button>
          <button
            onClick={() => setActiveTab("regularization")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "regularization"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Send className="w-4 h-4" /> Regularization
          </button>
          <button
            onClick={() => setActiveTab("payslips")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "payslips"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <DollarSign className="w-4 h-4" /> Payslips & Salary
          </button>
        </div>

        {/* TAB 1: ATTENDANCE CLOCK & TODAY STATUS */}
        {activeTab === "punch" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clock Card */}
            <div className="lg:col-span-2 p-6 bg-gray-900/80 border border-gray-800 rounded-2xl shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-400" /> Today's Attendance
                  </h2>
                  <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  todayAttendance?.status === "Present" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                  todayAttendance?.status === "Late" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                  todayAttendance?.status === "Half Day" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                  "bg-gray-800 text-gray-400 border border-gray-700"
                }`}>
                  {todayAttendance?.status || "Not Checked In"}
                </span>
              </div>

              {/* Working Hours Display */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-gray-950 via-indigo-950/30 to-gray-950 border border-indigo-500/20 text-center space-y-2">
                <span className="text-xs text-indigo-300 font-mono uppercase tracking-widest">Active Shift Hours</span>
                <div className="text-4xl font-black font-mono text-white tracking-widest">
                  {todayAttendance?.checkInTime && !todayAttendance.checkOutTime 
                    ? formatSecondsToHms(liveWorkedSeconds) 
                    : todayAttendance?.checkOutTime 
                    ? `${(todayAttendance.netWorkingMinutes / 60).toFixed(2)} hrs` 
                    : "00:00:00"}
                </div>
                {todayAttendance?.checkInTime && (
                  <p className="text-xs text-gray-400">
                    Checked in at <strong className="text-white">{new Date(todayAttendance.checkInTime).toLocaleTimeString()}</strong>
                    {todayAttendance.checkOutTime && <> • Checked out at <strong className="text-white">{new Date(todayAttendance.checkOutTime).toLocaleTimeString()}</strong></>}
                  </p>
                )}
              </div>

              {/* Work Mode Selection & Geolocation Notice */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-300 block">Select Work Mode for Today</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["Office", "Work From Home", "Field Work", "Client Visit"] as WorkMode[]).map((mode) => (
                    <button
                      key={mode}
                      disabled={!!todayAttendance?.checkInTime}
                      onClick={() => setSelectedWorkMode(mode)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        selectedWorkMode === mode
                          ? "bg-indigo-600/30 border-indigo-500 text-white"
                          : "bg-gray-800/40 border-gray-800 text-gray-400 hover:bg-gray-800"
                      } ${todayAttendance?.checkInTime ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span>
                      {geoCoords 
                        ? `GPS Verified (Lat: ${geoCoords.lat.toFixed(4)}, Lng: ${geoCoords.lng.toFixed(4)}) - Acc: ±${Math.round(geoCoords.accuracy)}m` 
                        : "GPS Location Authorization Required"}
                    </span>
                  </div>
                  <button 
                    onClick={requestLocationWithExplanation} 
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" /> {geoCoords ? "Update Location" : "Authorize Location"}
                  </button>
                </div>
                {geoHookError && <p className="text-xs text-rose-400 font-medium">{geoHookError}</p>}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  disabled={actionLoading || !!todayAttendance?.checkInTime}
                  onClick={handleCheckIn}
                  className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !todayAttendance?.checkInTime
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                      : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> Check-In Now
                </button>

                <button
                  disabled={actionLoading || !todayAttendance?.checkInTime || !!todayAttendance?.checkOutTime}
                  onClick={handleToggleBreak}
                  className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    todayAttendance?.checkInTime && !todayAttendance?.checkOutTime
                      ? isOnBreak 
                        ? "bg-amber-600 hover:bg-amber-500 text-white" 
                        : "bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/30"
                      : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                  }`}
                >
                  <Coffee className="w-4 h-4" /> {isOnBreak ? "End Break" : "Take Break"}
                </button>

                <button
                  disabled={actionLoading || !todayAttendance?.checkInTime || !!todayAttendance?.checkOutTime}
                  onClick={handleCheckOut}
                  className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    todayAttendance?.checkInTime && !todayAttendance?.checkOutTime
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
                      : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Check-Out Now
                </button>
              </div>
            </div>

            {/* Sidebar Shift Info & Leave Balances Summary */}
            <div className="space-y-6">
              {/* Shift Details Card */}
              <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-400" /> My Assigned Shift
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">Shift Name:</span>
                    <strong className="text-white">General Shift</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">Timing:</span>
                    <strong className="text-indigo-300">09:30 AM - 06:30 PM</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">Grace Minutes:</span>
                    <strong className="text-emerald-400">15 Mins</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Office HQ:</span>
                    <strong className="text-gray-300 text-right">AIJobs Tech Park, BLR</strong>
                  </div>
                </div>
              </div>

              {/* Leave Balances Quick Box */}
              <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" /> Leave Balances
                  </h3>
                  <button onClick={() => setActiveTab("leaves")} className="text-xs text-indigo-400 hover:underline cursor-pointer">
                    Apply Leave
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {leaveBalances.map((bal) => (
                    <div key={bal.balanceId} className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                      <span className="text-gray-400 block text-[10px]">{bal.leaveType}</span>
                      <span className="text-white font-bold text-sm">{bal.remaining} / {bal.earned}</span>
                      <span className="text-[10px] text-gray-500 block">Days Left</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATTENDANCE LOGS HISTORY */}
        {activeTab === "logs" && (
          <AttendanceHistory employeeId={employee?.employeeId || ""} />
        )}

        {/* TAB 3: LEAVE MANAGEMENT */}
        {activeTab === "leaves" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white">Leave Balances & Applications</h2>
                <p className="text-xs text-gray-400">Request leave approval, view leave history, and check annual holidays.</p>
              </div>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Apply For Leave
              </button>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {leaveBalances.map((bal) => (
                <div key={bal.balanceId} className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1">
                  <span className="text-xs text-gray-400 block font-medium">{bal.leaveType}</span>
                  <div className="text-xl font-black text-white font-mono">{bal.remaining} <span className="text-xs font-normal text-gray-500">/ {bal.earned} Days</span></div>
                  <p className="text-[10px] text-indigo-300 font-mono">Used: {bal.used} days</p>
                </div>
              ))}
            </div>

            {/* Leave Requests Table */}
            <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">My Leave Requests</h3>
              {leaveRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                      <tr>
                        <th className="p-3">Leave Type</th>
                        <th className="p-3">Dates</th>
                        <th className="p-3">Days</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {leaveRequests.map((req) => (
                        <tr key={req.leaveId} className="hover:bg-gray-800/40">
                          <td className="p-3 font-bold text-white">{req.leaveType}</td>
                          <td className="p-3 font-mono">{req.startDate} to {req.endDate}</td>
                          <td className="p-3 font-mono">{req.totalDays}</td>
                          <td className="p-3 text-gray-400 max-w-xs truncate">{req.reason}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              req.status === "approved" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                              req.status === "rejected" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                              "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            }`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">No leave applications submitted yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REGULARIZATION & MISSED PUNCH */}
        {activeTab === "regularization" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white">Attendance Regularization & Missed Punches</h2>
                <p className="text-xs text-gray-400">Submit attendance corrections or missed check-in/out requests to manager.</p>
              </div>
              <button
                onClick={() => setShowRegModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Request Regularization
              </button>
            </div>

            <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Regularization History</h3>
              {regularizations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {regularizations.map((reg) => (
                        <tr key={reg.requestId} className="hover:bg-gray-800/40">
                          <td className="p-3 font-bold font-mono text-white">{reg.date}</td>
                          <td className="p-3 uppercase text-indigo-300">{reg.type.replace("_", " ")}</td>
                          <td className="p-3 text-gray-400">{reg.reason}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              reg.status === "approved" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                              reg.status === "rejected" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                              "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">No regularization requests found.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PAYSLIPS & SALARY HISTORY */}
        {activeTab === "payslips" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Salary Statements & Payslips</h2>
              <p className="text-xs text-gray-400">Access and download verified monthly payslips issued by AIJobs Payroll.</p>
            </div>

            <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4">
              {payrolls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                      <tr>
                        <th className="p-3">Month / Year</th>
                        <th className="p-3">Gross Pay</th>
                        <th className="p-3">LOP Deductions</th>
                        <th className="p-3">Net Salary</th>
                        <th className="p-3">Payment Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {payrolls.map((pay) => (
                        <tr key={pay.payrollId} className="hover:bg-gray-800/40">
                          <td className="p-3 font-bold text-white">{pay.monthYearString}</td>
                          <td className="p-3 font-mono">₹{pay.monthlyGrossSalary.toLocaleString("en-IN")}</td>
                          <td className="p-3 font-mono text-rose-400">₹{pay.lopDeductionAmount.toLocaleString("en-IN")}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">₹{pay.netSalary.toLocaleString("en-IN")}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              pay.paymentStatus === "paid" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            }`}>
                              {pay.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => setSelectedPayroll(pay)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Payslip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <DollarSign className="w-10 h-10 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400">No generated payslips available yet for your account.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* APPLY LEAVE MODAL */}
      {showLeaveModal && employee && (
        <LeaveRequestModal
          employee={employee}
          currentUid={currentUid}
          onClose={() => setShowLeaveModal(false)}
          onSuccess={(msg) => {
            setMessage({ type: "success", text: msg });
            refreshSecondaryData(employee.employeeId);
          }}
        />
      )}

      {/* REQUEST REGULARIZATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Attendance Regularization Request</h3>
            <form onSubmit={handleRegSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={regForm.date}
                  onChange={(e) => setRegForm({ ...regForm, date: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Request Type</label>
                <select
                  value={regForm.type}
                  onChange={(e) => setRegForm({ ...regForm, type: e.target.value as any })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                >
                  <option value="missed_checkin">Missed Check-In</option>
                  <option value="missed_checkout">Missed Check-Out</option>
                  <option value="time_correction">Time Correction</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={regForm.requestedCheckIn}
                    onChange={(e) => setRegForm({ ...regForm, requestedCheckIn: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={regForm.requestedCheckOut}
                    onChange={(e) => setRegForm({ ...regForm, requestedCheckOut: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Justification Reason</label>
                <textarea
                  required
                  rows={3}
                  value={regForm.reason}
                  onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                  placeholder="Explain why punch was missed or delayed..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GEOLOCATION AUTHORIZATION EXPLANATION MODAL */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-gray-900 border border-indigo-500/40 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Location Access Authorization</h3>
                <p className="text-xs text-indigo-300">Attendance Geofence & Proximity Verification</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800">
              <p>
                <strong className="text-white">Why is location required?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-gray-400">
                <li>Verifies your presence within designated office geofence perimeters.</li>
                <li>Calculates exact geodesic distance against company office metadata.</li>
                <li>Ensures real-time anti-fraud compliance for remote/office check-ins.</li>
                <li>Location data is strictly requested only during explicit check-in and check-out punches.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelExplanation}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndRequestLocation}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer transition-all flex items-center gap-2"
              >
                <Shield className="w-4 h-4" /> Authorize Location Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYSLIP MODAL */}
      {selectedPayroll && (
        <PayslipModal
          payroll={selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
        />
      )}
    </div>
  );
}
