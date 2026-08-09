import React from "react";
import { X, Download, Printer, CheckCircle, Building, Calendar, DollarSign, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { EmployeePayroll } from "../../types/employeeTypes";

interface PayslipModalProps {
  payroll: EmployeePayroll;
  onClose: () => void;
}

export default function PayslipModal({ payroll, onClose }: PayslipModalProps) {
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text("AIJOBS INC.", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("AI-Powered Recruitment & Human Capital Management", 14, 26);
      doc.text("Cyber City, Bangalore, Karnataka - 560100", 14, 31);

      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      doc.text(`PAYSLIP FOR ${payroll.monthYearString.toUpperCase()}`, 14, 42);

      // Divider
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 46, 196, 46);

      // Employee Details
      doc.setFontSize(10);
      doc.text(`Employee ID: ${payroll.employeeId}`, 14, 54);
      doc.text(`Name: ${payroll.employeeName}`, 14, 60);
      doc.text(`Designation: ${payroll.designation}`, 14, 66);
      doc.text(`Department: ${payroll.department}`, 14, 72);

      doc.text(`Calendar Days: ${payroll.calendarDays}`, 120, 54);
      doc.text(`Present Days: ${payroll.presentDays}`, 120, 60);
      doc.text(`LOP Days: ${payroll.unpaidLeaveDays}`, 120, 66);
      doc.text(`Payment Status: ${payroll.paymentStatus.toUpperCase()}`, 120, 72);

      doc.line(14, 78, 196, 78);

      // Earnings Table Header
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text("EARNINGS", 14, 86);
      doc.text("DEDUCTIONS", 120, 86);

      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);

      let y = 94;
      doc.text(`Basic Pay: INR ${payroll.basicPay.toLocaleString("en-IN")}`, 14, y);
      doc.text(`PF Deduction: INR ${payroll.pfDeduction.toLocaleString("en-IN")}`, 120, y);

      y += 6;
      doc.text(`HRA Allowance: INR ${payroll.hraPay.toLocaleString("en-IN")}`, 14, y);
      doc.text(`ESI Deduction: INR ${payroll.esiDeduction.toLocaleString("en-IN")}`, 120, y);

      y += 6;
      doc.text(`Conveyance: INR ${payroll.conveyancePay.toLocaleString("en-IN")}`, 14, y);
      doc.text(`Professional Tax: INR ${payroll.professionalTax.toLocaleString("en-IN")}`, 120, y);

      y += 6;
      doc.text(`Special Allowance: INR ${payroll.specialAllowancePay.toLocaleString("en-IN")}`, 14, y);
      doc.text(`TDS Deduction: INR ${payroll.tdsDeduction.toLocaleString("en-IN")}`, 120, y);

      y += 6;
      doc.text(`Other Allowances: INR ${payroll.otherAllowancesPay.toLocaleString("en-IN")}`, 14, y);
      doc.text(`LOP Deduction: INR ${payroll.lopDeductionAmount.toLocaleString("en-IN")}`, 120, y);

      y += 6;
      doc.text(`Overtime Pay: INR ${payroll.overtimePay.toLocaleString("en-IN")}`, 14, y);
      doc.text(`Advance Recovery: INR ${payroll.advanceLoanDeduction.toLocaleString("en-IN")}`, 120, y);

      y += 10;
      doc.line(14, y, 196, y);

      y += 8;
      doc.setFontSize(11);
      doc.text(`Gross Earnings: INR ${payroll.monthlyGrossSalary.toLocaleString("en-IN")}`, 14, y);
      doc.text(`Total Deductions: INR ${payroll.totalDeductions.toLocaleString("en-IN")}`, 120, y);

      y += 12;
      doc.setFillColor(243, 244, 246);
      doc.rect(14, y, 182, 16, "F");

      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(`NET PAYABLE SALARY: INR ${payroll.netSalary.toLocaleString("en-IN")}`, 20, y + 11);

      y += 24;
      if (payroll.utrReference) {
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`Payment Ref / UTR: ${payroll.utrReference} | Processed Date: ${payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : 'N/A'}`, 14, y);
      }

      doc.text("This is a computer-generated payslip issued by AIJOBS Payroll Engine and requires no physical signature.", 14, y + 10);

      doc.save(`AIJOBS_Payslip_${payroll.employeeId}_${payroll.monthYearString.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to export PDF. Printing standard view instead.");
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-gray-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-950 via-gray-900 to-purple-950 border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Employee Salary Statement</h3>
              <p className="text-xs text-indigo-300 font-mono">{payroll.monthYearString} • {payroll.employeeId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> PDF Payslip
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-gray-700"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Content Body */}
        <div className="p-6 space-y-6 text-xs text-gray-300 bg-[#060813]">
          {/* Company Brand Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-800 gap-4">
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 tracking-wider">
                AIJOBS INC.
              </h1>
              <p className="text-gray-400 text-[11px] font-mono">AI-Powered Recruitment & Human Capital Management Platform</p>
            </div>
            <div className="text-right sm:text-right">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                payroll.paymentStatus === "paid" 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              }`}>
                <CheckCircle className="w-3.5 h-3.5" /> {payroll.paymentStatus}
              </span>
              <p className="text-[10px] text-gray-500 mt-1">Generated on: {new Date(payroll.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Employee & Attendance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Employee Details
              </h4>
              <p><span className="text-gray-400">Employee Name:</span> <strong className="text-white">{payroll.employeeName}</strong></p>
              <p><span className="text-gray-400">Employee ID:</span> <strong className="text-white font-mono">{payroll.employeeId}</strong></p>
              <p><span className="text-gray-400">Designation:</span> <strong className="text-white">{payroll.designation}</strong></p>
              <p><span className="text-gray-400">Department:</span> <strong className="text-white">{payroll.department}</strong></p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Attendance Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-800">
                  <span className="text-gray-400 block text-[10px]">Calendar Days</span>
                  <strong className="text-white text-sm">{payroll.calendarDays}</strong>
                </div>
                <div className="bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-300 block text-[10px]">Present Days</span>
                  <strong className="text-emerald-400 text-sm">{payroll.presentDays}</strong>
                </div>
                <div className="bg-rose-950/30 p-2 rounded-lg border border-rose-500/20">
                  <span className="text-rose-300 block text-[10px]">Unpaid LOP Days</span>
                  <strong className="text-rose-400 text-sm">{payroll.unpaidLeaveDays}</strong>
                </div>
                <div className="bg-indigo-950/30 p-2 rounded-lg border border-indigo-500/20">
                  <span className="text-indigo-300 block text-[10px]">Overtime Hours</span>
                  <strong className="text-indigo-400 text-sm">{payroll.approvedOvertimeHours} hrs</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                <h4 className="font-bold text-emerald-400 uppercase text-xs">Earnings & Allowances</h4>
                <span className="text-[10px] text-gray-500">Amount (INR)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Basic Pay</span>
                  <span className="font-mono text-white">₹{payroll.basicPay.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">House Rent Allowance (HRA)</span>
                  <span className="font-mono text-white">₹{payroll.hraPay.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Conveyance Allowance</span>
                  <span className="font-mono text-white">₹{payroll.conveyancePay.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Special Allowance</span>
                  <span className="font-mono text-white">₹{payroll.specialAllowancePay.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Other Allowances</span>
                  <span className="font-mono text-white">₹{payroll.otherAllowancesPay.toLocaleString("en-IN")}</span>
                </div>
                {payroll.overtimePay > 0 && (
                  <div className="flex justify-between text-indigo-300">
                    <span>Overtime Pay ({payroll.approvedOvertimeHours} hrs)</span>
                    <span className="font-mono">₹{payroll.overtimePay.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-800 font-bold text-white">
                <span>Gross Monthly Earnings</span>
                <span className="font-mono text-emerald-400">₹{payroll.monthlyGrossSalary.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                <h4 className="font-bold text-rose-400 uppercase text-xs">Statutory & Other Deductions</h4>
                <span className="text-[10px] text-gray-500">Amount (INR)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Provident Fund (PF)</span>
                  <span className="font-mono text-white">₹{payroll.pfDeduction.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ESI Deduction</span>
                  <span className="font-mono text-white">₹{payroll.esiDeduction.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Professional Tax (PT)</span>
                  <span className="font-mono text-white">₹{payroll.professionalTax.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TDS Deduction</span>
                  <span className="font-mono text-white">₹{payroll.tdsDeduction.toLocaleString("en-IN")}</span>
                </div>
                {payroll.lopDeductionAmount > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>Loss of Pay (LOP {payroll.unpaidLeaveDays} days)</span>
                    <span className="font-mono">₹{payroll.lopDeductionAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {payroll.advanceLoanDeduction > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Salary Advance Recovery</span>
                    <span className="font-mono">₹{payroll.advanceLoanDeduction.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-800 font-bold text-white">
                <span>Total Deductions</span>
                <span className="font-mono text-rose-400">₹{payroll.totalDeductions.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-indigo-900/60 border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold block">Net Take Home Salary</span>
              <p className="text-[10px] text-gray-400">Credited to primary bank account ending with verification</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white font-mono">₹{payroll.netSalary.toLocaleString("en-IN")}</span>
              <p className="text-[10px] text-indigo-200 font-mono">Rupees {payroll.netSalary.toLocaleString("en-IN")} Only</p>
            </div>
          </div>

          {/* Bank & Payment Reference */}
          {payroll.utrReference && (
            <div className="p-3 bg-gray-900/80 rounded-lg border border-gray-800 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-gray-400">Payment Ref / Bank UTR: </span>
                <span className="font-mono text-indigo-300 font-bold">{payroll.utrReference}</span>
              </div>
              <div>
                <span className="text-gray-400">Payment Date: </span>
                <span className="text-white font-mono">{payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-500 text-center font-mono border-t border-gray-800 pt-3">
            This is a computer-generated document issued by AIJOBS Payroll Engine. Confidential & Internal Use Only.
          </div>
        </div>
      </div>
    </div>
  );
}
