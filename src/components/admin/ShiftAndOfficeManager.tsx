import React, { useEffect, useState } from "react";
import { Building, Clock, Calendar, Plus, MapPin, Edit3, CheckCircle } from "lucide-react";
import { HolidayItem, OfficeLocation, ShiftConfig } from "../../types/employeeTypes";
import { 
  getHolidays, 
  getOfficeLocations, 
  getShifts, 
  saveHoliday, 
  saveOfficeLocation, 
  saveShift 
} from "../../services/employeeService";

export default function ShiftAndOfficeManager() {
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Office Form
  const [officeForm, setOfficeForm] = useState<OfficeLocation>({
    officeLocationId: "",
    name: "",
    address: "",
    latitude: 12.971598,
    longitude: 77.594562,
    allowedRadiusMeters: 300,
    isPrimary: false
  });

  // Shift Form
  const [shiftForm, setShiftForm] = useState<ShiftConfig>({
    shiftId: "",
    shiftName: "",
    startTime: "09:30",
    endTime: "18:30",
    graceMinutes: 15,
    minimumHalfDayMinutes: 240,
    minimumFullDayMinutes: 480,
    weeklyOffDays: [0, 6],
    isActive: true
  });

  // Holiday Form
  const [holidayForm, setHolidayForm] = useState<HolidayItem>({
    holidayId: "",
    date: new Date().toISOString().split("T")[0],
    holidayName: "",
    isMandatory: true,
    year: new Date().getFullYear()
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [offList, shfList, holList] = await Promise.all([
        getOfficeLocations(),
        getShifts(),
        getHolidays()
      ]);
      setOffices(offList);
      setShifts(shfList);
      setHolidays(holList);
    } catch (err) {
      console.error("Error loading config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveOfficeLocation(officeForm);
    setShowOfficeModal(false);
    await loadData();
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveShift(shiftForm);
    setShowShiftModal(false);
    await loadData();
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveHoliday(holidayForm);
    setShowHolidayModal(false);
    await loadData();
  };

  return (
    <div className="space-y-8 text-xs text-gray-200">
      {/* SECTION 1: OFFICE LOCATIONS & GEOFENCING */}
      <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" /> Office Locations & Geofence Boundaries
            </h3>
            <p className="text-gray-400 text-[11px]">Configure office HQ coordinates and allowed GPS distance radius for check-ins.</p>
          </div>
          <button
            onClick={() => {
              setOfficeForm({
                officeLocationId: `office_${Date.now()}`,
                name: "",
                address: "",
                latitude: 12.971598,
                longitude: 77.594562,
                allowedRadiusMeters: 300,
                isPrimary: false
              });
              setShowOfficeModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Office Location
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offices.map((off) => (
            <div key={off.officeLocationId} className="p-4 bg-gray-950/80 border border-gray-800 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-400" /> {off.name}
                </h4>
                {off.isPrimary && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Primary HQ</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 line-clamp-2">{off.address}</p>
              <div className="pt-2 border-t border-gray-800 flex justify-between font-mono text-[11px] text-gray-300">
                <span>GPS: {off.latitude.toFixed(4)}, {off.longitude.toFixed(4)}</span>
                <span className="text-indigo-300 font-bold">Radius: {off.allowedRadiusMeters}m</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: SHIFTS CONFIGURATION */}
      <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Work Shifts & Attendance Rules
            </h3>
            <p className="text-gray-400 text-[11px]">Set shift timings, grace periods for late arrivals, and minimum working hours.</p>
          </div>
          <button
            onClick={() => {
              setShiftForm({
                shiftId: `shift_${Date.now()}`,
                shiftName: "",
                startTime: "09:30",
                endTime: "18:30",
                graceMinutes: 15,
                minimumHalfDayMinutes: 240,
                minimumFullDayMinutes: 480,
                weeklyOffDays: [0, 6],
                isActive: true
              });
              setShowShiftModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Work Shift
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map((shf) => (
            <div key={shf.shiftId} className="p-4 bg-gray-950/80 border border-gray-800 rounded-xl space-y-2">
              <h4 className="font-bold text-white text-xs">{shf.shiftName}</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-gray-900 p-2 rounded-lg"><span className="text-gray-400 block">Timings</span><strong className="text-indigo-300">{shf.startTime} - {shf.endTime}</strong></div>
                <div className="bg-gray-900 p-2 rounded-lg"><span className="text-gray-400 block">Grace Period</span><strong className="text-emerald-400">{shf.graceMinutes} Mins</strong></div>
                <div className="bg-gray-900 p-2 rounded-lg"><span className="text-gray-400 block">Full Day Min</span><strong className="text-white">{(shf.minimumFullDayMinutes / 60)} Hours</strong></div>
                <div className="bg-gray-900 p-2 rounded-lg"><span className="text-gray-400 block">Half Day Min</span><strong className="text-white">{(shf.minimumHalfDayMinutes / 60)} Hours</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: HOLIDAY CALENDAR */}
      <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Yearly Holiday Calendar
            </h3>
            <p className="text-gray-400 text-[11px]">Holidays are automatically excluded from absent calculations in payroll.</p>
          </div>
          <button
            onClick={() => {
              setHolidayForm({
                holidayId: `holiday_${Date.now()}`,
                date: new Date().toISOString().split("T")[0],
                holidayName: "",
                isMandatory: true,
                year: new Date().getFullYear()
              });
              setShowHolidayModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        </div>

        {holidays.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {holidays.map((h) => (
              <div key={h.holidayId} className="p-3 bg-gray-950/80 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-white block font-bold">{h.holidayName}</strong>
                  <span className="text-gray-400 font-mono text-[11px]">{h.date}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.isMandatory ? "bg-indigo-500/20 text-indigo-300" : "bg-gray-800 text-gray-400"}`}>
                  {h.isMandatory ? "Mandatory" : "Optional"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-6">No holidays defined yet.</p>
        )}
      </div>

      {/* ADD OFFICE MODAL */}
      {showOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Office Location Config</h3>
            <form onSubmit={handleSaveOffice} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Office Name *</label>
                <input
                  type="text"
                  required
                  value={officeForm.name}
                  onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                  placeholder="e.g. AIJobs Bangalore HQ"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Full Address</label>
                <input
                  type="text"
                  value={officeForm.address}
                  onChange={(e) => setOfficeForm({ ...officeForm, address: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={officeForm.latitude}
                    onChange={(e) => setOfficeForm({ ...officeForm, latitude: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={officeForm.longitude}
                    onChange={(e) => setOfficeForm({ ...officeForm, longitude: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Allowed Radius (Meters)</label>
                <input
                  type="number"
                  value={officeForm.allowedRadiusMeters}
                  onChange={(e) => setOfficeForm({ ...officeForm, allowedRadiusMeters: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowOfficeModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SHIFT MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Work Shift Config</h3>
            <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  value={shiftForm.shiftName}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftName: e.target.value })}
                  placeholder="e.g. General Shift"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Start Time (HH:mm)</label>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">End Time (HH:mm)</label>
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Late Grace Minutes</label>
                <input
                  type="number"
                  value={shiftForm.graceMinutes}
                  onChange={(e) => setShiftForm({ ...shiftForm, graceMinutes: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowShiftModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Save Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD HOLIDAY MODAL */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Holiday</h3>
            <form onSubmit={handleSaveHoliday} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={holidayForm.holidayName}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayName: e.target.value })}
                  placeholder="e.g. Independence Day"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Date</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowHolidayModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Save Holiday</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
