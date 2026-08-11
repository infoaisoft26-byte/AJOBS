import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Laptop, 
  Briefcase,
  TrendingUp,
  Activity
} from "lucide-react";
import { AttendanceRecord } from "../../types/attendance";
import { EmployeeAttendanceService } from "../../services/EmployeeAttendanceService";

interface AttendanceHistoryProps {
  employeeId: string;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ employeeId }) => {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search states
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "YYYY-MM" or "all"
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(7);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await EmployeeAttendanceService.getAttendanceHistory(employeeId, 100);
      setHistory(records);
    } catch (err: any) {
      console.error("Error loading attendance history:", err);
      setError("Failed to load attendance logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchHistory();
    }
  }, [employeeId]);

  // Extract available months for dropdown filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    history.forEach((rec) => {
      if (rec.date && rec.date.length >= 7) {
        set.add(rec.date.substring(0, 7)); // "YYYY-MM"
      }
    });
    return Array.from(set).sort().reverse();
  }, [history]);

  // Filtered records based on controls
  const filteredRecords = useMemo(() => {
    return history.filter((rec) => {
      // Month filter
      if (selectedMonth !== "all" && !rec.date.startsWith(selectedMonth)) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && rec.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Search query (date, status, workMode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDate = rec.date.toLowerCase().includes(q);
        const matchesStatus = rec.status?.toLowerCase().includes(q);
        const matchesWorkMode = rec.workMode?.toLowerCase().includes(q);
        const matchesLocation = rec.officeLocationName?.toLowerCase().includes(q);
        if (!matchesDate && !matchesStatus && !matchesWorkMode && !matchesLocation) {
          return false;
        }
      }
      return true;
    });
  }, [history, selectedMonth, statusFilter, searchQuery]);

  // Calculate monthly metrics
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    let presentCount = 0;
    let lateCount = 0;
    let totalNetMinutes = 0;

    filteredRecords.forEach((r) => {
      if (r.status === "Present") presentCount++;
      if (r.isLate || r.status === "Late") lateCount++;
      totalNetMinutes += r.netWorkingMinutes || r.totalWorkingMinutes || 0;
    });

    const totalNetHours = (totalNetMinutes / 60).toFixed(1);
    const avgDailyHours = total > 0 ? (totalNetMinutes / 60 / total).toFixed(1) : "0.0";

    return {
      total,
      presentCount,
      lateCount,
      totalNetHours,
      avgDailyHours
    };
  }, [filteredRecords]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Reset page to 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, statusFilter, searchQuery, pageSize]);

  const getWorkModeIcon = (mode?: string) => {
    switch (mode) {
      case "Work From Home":
        return <Laptop className="w-3.5 h-3.5 text-sky-400" />;
      case "Field Work":
      case "Client Visit":
        return <Briefcase className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Attendance Log & Trend History</h3>
            <p className="text-xs text-gray-400">Track past check-in/outs, working hours, and geofence compliance</p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          className="self-start md:self-auto px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Refresh Logs
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-gray-950/60 border border-gray-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-gray-400">Total Days Logged</span>
          <p className="text-lg font-extrabold text-white">{metrics.total}</p>
        </div>
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/30 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-emerald-300">On-Time / Present</span>
          <p className="text-lg font-extrabold text-emerald-400">{metrics.presentCount}</p>
        </div>
        <div className="p-3.5 bg-amber-950/20 border border-amber-800/30 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-amber-300">Late Arrivals</span>
          <p className="text-lg font-extrabold text-amber-400">{metrics.lateCount}</p>
        </div>
        <div className="p-3.5 bg-indigo-950/20 border border-indigo-800/30 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-indigo-300">Total Net Working Hours</span>
          <p className="text-lg font-extrabold text-indigo-400">{metrics.totalNetHours} hrs</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by date, mode, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="half day">Half Day</option>
        </select>
      </div>

      {/* Attendance Records Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400 space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Fetching historical attendance logs...</p>
        </div>
      ) : paginatedRecords.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-500 border border-dashed border-gray-800 rounded-xl">
          No attendance logs found matching your filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 font-semibold bg-gray-950/40">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Work Mode</th>
                <th className="py-3 px-3">Check-In</th>
                <th className="py-3 px-3">Check-Out</th>
                <th className="py-3 px-3">Net Hours</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Geofence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {paginatedRecords.map((rec) => {
                const checkInFormatted = rec.checkInTime 
                  ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "--:--";
                const checkOutFormatted = rec.checkOutTime 
                  ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Active / Pending";

                const netHours = ( (rec.netWorkingMinutes || rec.totalWorkingMinutes || 0) / 60 ).toFixed(1);

                return (
                  <tr key={rec.attendanceId} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-white">
                      {rec.date}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        {getWorkModeIcon(rec.workMode)}
                        <span>{rec.workMode || "Office"}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-gray-200">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{checkInFormatted}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-gray-200">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{checkOutFormatted}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-indigo-300">
                      {netHours} hrs
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        rec.status === "Present"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : rec.status === "Late" || rec.isLate
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-gray-800 text-gray-400"
                      }`}>
                        {rec.isLate ? <AlertTriangle className="w-3 h-3 text-amber-400" /> : <CheckCircle2 className="w-3 h-3" />}
                        {rec.status || (rec.isLate ? "Late" : "Present")}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className={`w-3.5 h-3.5 ${
                          rec.geofenceStatus === "INSIDE_OFFICE" ? "text-emerald-400" : "text-amber-400"
                        }`} />
                        <span>{rec.geofenceStatus === "INSIDE_OFFICE" ? "Verified" : "Remote / Outside"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && filteredRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-800 text-xs text-gray-400">
          <div>
            Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong className="text-white">{Math.min(currentPage * pageSize, filteredRecords.length)}</strong> of{" "}
            <strong className="text-white">{filteredRecords.length}</strong> logs
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-lg cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
