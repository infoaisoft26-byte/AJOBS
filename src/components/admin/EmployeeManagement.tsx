import React, { useEffect, useState } from "react";
import { UserPlus, Search, Edit3, Trash2, Shield, Building, Briefcase, Mail, Phone, Calendar, RefreshCw, CheckCircle, UserCheck } from "lucide-react";
import { EmployeeProfile, EmployeeRole, EmploymentType, WorkMode } from "../../types/employeeTypes";
import { getEmployeeProfiles, getOfficeLocations, getShifts, saveEmployeeProfile } from "../../services/employeeService";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeProfile[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeProfile | null>(null);

  const [form, setForm] = useState<Partial<EmployeeProfile>>({
    fullName: "",
    email: "",
    phone: "",
    department: "Engineering",
    designation: "Software Engineer",
    role: "Software Engineer",
    joiningDate: new Date().toISOString().split("T")[0],
    employmentType: "Full-Time",
    workMode: "Office",
    monthlySalary: 60000,
    status: "Active"
  });

  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const emps = await getEmployeeProfiles();
      setEmployees(emps);
      setFilteredEmployees(emps);
    } catch (err) {
      console.error("Failed to load employee list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => 
        e.fullName.toLowerCase().includes(q) || 
        e.email.toLowerCase().includes(q) || 
        e.employeeId.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== "ALL") {
      result = result.filter(e => e.department === deptFilter);
    }

    if (modeFilter !== "ALL") {
      result = result.filter(e => e.workMode === modeFilter);
    }

    setFilteredEmployees(result);
  }, [search, deptFilter, modeFilter, employees]);

  const handleOpenModal = (emp?: EmployeeProfile) => {
    if (emp) {
      setSelectedEmp(emp);
      setForm(emp);
    } else {
      setSelectedEmp(null);
      setForm({
        fullName: "",
        email: "",
        phone: "",
        department: "Engineering",
        designation: "Software Engineer",
        role: "Software Engineer",
        joiningDate: new Date().toISOString().split("T")[0],
        employmentType: "Full-Time",
        workMode: "Office",
        monthlySalary: 60000,
        status: "Active"
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) return;

    setSaving(true);
    try {
      await saveEmployeeProfile(form as EmployeeProfile);
      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error("Save employee error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-gray-200">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/80 p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" /> Internal Employee Directory
          </h2>
          <p className="text-gray-400">Manage real active employees, designations, salaries, and work configurations.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          <UserPlus className="w-4 h-4" /> Add New Employee
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search name, ID, email, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900/80 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-gray-900/80 border border-gray-800 rounded-xl p-2.5 text-white"
        >
          <option value="ALL">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="HR">HR & Talent</option>
          <option value="Operations">Operations</option>
          <option value="Sales">Sales & Marketing</option>
          <option value="Support">Support & Ops</option>
          <option value="Accounts">Accounts & Finance</option>
        </select>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="bg-gray-900/80 border border-gray-800 rounded-xl p-2.5 text-white"
        >
          <option value="ALL">All Work Modes</option>
          <option value="Office">Office HQ</option>
          <option value="Work From Home">Work From Home</option>
          <option value="Field Work">Field Work</option>
          <option value="Client Visit">Client Visit</option>
        </select>
      </div>

      {/* Employee List Table */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-mono">Loading internal employee records...</div>
        ) : filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                <tr>
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Department & Role</th>
                  <th className="p-3.5">Work Mode</th>
                  <th className="p-3.5">Monthly Salary</th>
                  <th className="p-3.5">Joining Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm">{emp.fullName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{emp.employeeId} • {emp.email}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-white font-semibold">{emp.designation}</div>
                      <div className="text-[11px] text-indigo-300">{emp.department}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-200 border border-gray-700">
                        {emp.workMode}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      ₹{(emp.monthlySalary || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3.5 font-mono text-gray-400">
                      {emp.joiningDate}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        emp.status === "Active" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenModal(emp)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-indigo-300 hover:text-white rounded-lg font-semibold transition-all cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <Building className="w-8 h-8 text-gray-600 mx-auto" />
            <p>No employee profiles match your search criteria.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {selectedEmp ? `Edit Profile: ${selectedEmp.fullName}` : "Add Internal Employee"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName || ""}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Department</label>
                  <select
                    value={form.department || "Engineering"}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR & Talent</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales & Marketing</option>
                    <option value="Support">Support & Ops</option>
                    <option value="Accounts">Accounts & Finance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Designation</label>
                  <input
                    type="text"
                    value={form.designation || ""}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Monthly Gross Salary (INR)</label>
                  <input
                    type="number"
                    value={form.monthlySalary || 0}
                    onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Work Mode</label>
                  <select
                    value={form.workMode || "Office"}
                    onChange={(e) => setForm({ ...form, workMode: e.target.value as WorkMode })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Office">Office HQ</option>
                    <option value="Work From Home">Work From Home</option>
                    <option value="Field Work">Field Work</option>
                    <option value="Client Visit">Client Visit</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Employment Type</label>
                  <select
                    value={form.employmentType || "Full-Time"}
                    onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
