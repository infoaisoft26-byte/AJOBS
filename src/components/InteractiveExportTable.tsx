import React, { useState, useMemo } from "react";
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Download, EyeOff, Check, RefreshCw, Layers, ExternalLink, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { connectGoogleSheets, exportToGoogleSheets } from "../services/googleSheetsService";

interface ColumnDefinition<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  defaultHidden?: boolean;
}

interface InteractiveExportTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  exportFileName?: string;
  title?: string;
  id: string;
  className?: string;
}

export default function InteractiveExportTable<T extends Record<string, any>>({
  data,
  columns,
  exportFileName = "exported_report",
  title = "Interactive Data Table",
  id,
  className = "",
}: InteractiveExportTableProps<T>) {
  // 1. Column Visibility State (Column Toggling)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    columns.forEach(col => {
      initial[col.key as string] = !col.defaultHidden;
    });
    return initial;
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Google Sheets Export States
  const [isExportingToSheets, setIsExportingToSheets] = useState(false);
  const [generatedSheetUrl, setGeneratedSheetUrl] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const handleExportGoogleSheets = async () => {
    if (data.length === 0) {
      alert("No data available to export.");
      return;
    }

    setIsExportingToSheets(true);
    setSheetError(null);
    setGeneratedSheetUrl(null);

    try {
      // 1. Request access token
      await connectGoogleSheets();

      // 2. Prepare headers and rows for visible columns only
      const activeColumnsList = columns.filter(col => visibleKeys[col.key as string]);
      const headers = activeColumnsList.map(col => col.label);

      const rows = data.map(item => {
        return activeColumnsList.map(col => {
          let val = item[col.key as string];
          if (typeof val === "object" && val !== null) {
            val = JSON.stringify(val);
          }
          return val ?? "";
        });
      });

      // 3. Export to sheets
      const result = await exportToGoogleSheets(
        title || "AIJobs Export Report",
        headers,
        rows
      );

      setGeneratedSheetUrl(result.spreadsheetUrl);
    } catch (err: any) {
      console.error("Google Sheets export error:", err);
      setSheetError(err?.message || "Failed to export data to Google Sheets.");
    } finally {
      setIsExportingToSheets(false);
    }
  };

  // 2. Sorting State
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Toggle Visibility handler
  const toggleColumn = (key: string) => {
    setVisibleKeys(prev => {
      const next = { ...prev };
      next[key] = !next[key];
      // Ensure at least one column is visible
      const hasVisible = Object.values(next).some(v => v);
      return hasVisible ? next : prev;
    });
  };

  // Sort handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // 3. Process data with Sorting
  const processedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDirection === "asc"
        ? (valA > valB ? 1 : -1)
        : (valA < valB ? 1 : -1);
    });
  }, [data, sortKey, sortDirection]);

  // 4. Excel/CSV Export using the xlsx library
  const handleExportExcel = () => {
    if (data.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Filter export objects to only include visible columns
    const exportData = data.map(item => {
      const row: Record<string, any> = {};
      columns.forEach(col => {
        if (visibleKeys[col.key as string]) {
          // Flatten/extract value
          let val = item[col.key as string];
          if (typeof val === "object" && val !== null) {
            val = JSON.stringify(val);
          }
          row[col.label] = val;
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Sheet");
    
    // Write XLSX binary
    XLSX.writeFile(workbook, `${exportFileName}.xlsx`);
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      alert("No data available to export.");
      return;
    }

    const exportData = data.map(item => {
      const row: Record<string, any> = {};
      columns.forEach(col => {
        if (visibleKeys[col.key as string]) {
          let val = item[col.key as string];
          if (typeof val === "object" && val !== null) {
            val = JSON.stringify(val);
          }
          row[col.label] = val;
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${exportFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeColumns = columns.filter(col => visibleKeys[col.key as string]);

  return (
    <div id={id} className={`space-y-4 ${className}`}>
      {/* Table Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            {title}
          </h4>
          <p className="text-[10px] text-gray-400 font-mono">
            Interactive view | columns visible: {activeColumns.length}/{columns.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto relative">
          {/* Column toggling button dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold bg-[#11111a] border border-white/10 hover:border-indigo-500/50 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
              <span>Toggle Columns</span>
            </button>

            {showColumnDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowColumnDropdown(false)} 
                />
                <div className="absolute right-0 mt-2 w-48 bg-[#0a0a10] border border-white/10 rounded-xl p-2 z-50 shadow-2xl font-mono text-[10px] space-y-1">
                  <div className="text-gray-500 px-2 py-1 border-b border-white/5 font-extrabold uppercase text-[8px] tracking-wider mb-1">
                    Select visible attributes
                  </div>
                  {columns.map(col => {
                    const isVisible = !!visibleKeys[col.key as string];
                    return (
                      <button
                        key={col.key as string}
                        onClick={() => toggleColumn(col.key as string)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left text-gray-300 hover:text-white transition-all cursor-pointer"
                      >
                        <span>{col.label}</span>
                        {isVisible ? (
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded border border-white/25" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Export XLS */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 hover:text-blue-200 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Export Google Sheets */}
          <button
            onClick={handleExportGoogleSheets}
            disabled={isExportingToSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 hover:text-green-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingToSheets ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
            )}
            <span>Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Status Banner */}
      {(isExportingToSheets || generatedSheetUrl || sheetError) && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl border text-[11px] font-mono transition-all animate-in fade-in slide-in-from-top-2 duration-200 bg-[#0f0f18]/60 border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {isExportingToSheets && (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-green-400" />
                <span className="text-gray-300">Compiling dataset and writing to Google Sheets...</span>
              </>
            )}
            {generatedSheetUrl && (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-gray-300">Successfully exported! Your data is live in your Google Drive.</span>
              </>
            )}
            {sheetError && (
              <span className="text-red-400">Error: {sheetError}</span>
            )}
          </div>
          {generatedSheetUrl && (
            <a
              href={generatedSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 font-bold transition-all"
            >
              <span>Open Spreadsheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Main Table Interface with dynamic column visibility and responsive layouts */}
      <div className="border border-white/5 rounded-2xl overflow-hidden bg-zinc-950/20">
        
        {/* DESKTOP TABULAR VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead>
              <tr className="bg-zinc-900/60 border-b border-white/5 text-gray-400">
                {activeColumns.map(col => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th 
                      key={col.key as string}
                      onClick={() => col.sortable !== false && handleSort(col.key as string)}
                      className={`p-3.5 select-none font-bold tracking-wider uppercase ${col.sortable !== false ? "cursor-pointer hover:bg-white/5 text-gray-200 hover:text-white" : ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {col.sortable !== false && (
                          isSorted ? (
                            sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-gray-500 opacity-60" />
                          )
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {processedData.length > 0 ? (
                processedData.map((item, idx) => (
                  <tr key={item.uid || item.id || idx} className="hover:bg-white/5 transition-all">
                    {activeColumns.map(col => (
                      <td key={col.key as string} className="p-3.5">
                        {col.render 
                          ? col.render(item[col.key as string], item) 
                          : String(item[col.key as string] ?? "-")
                        }
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeColumns.length} className="text-center py-12 text-gray-500 italic">
                    No data matrix rows available matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE STACKABLE RESPONSIVE CARD VIEW */}
        <div className="block md:hidden divide-y divide-white/5">
          {processedData.length > 0 ? (
            processedData.map((item, idx) => (
              <div 
                key={item.uid || item.id || idx} 
                className="p-4 bg-zinc-950/40 hover:bg-zinc-900/30 transition-all space-y-2.5 text-xs"
              >
                {activeColumns.map(col => (
                  <div key={col.key as string} className="flex flex-col space-y-1">
                    <span className="text-[9px] uppercase font-mono text-gray-400 font-bold tracking-widest">
                      {col.label}
                    </span>
                    <div className="text-gray-200 font-mono">
                      {col.render 
                        ? col.render(item[col.key as string], item) 
                        : String(item[col.key as string] ?? "-")
                      }
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 italic text-xs font-mono">
              No data matrix rows available matching criteria.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
