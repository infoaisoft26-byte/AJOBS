import { jsPDF } from "jspdf";
import { EmployeeProfile, EmployeePayroll } from "../types/employeeTypes";
import { AttendanceRecord, PayrollSnapshot } from "../types/attendance";

interface GeneratePDFParams {
  employee: EmployeeProfile;
  monthName: string; // e.g. "August 2026"
  attendanceRecords: AttendanceRecord[];
  payrollSnapshot?: PayrollSnapshot | EmployeePayroll | null;
}

export function generateAttendancePayrollPDF({
  employee,
  monthName,
  attendanceRecords,
  payrollSnapshot
}: GeneratePDFParams) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  let y = 16;

  // Primary Colors
  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AIJobs Enterprise HCM", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Monthly Attendance & Payroll Report - ${monthName}`, margin, 20);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - margin - 50, 20);

  y = 36;

  // Section 1: Employee Details Card
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Employee Information", margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1X = margin + 4;
  const col2X = margin + 65;
  const col3X = margin + 125;

  doc.text(`Name: ${employee.fullName}`, col1X, y + 13);
  doc.text(`Employee ID: ${employee.employeeId}`, col1X, y + 19);
  doc.text(`Department: ${employee.department}`, col1X, y + 25);

  doc.text(`Designation: ${employee.designation}`, col2X, y + 13);
  doc.text(`Role: ${employee.role}`, col2X, y + 19);
  doc.text(`Work Mode: ${employee.workMode}`, col2X, y + 25);

  doc.text(`Email: ${employee.email}`, col3X, y + 13);
  doc.text(`Joining Date: ${employee.joiningDate}`, col3X, y + 19);

  y += 34;

  // Section 2: Attendance Metrics Summary Grid
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("Attendance & Compliance Metrics", margin, y);
  y += 5;

  let presentCount = 0;
  let lateCount = 0;
  let totalNetMinutes = 0;

  attendanceRecords.forEach((r) => {
    if (r.status === "Present") presentCount++;
    if (r.isLate || r.status === "Late") lateCount++;
    totalNetMinutes += r.netWorkingMinutes || r.totalWorkingMinutes || 0;
  });

  const totalNetHours = (totalNetMinutes / 60).toFixed(1);
  const avgDailyHours = attendanceRecords.length > 0 ? (totalNetMinutes / 60 / attendanceRecords.length).toFixed(1) : "0.0";

  const boxWidth = (pageWidth - margin * 2 - 12) / 4;
  const boxHeight = 16;

  const statBoxes = [
    { label: "Total Logs", value: `${attendanceRecords.length} Days` },
    { label: "On-Time Checkins", value: `${presentCount}` },
    { label: "Late Arrivals", value: `${lateCount}` },
    { label: "Net Hours", value: `${totalNetHours} hrs` }
  ];

  statBoxes.forEach((box, i) => {
    const boxX = margin + i * (boxWidth + 4);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(boxX, y, boxWidth, boxHeight, 1.5, 1.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(box.label, boxX + 3, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(box.value, boxX + 3, y + 12);
  });

  y += boxHeight + 8;

  // Section 3: Payroll Snapshot (if available)
  if (payrollSnapshot) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("Monthly Payroll Breakdown", margin, y);
    y += 5;

    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, "FD");

    const gross = (payrollSnapshot as any).monthlyGrossSalary || (payrollSnapshot as any).grossSalary || employee.monthlySalary || 0;
    const net = (payrollSnapshot as any).netSalary || gross;
    const deductions = (payrollSnapshot as any).totalDeductions || 0;
    const payStatus = (payrollSnapshot as any).paymentStatus || (payrollSnapshot as any).status || "paid";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    doc.text(`Gross Monthly Salary: ₹${gross.toLocaleString()}`, margin + 4, y + 8);
    doc.text(`Total Deductions (PF/ESI/LOP/TDS): ₹${deductions.toLocaleString()}`, margin + 4, y + 15);
    doc.text(`Payment Status: ${payStatus.toUpperCase()}`, margin + 4, y + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...accentColor);
    doc.text(`Net Payable: ₹${net.toLocaleString()}`, pageWidth - margin - 60, y + 15);

    y += 32;
  }

  // Section 4: Attendance Log Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("Daily Attendance Records", margin, y);
  y += 5;

  // Table Header
  const headers = ["Date", "Work Mode", "Check In", "Check Out", "Net Hours", "Status", "Geofence"];
  const colWidths = [24, 28, 22, 22, 22, 26, 38];

  doc.setFillColor(...accentColor);
  doc.rect(margin, y, pageWidth - margin * 2, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let currentX = margin;
  headers.forEach((h, idx) => {
    doc.text(h, currentX + 2, y + 5);
    currentX += colWidths[idx];
  });

  y += 7;

  // Table Body Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const displayLogs = attendanceRecords.slice(0, 20); // Top 20 for single/two-page fit

  displayLogs.forEach((rec, rowIdx) => {
    // Check if new page needed
    if (y > 270) {
      doc.addPage();
      y = 15;
    }

    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, 6, "F");
    }

    doc.setTextColor(15, 23, 42);

    const cIn = rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--";
    const cOut = rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--";
    const hours = ((rec.netWorkingMinutes || rec.totalWorkingMinutes || 0) / 60).toFixed(1);
    const geofence = rec.geofenceStatus === "INSIDE_OFFICE" ? "Verified Office" : "Remote / Field";

    let x = margin;
    doc.text(rec.date, x + 2, y + 4.5); x += colWidths[0];
    doc.text(rec.workMode || "Office", x + 2, y + 4.5); x += colWidths[1];
    doc.text(cIn, x + 2, y + 4.5); x += colWidths[2];
    doc.text(cOut, x + 2, y + 4.5); x += colWidths[3];
    doc.text(`${hours} hrs`, x + 2, y + 4.5); x += colWidths[4];

    // Status styling
    if (rec.status === "Present") {
      doc.setTextColor(16, 185, 129);
    } else if (rec.isLate || rec.status === "Late") {
      doc.setTextColor(245, 158, 11);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(rec.status || "Present", x + 2, y + 4.5); x += colWidths[5];

    doc.setTextColor(71, 85, 105);
    doc.text(geofence, x + 2, y + 4.5);

    y += 6;
  });

  // Footer / Signature Stamp
  y = Math.max(y + 10, 260);
  doc.setDrawColor(...borderColor);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("This document is a system-generated statement issued by AIJobs HCM. No signature required.", margin, y + 5);

  // Save PDF file
  const fileName = `Attendance_Payroll_Report_${employee.employeeId}_${monthName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
