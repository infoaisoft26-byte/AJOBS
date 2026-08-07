import { getFirestoreDb } from "./firestoreHelper.js";

/**
 * Standard Chart of Accounts (COA) Definition
 */
export const CHART_OF_ACCOUNTS = [
  // ASSETS (1000 - 1999)
  { accountId: "1010", accountName: "Bank / Payment Gateway Clearing", category: "ASSETS", type: "Asset", description: "Clearing account for customer payments, settlements and refunds" },
  { accountId: "1020", accountName: "Accounts Receivable", category: "ASSETS", type: "Asset", description: "Unpaid customer invoices and billed amounts" },
  
  // LIABILITIES (2000 - 2999)
  { accountId: "2010", accountName: "GST Payable (Total)", category: "LIABILITIES", type: "Liability", description: "Tax liabilities payable to Government of India" },
  { accountId: "2015", accountName: "CGST Payable", category: "LIABILITIES", type: "Liability", description: "Central GST liability for intrastate sales" },
  { accountId: "2016", accountName: "SGST Payable", category: "LIABILITIES", type: "Liability", description: "State GST liability for intrastate sales" },
  { accountId: "2017", accountName: "IGST Payable", category: "LIABILITIES", type: "Liability", description: "Integrated GST liability for interstate sales" },
  { accountId: "2020", accountName: "Refund Payable", category: "LIABILITIES", type: "Liability", description: "Approved refunds pending gateway disbursement" },

  // EQUITY (3000 - 3999)
  { accountId: "3010", accountName: "Retained Earnings", category: "EQUITY", type: "Equity", description: "Accumulated net earnings of the platform" },

  // INCOME / REVENUE (4000 - 4999)
  { accountId: "4010", accountName: "Recruiter Subscription Revenue", category: "INCOME", type: "Revenue", description: "Revenue from employer / recruiter subscriptions" },
  { accountId: "4020", accountName: "Consultancy Subscription Revenue", category: "INCOME", type: "Revenue", description: "Revenue from recruitment agency / consultancy plans" },
  { accountId: "4030", accountName: "Resume Access Revenue", category: "INCOME", type: "Revenue", description: "Revenue from resume unlocks and candidate contact views" },
  { accountId: "4040", accountName: "Other Service Revenue", category: "INCOME", type: "Revenue", description: "Revenue from add-ons, featured job posts, and assessment tools" },

  // EXPENSES (5000 - 5999)
  { accountId: "5010", accountName: "Payment Gateway Charges", category: "EXPENSES", type: "Expense", description: "Processing fees charged by Razorpay / PayU / Stripe" },
  { accountId: "5020", accountName: "Marketing Expense", category: "EXPENSES", type: "Expense", description: "Advertising, campaigns, and candidate acquisition costs" },
  { accountId: "5030", accountName: "Software & Hosting Expense", category: "EXPENSES", type: "Expense", description: "Cloud infrastructure, AI API services, and tooling" },
  { accountId: "5040", accountName: "Professional Fees Expense", category: "EXPENSES", type: "Expense", description: "Legal, compliance, and accounting professional fees" },
  { accountId: "5050", accountName: "Office & General Expense", category: "EXPENSES", type: "Expense", description: "General office, administrative, and operational expenses" },
  { accountId: "5060", accountName: "Refund & Adjustment Expense", category: "EXPENSES", type: "Expense", description: "Unrecoverable chargebacks and dispute write-offs" }
];

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalParams {
  reference: string; // Idempotent key: PAYMENT:<id>, REFUND:<id>, EXPENSE:<id>
  transactionDate?: string;
  description: string;
  userId?: string;
  userEmail?: string;
  role?: string;
  paymentId?: string;
  invoiceId?: string;
  creditNoteId?: string;
  expenseId?: string;
  createdBy?: string;
  lines: JournalLine[];
}

/**
 * Initialize Chart of Accounts in Firestore if not already present
 */
