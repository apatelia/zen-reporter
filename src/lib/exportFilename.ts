/**
 * Date range bounds for dataset export filtering.
 */
export interface DateFilterRange {
  fromTimestamp: number | null;
  toTimestamp: number | null;
  label?: string | null;
}

/**
 * Filter criteria used to construct contextual CSV filenames.
 */
export interface FilterDescriptor {
  dateRange?: DateFilterRange | null;
  searchTerm?: string | null;
  additionalTags?: (string | null | undefined)[];
}

/**
 * Converts any text string into a clean, filesystem-safe kebab-case slug.
 * Removes illegal OS path characters (/ \ : * ? " < > |) and normalizes separators.
 *
 * @param text - Raw input string to slugify.
 * @returns Clean kebab-case string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formats a Date or timestamp into YYYY-MM-DD string.
 *
 * @param dateOrTs - Date instance, timestamp number, or date string.
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if invalid.
 */
export function formatDateSlug(dateOrTs: Date | number | string): string {
  const d = new Date(dateOrTs);

  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
}

/**
 * Formats a Date into HHmm string (24-hour time format, e.g. 1430 for 2:30 PM).
 *
 * @param date - Date object (defaults to current Date).
 * @returns 4-digit 24-hour time string (HHmm).
 */
export function formatTimeHHMM(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');

  return `${h}${m}`;
}

/**
 * Generates a clean, slugified string representing active filter states.
 *
 * @param filters - Optional active filter options (date range, search term, tags).
 * @returns Joined filter slug string or empty string if no filters applied.
 */
export function formatFilterSlug(filters?: FilterDescriptor): string {
  if (!filters) return '';

  const parts: string[] = [];

  // 1. Date Filter Range
  const { dateRange } = filters;
  if (dateRange && (dateRange.label || dateRange.fromTimestamp || dateRange.toTimestamp)) {
    if (dateRange.label) {
      // Check if the label is formatted like DD/MM/YYYY to DD/MM/YYYY or DD/MM/YYYY - DD/MM/YYYY
      const rangeMatch = dateRange.label.match(
        /^(\d{2})\/(\d{2})\/(\d{4})\s*(?:to|-)\s*(\d{2})\/(\d{2})\/(\d{4})$/
      );

      if (rangeMatch) {
        const [, d1, m1, y1, d2, m2, y2] = rangeMatch;
        parts.push(`${y1}-${m1}-${d1}-to-${y2}-${m2}-${d2}`);
      } else {
        // Presets like "Last 30 Days", "October 2026", "This Month"
        const labelSlug = slugify(dateRange.label);
        if (labelSlug) parts.push(labelSlug);
      }
    } else if (dateRange.fromTimestamp && dateRange.toTimestamp) {
      const fromDate = new Date(dateRange.fromTimestamp);
      const toDate = new Date(dateRange.toTimestamp);

      // Single Month check (e.g. 1st day to last day of same month)
      const isStartOfMonth = fromDate.getDate() === 1;
      const isSameMonthAndYear =
        fromDate.getFullYear() === toDate.getFullYear() &&
        fromDate.getMonth() === toDate.getMonth();

      if (isStartOfMonth && isSameMonthAndYear) {
        const monthName = fromDate.toLocaleString('en-US', { month: 'long' }).toLowerCase();
        parts.push(`${monthName}-${fromDate.getFullYear()}`);
      } else {
        const fromStr = formatDateSlug(fromDate);
        const toStr = formatDateSlug(toDate);
        parts.push(`${fromStr}-to-${toStr}`);
      }
    } else if (dateRange.fromTimestamp) {
      parts.push(`from-${formatDateSlug(dateRange.fromTimestamp)}`);
    } else if (dateRange.toTimestamp) {
      parts.push(`until-${formatDateSlug(dateRange.toTimestamp)}`);
    }
  }

  // 2. Search Term Filter
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const searchSlug = slugify(filters.searchTerm.trim()).slice(0, 30); // truncate for length safety

    if (searchSlug) {
      parts.push(`search-${searchSlug}`);
    }
  }

  // 3. Additional Filter Tags (e.g. status='failed', project='frontend')
  if (filters.additionalTags && filters.additionalTags.length > 0) {
    filters.additionalTags.forEach((tag) => {
      if (tag && tag.trim()) {
        const tagSlug = slugify(tag.trim());

        if (tagSlug) parts.push(tagSlug);
      }
    });
  }

  return parts.join('_');
}

/**
 * Generates dynamic filename for CSV export adhering to pattern:
 * [dataset-name]_[filter-descriptors]_[YYYY-MM-DD]_[HHmm].csv
 *
 * @param datasetName - Human readable dataset/table name (e.g. "Flaky Tests", "Test Regressions").
 * @param filters - Active filter descriptors (date bounds, search, tags).
 * @param exportDate - Optional export date override (defaults to current date/time).
 * @returns Fully formatted CSV file name string.
 */
export function generateExportFilename(
  datasetName: string,
  filters?: FilterDescriptor,
  exportDate: Date = new Date()
): string {
  const baseSlug = slugify(datasetName) || 'report';
  const filterSlug = formatFilterSlug(filters);
  const dateStr = formatDateSlug(exportDate);
  const timeStr = formatTimeHHMM(exportDate);

  const parts = [baseSlug];
  if (filterSlug) {
    parts.push(filterSlug);
  }

  parts.push(dateStr);
  parts.push(timeStr);

  return `${parts.join('_')}.csv`;
}
