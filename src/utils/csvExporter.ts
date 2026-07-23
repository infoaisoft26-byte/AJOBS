/**
 * Utility to generate and download RFC-4180 compliant CSV files
 */

export interface CsvData {
  filename: string;
  title: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

export function downloadCsv({ filename, title, headers, rows }: CsvData): void {
  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM for Excel compatibility
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const formattedDate = new Date().toISOString().slice(0, 10);
  const cleanFilename = `${filename.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${formattedDate}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