export async function initializeChartOfAccounts(): Promise<void> {
  try {
    const db = getFirestoreDb();
    const batch = db.batch();

    for (const account of CHART_OF_ACCOUNTS) {
      const docRef = db.collection("accounting_accounts").doc(account.accountId);
      batch.set(docRef, {
        ...account,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    await batch.commit();
    console.log("[Accounting Engine] Chart of Accounts initialized successfully.");
  } catch (err) {
    console.error("[Accounting Engine] COA initialization error:", err);
  }
}

/**
 * Helper to get Indian Financial Year string, e.g., "2026-27"
 */
export function getFinancialYearStr(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed

  if (month >= 4) {
    // April to December -> FY is current_year - next_year
    const nextYear = (year + 1).toString().slice(-2);
    return `${year}-${nextYear}`;
  } else {
    // January to March -> FY is prev_year - current_year
    const prevYear = year - 1;
    const currYearStr = year.toString().slice(-2);
    return `${prevYear}-${currYearStr}`;
  }
}

/**
 * Helper to generate sequential invoice numbers, e.g. "AIJ/2026-27/000001"
 */
export async function generateSequentialInvoiceNumber(dateInput?: string): Promise<string> {
  const db = getFirestoreDb();
  const fy = getFinancialYearStr(dateInput);
  const counterRef = db.collection("accounting_counters").doc(`inv_${fy}`);

  let nextSeq = 1;

  try {
    const snap = await counterRef.get();
    if (snap.exists) {
      nextSeq = (snap.data()?.lastSeq || 0) + 1;
    }
    await counterRef.set({
      fy,
      lastSeq: nextSeq,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn("[Accounting Engine] Counter update fallback:", err);
    nextSeq = Math.floor(Math.random() * 900000) + 100000;
  }

  const seqFormatted = nextSeq.toString().padStart(6, "0");
  return `AIJ/${fy}/${seqFormatted}`;
}

/**
 * Helper to generate sequential credit note numbers, e.g. "CN-2026-27/000001"
 */
export async function generateSequentialCreditNoteNumber(dateInput?: string): Promise<string> {
  const db = getFirestoreDb();
  const fy = getFinancialYearStr(dateInput);
  const counterRef = db.collection("accounting_counters").doc(`cn_${fy}`);

  let nextSeq = 1;

  try {
    const snap = await counterRef.get();
    if (snap.exists) {
      nextSeq = (snap.data()?.lastSeq || 0) + 1;
    }
    await counterRef.set({
      fy,
      lastSeq: nextSeq,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn("[Accounting Engine] CN Counter update fallback:", err);
    nextSeq = Math.floor(Math.random() * 900000) + 100000;
  }

  const seqFormatted = nextSeq.toString().padStart(6, "0");
  return `CN-${fy}/${seqFormatted}`;
}

/**
 * Check if accounting period is closed
 */
export async function isPeriodClosed(dateInput?: string): Promise<boolean> {
  try {
    const db = getFirestoreDb();
    const d = dateInput ? new Date(dateInput) : new Date();
    const monthStr = d.toISOString().slice(0, 7); // e.g. "2026-08"

    const periodDoc = await db.collection("accounting_periods").doc(monthStr).get();
    if (periodDoc.exists && periodDoc.data()?.status === "closed") {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Posts a double-entry journal entry to Firestore.
 * Ensures total debits equal total credits, checks idempotency, and enforces period locks.
 */
export async function postJournalEntry(params: PostJournalParams): Promise<{
  success: boolean;
  journalId?: string;
  alreadyExists?: boolean;
  error?: string;
}> {
  try {
    const db = getFirestoreDb();
    const {
      reference,
      transactionDate = new Date().toISOString(),
      description,
      userId = "",
      userEmail = "",
      role = "",
      paymentId = "",
      invoiceId = "",
      creditNoteId = "",
      expenseId = "",
      createdBy = "system",
      lines
    } = params;

    if (!reference) {
      return { success: false, error: "Reference key is required for double-entry tracking." };
    }

    if (!lines || lines.length === 0) {
      return { success: false, error: "Journal entry must contain at least two line items." };
    }

    // 1. Period Lock Validation
    const closed = await isPeriodClosed(transactionDate);
    if (closed) {
      return { success: false, error: `Accounting period for date ${transactionDate.slice(0, 10)} is closed.` };
    }

    // 2. Double-Entry Balance Check
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      const dbVal = Number((line.debit || 0).toFixed(2));
      const crVal = Number((line.credit || 0).toFixed(2));
      totalDebit += dbVal;
      totalCredit += crVal;
    }

    totalDebit = Number(totalDebit.toFixed(2));
    totalCredit = Number(totalCredit.toFixed(2));

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `Unbalanced journal entry rejected! Total Debit (₹${totalDebit}) does not equal Total Credit (₹${totalCredit}).`
      };
    }

    // 3. Idempotency Check using Reference
    const existingSnap = await db.collection("journal_entries")
      .where("reference", "==", reference)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0].data();
      return {
        success: true,
        journalId: existingDoc.journalId,
        alreadyExists: true
      };
    }

    // 4. Create Immutable Journal Entry
    const journalId = `JRN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fy = getFinancialYearStr(transactionDate);

    const journalEntryDoc = {
      journalId,
      reference,
      fy,
      transactionDate,
      description,
      totalAmount: totalDebit,
      status: "posted", // posted | reversed
      userId,
      userEmail,
      role,
      paymentId,
      invoiceId,
      creditNoteId,
      expenseId,
      createdBy,
      createdAt: new Date().toISOString(),
      lines: lines.map(l => ({
        accountId: l.accountId,
        accountName: l.accountName,
        debit: Number((l.debit || 0).toFixed(2)),
        credit: Number((l.credit || 0).toFixed(2)),
        description: l.description || description
      }))
    };

    const batch = db.batch();
    batch.set(db.collection("journal_entries").doc(journalId), journalEntryDoc);

    // Write individual journal lines for performant account ledger querying
    lines.forEach((l, idx) => {
      const lineId = `${journalId}_line_${idx + 1}`;
      batch.set(db.collection("journal_lines").doc(lineId), {
        lineId,
        journalId,
        reference,
        fy,
        transactionDate,
        accountId: l.accountId,
        accountName: l.accountName,
        debit: Number((l.debit || 0).toFixed(2)),
        credit: Number((l.credit || 0).toFixed(2)),
        description: l.description || description,
        userId,
        createdAt: new Date().toISOString()
      });
    });

    // Write Audit Log
    const auditId = `faudit_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    batch.set(db.collection("finance_audit_logs").doc(auditId), {
      id: auditId,
      action: "JOURNAL_POSTED",
      reference,
      journalId,
      amount: totalDebit,
      performedBy: createdBy,
      timestamp: new Date().toISOString(),
      description: `Journal ${journalId} posted for ${reference} (₹${totalDebit})`
    });

    await batch.commit();

    return {
      success: true,
      journalId
    };
  } catch (err: any) {
    console.error("[Accounting Engine] postJournalEntry error:", err);
    return { success: false, error: err.message || "Failed to post journal entry." };
  }
}

/**
 * Automates double-entry accounting for verified SUCCESSFUL payments.
 */
export async function processPaymentAccounting(params: {
  paymentId: string;
  userId: string;
  userEmail?: string;
  role?: string;
  planName?: string;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  customerState?: string;
  sellerState?: string;
  gatewayFee?: number;
}): Promise<{
  success: boolean;
  journalId?: string;
  invoiceNumber?: string;
  invoiceId?: string;
  error?: string;
}> {
  try {
    const db = getFirestoreDb();
    const {
      paymentId,
      userId,
      userEmail = "",
      role = "recruiter",
      planName = "Database Access Plan",
      baseAmount,
      gstAmount,
      totalAmount,
      cgst,
      sgst,
      igst,
      customerState = "Karnataka",
      sellerState = "Karnataka",
      gatewayFee = 0
    } = params;

    const refKey = `PAYMENT:${paymentId}`;

    // Calculate intrastate vs interstate GST split if not explicitly passed
    const isIntraState = customerState.trim().toLowerCase() === sellerState.trim().toLowerCase();
    const finalCgst = cgst !== undefined ? cgst : (isIntraState ? Number((gstAmount / 2).toFixed(2)) : 0);
    const finalSgst = sgst !== undefined ? sgst : (isIntraState ? Number((gstAmount / 2).toFixed(2)) : 0);
    const finalIgst = igst !== undefined ? igst : (!isIntraState ? gstAmount : 0);

    // Determine revenue account based on role
    let revenueAccountId = "4010"; // Recruiter Subscription Revenue
    let revenueAccountName = "Recruiter Subscription Revenue";

    if (role.toLowerCase().includes("consultancy")) {
      revenueAccountId = "4020";
      revenueAccountName = "Consultancy Subscription Revenue";
    }

    // 1. Generate Sequential Invoice Number
    const invoiceNumber = await generateSequentialInvoiceNumber();
    const invoiceId = `inv_${paymentId}`;

    // 2. Post Double-Entry Journal
    const journalResult = await postJournalEntry({
      reference: refKey,
      description: `Payment received for ${planName} (Invoice: ${invoiceNumber})`,
      userId,
      userEmail,
      role,
      paymentId,
      invoiceId,
      createdBy: "system",
      lines: [
        {
          accountId: "1010",
          accountName: "Bank / Payment Gateway Clearing",
          debit: totalAmount,
          credit: 0,
          description: `Total cash received via gateway for Payment ${paymentId}`
        },
        {
          accountId: revenueAccountId,
          accountName: revenueAccountName,
          debit: 0,
          credit: baseAmount,
          description: `Base plan revenue recognized for ${planName}`
        },
        {
          accountId: "2010",
          accountName: "GST Payable (Total)",
          debit: 0,
          credit: gstAmount,
          description: `Statutory GST liability (CGST: ₹${finalCgst}, SGST: ₹${finalSgst}, IGST: ₹${finalIgst})`
        }
      ]
    });

    if (!journalResult.success) {
      // Flag accounting sync pending in payment doc
      await db.collection("payments").doc(paymentId).set({
        accountingStatus: "pending_reconciliation",
        accountingError: journalResult.error
      }, { merge: true });
      return { success: false, error: journalResult.error };
    }

    // 3. Post Payment Gateway Fee Journal if fee > 0
    if (gatewayFee > 0) {
      await postJournalEntry({
        reference: `GATEWAY_FEE:${paymentId}`,
        description: `Payment gateway processing fee for Payment ${paymentId}`,
        userId,
        paymentId,
        createdBy: "system",
        lines: [
          {
            accountId: "5010",
            accountName: "Payment Gateway Charges",
            debit: gatewayFee,
            credit: 0,
            description: `Gateway charge deduction`
          },
          {
            accountId: "1010",
            accountName: "Bank / Payment Gateway Clearing",
            debit: 0,
            credit: gatewayFee,
            description: `Gateway clearing net reduction`
          }
        ]
      });
    }

    // 4. Save/Update Invoice Document in Firestore
    const invoiceDoc = {
      invoiceId,
      invoiceNumber,
      paymentId,
      userId,
      userEmail,
      role,
      planName,
      taxableAmount: baseAmount,
      gstAmount,
      cgst: finalCgst,
      sgst: finalSgst,
      igst: finalIgst,
      totalAmount,
      paymentStatus: "paid",
      invoiceDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      journalId: journalResult.journalId
    };

    await db.collection("invoices").doc(invoiceId).set(invoiceDoc, { merge: true });

    // Update payment doc with accounting metadata
    await db.collection("payments").doc(paymentId).set({
      invoiceId,
      invoiceNumber,
      journalId: journalResult.journalId,
      accountingStatus: "posted",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 5. Update Tax Ledger
    await db.collection("tax_ledger").doc(`tax_${paymentId}`).set({
      id: `tax_${paymentId}`,
      invoiceId,
      invoiceNumber,
      paymentId,
      userId,
      taxableValue: baseAmount,
      cgst: finalCgst,
      sgst: finalSgst,
      igst: finalIgst,
      totalTax: gstAmount,
      placeOfSupply: customerState,
      type: "OUTPUT_TAX",
      createdAt: new Date().toISOString()
    }, { merge: true });

    return {
      success: true,
      journalId: journalResult.journalId,
      invoiceNumber,
      invoiceId
    };
  } catch (err: any) {
    console.error("[Accounting Engine] processPaymentAccounting error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Automates refund accounting and credit note generation (Full or Partial).
 */
export async function processRefundAccounting(params: {
  refundId?: string;
  paymentId: string;
  userId: string;
  userEmail?: string;
  role?: string;
  refundAmount: number;
  originalBaseAmount: number;
  originalGstAmount: number;
  originalTotalAmount: number;
  reason?: string;
  processedBy?: string;
}): Promise<{
  success: boolean;
  creditNoteNumber?: string;
  creditNoteId?: string;
  journalId?: string;
  error?: string;
}> {
  try {
    const db = getFirestoreDb();
    const {
      refundId = `ref_${Date.now()}`,
      paymentId,
      userId,
      userEmail = "",
      role = "recruiter",
      refundAmount,
      originalBaseAmount,
      originalGstAmount,
      originalTotalAmount,
      reason = "Customer refund request",
      processedBy = "Admin"
    } = params;

    const refKey = `REFUND:${refundId}`;

    if (refundAmount <= 0) {
      return { success: false, error: "Refund amount must be greater than zero." };
    }

    if (refundAmount > originalTotalAmount) {
      return { success: false, error: "Refund amount cannot exceed original transaction total." };
    }

    // Proportionate breakdown calculation
    const refundRatio = refundAmount / originalTotalAmount;
    const baseReversed = Number((originalBaseAmount * refundRatio).toFixed(2));
    const gstReversed = Number((originalGstAmount * refundRatio).toFixed(2));

    // Determine revenue account
    let revenueAccountId = "4010";
    let revenueAccountName = "Recruiter Subscription Revenue";

    if (role.toLowerCase().includes("consultancy")) {
      revenueAccountId = "4020";
      revenueAccountName = "Consultancy Subscription Revenue";
    }

    // 1. Generate Credit Note
    const creditNoteNumber = await generateSequentialCreditNoteNumber();
    const creditNoteId = `cn_${refundId}`;

    // Lookup original invoice
    let originalInvoiceNumber = "";
    const invSnap = await db.collection("invoices").where("paymentId", "==", paymentId).limit(1).get();
    if (!invSnap.empty) {
      originalInvoiceNumber = invSnap.docs[0].data()?.invoiceNumber || "";
    }

    // 2. Post Reversal Double-Entry Journal
    const journalResult = await postJournalEntry({
      reference: refKey,
      description: `Refund processed (Credit Note: ${creditNoteNumber}, Orig Inv: ${originalInvoiceNumber || paymentId})`,
      userId,
      userEmail,
      role,
      paymentId,
      creditNoteId,
      createdBy: processedBy,
      lines: [
        {
          accountId: revenueAccountId,
          accountName: revenueAccountName,
          debit: baseReversed,
          credit: 0,
          description: `Revenue reversal for refund (₹${baseReversed})`
        },
        {
          accountId: "2010",
          accountName: "GST Payable (Total)",
          debit: gstReversed,
          credit: 0,
          description: `GST liability reduction on refund (₹${gstReversed})`
        },
        {
          accountId: "1010",
          accountName: "Bank / Payment Gateway Clearing",
          debit: 0,
          credit: refundAmount,
          description: `Cash outflow / credit adjustment to customer for refund (₹${refundAmount})`
        }
      ]
    });

    if (!journalResult.success) {
      return { success: false, error: journalResult.error };
    }

    // 3. Save Credit Note
    const creditNoteDoc = {
      creditNoteId,
      creditNoteNumber,
      refundId,
      paymentId,
      originalInvoiceNumber,
      userId,
      userEmail,
      reason,
      taxableAmountReversed: baseReversed,
      gstReversed,
      totalReversed: refundAmount,
      isPartial: refundAmount < originalTotalAmount,
      createdAt: new Date().toISOString(),
      createdBy: processedBy,
      journalId: journalResult.journalId
    };

    await db.collection("credit_notes").doc(creditNoteId).set(creditNoteDoc);

    // Update payment status
    const newStatus = refundAmount >= originalTotalAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await db.collection("payments").doc(paymentId).set({
      status: newStatus,
      refundedAmount: refundAmount,
      lastRefundAt: new Date().toISOString()
    }, { merge: true });

    // Tax Ledger Reversal
    await db.collection("tax_ledger").doc(`tax_cn_${refundId}`).set({
      id: `tax_cn_${refundId}`,
      creditNoteId,
      creditNoteNumber,
      paymentId,
      userId,
      taxableValue: -baseReversed,
      totalTax: -gstReversed,
      type: "CREDIT_NOTE_REVERSAL",
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      creditNoteNumber,
      creditNoteId,
      journalId: journalResult.journalId
    };
  } catch (err: any) {
    console.error("[Accounting Engine] processRefundAccounting error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Process vendor business expense posting
 */
export async function processExpenseAccounting(params: {
  expenseId?: string;
  vendor: string;
  category: string;
  description: string;
  amount: number;
  gstAmount?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  createdBy?: string;
}): Promise<{
  success: boolean;
  expenseId?: string;
  journalId?: string;
  error?: string;
}> {
  try {
    const db = getFirestoreDb();
    const {
      expenseId = `exp_${Date.now()}`,
      vendor,
      category,
      description,
      amount,
      gstAmount = 0,
      paymentMethod = "Bank Transfer",
      referenceNumber = "",
      createdBy = "Admin"
    } = params;

    const refKey = `EXPENSE:${expenseId}`;

    if (amount <= 0) {
      return { success: false, error: "Expense amount must be greater than zero." };
    }

    // Map expense category to Chart of Accounts
    let accountId = "5050"; // Office & General Expense default
    let accountName = "Office & General Expense";

    const catLower = category.toLowerCase();
    if (catLower.includes("marketing") || catLower.includes("ad")) {
      accountId = "5020";
      accountName = "Marketing Expense";
    } else if (catLower.includes("software") || catLower.includes("hosting") || catLower.includes("cloud")) {
      accountId = "5030";
      accountName = "Software & Hosting Expense";
    } else if (catLower.includes("gateway") || catLower.includes("processing")) {
      accountId = "5010";
      accountName = "Payment Gateway Charges";
    } else if (catLower.includes("professional") || catLower.includes("legal") || catLower.includes("audit")) {
      accountId = "5040";
      accountName = "Professional Fees Expense";
    }

    const netExpense = amount - gstAmount;

    const lines: JournalLine[] = [
      {
        accountId,
        accountName,
        debit: netExpense > 0 ? netExpense : amount,
        credit: 0,
        description: `Vendor Expense (${vendor}): ${description}`
      }
    ];

    if (gstAmount > 0) {
      lines.push({
        accountId: "2010",
        accountName: "GST Payable (Total)",
        debit: gstAmount, // GST Input tax credit reduces GST payable
        credit: 0,
        description: `GST Input Tax Credit on ${vendor} expense`
      });
    }

    lines.push({
      accountId: "1010",
      accountName: "Bank / Payment Gateway Clearing",
      debit: 0,
      credit: amount,
      description: `Cash outflow for vendor expense (${paymentMethod})`
    });

    const journalResult = await postJournalEntry({
      reference: refKey,
      description: `Vendor Expense: ${vendor} - ${category}`,
      expenseId,
      createdBy,
      lines
    });

    if (!journalResult.success) {
      return { success: false, error: journalResult.error };
    }

    // Save Expense Document
    const expenseDoc = {
      expenseId,
      vendor,
      category,
      description,
      amount,
      gstAmount,
      paymentMethod,
      referenceNumber,
      createdBy,
      createdAt: new Date().toISOString(),
      journalId: journalResult.journalId
    };

    await db.collection("expenses").doc(expenseId).set(expenseDoc);

    return {
      success: true,
      expenseId,
      journalId: journalResult.journalId
    };
  } catch (err: any) {
    console.error("[Accounting Engine] processExpenseAccounting error:", err);
    return { success: false, error: err.message };
  }
}
