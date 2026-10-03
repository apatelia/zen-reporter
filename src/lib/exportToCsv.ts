/**
 * Lightweight CSV Export helper (zero 3rd-party dependencies).
 * Properly escapes fields with commas, quotes, and newlines per RFC 4180.
 */

export type CsvRowValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  getValue: (item: T, index: number) => CsvRowValue;
}

/**
 * Escapes a single cell value for CSV compliance (RFC 4180).
 * Wraps values containing commas, quotes, or newlines in double quotes and escapes embedded quotes.
 *
 * @param value - Cell value to escape.
 * @returns Escaped CSV cell string.
 */
export function escapeCsvCell(value: CsvRowValue): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of data items and column definitions into an RFC 4180 compliant CSV string.
 *
 * @template T - Data item type.
 * @param data - Array of data records.
 * @param columns - Column definition specifications.
 * @returns RFC 4180 formatted CSV string with CRLF line breaks.
 */
export function exportToCsvString<T>(data: T[], columns: CsvColumn<T>[]): string {
  const headerRow = columns.map((col) => escapeCsvCell(col.header)).join(',');
  const bodyRows = data.map((item, index) =>
    columns.map((col) => escapeCsvCell(col.getValue(item, index))).join(',')
  );

  return [headerRow, ...bodyRows].join('\r\n');
}

/**
 * Triggers a browser file download of a CSV dataset. Uses modern File System Access API with Save As dialog where supported.
 *
 * @template T - Data item type.
 * @param filename - Target download file name.
 * @param data - Array of data records to export.
 * @param columns - Column definitions for CSV formatting.
 * @returns Promise resolving when download initialization completes or is cancelled by user.
 */
export async function downloadCsv<T>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[]
): Promise<void> {
  if (data.length === 0) return;

  const defaultFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const csvContent = exportToCsvString(data, columns);
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // Modern browsers (Chrome, Edge, Opera, etc.): File System Access API
  if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultFilename,
        types: [
          {
            description: 'CSV File',
            accept: { 'text/csv': ['.csv'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: unknown) {
      // If user cancelled the Save File picker modal, gracefully abort
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      // Otherwise fall through to classic anchor download trigger
    }
  }

  // Fallback for browsers without showSaveFilePicker support (e.g. Firefox)
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
