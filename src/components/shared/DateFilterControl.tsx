import { useState, useRef, useEffect, useMemo } from 'react';
import DatePicker from '@/components/shared/DatePicker';

export interface DateFilterRange {
  fromTimestamp: number | null;
  toTimestamp: number | null;
  label?: string | null;
}

interface DateFilterControlProps {
  onFilterChange: (range: DateFilterRange) => void;
  availableTimestamps?: string[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function toInputDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatIsoToDDMMYYYY(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return isoDateStr;
}

export default function DateFilterControl({
  onFilterChange,
  availableTimestamps = [],
}: DateFilterControlProps) {
  const [currentYear] = useState(() => new Date().getFullYear());

  // Extract available years, months, and min/max date bounds from dataset if provided
  const datasetYearsMonths = useMemo(() => {
    const yearSet = new Set<number>();
    const monthYearMap = new Map<string, boolean>();
    let minTs = Infinity;
    let maxTs = -Infinity;

    availableTimestamps.forEach((ts) => {
      const d = new Date(ts);
      const time = d.getTime();
      if (!isNaN(time)) {
        const y = d.getFullYear();
        const m = d.getMonth();
        yearSet.add(y);
        monthYearMap.set(`${y}-${m}`, true);
        if (time < minTs) minTs = time;
        if (time > maxTs) maxTs = time;
      }
    });

    const years = Array.from(yearSet).sort((a, b) => b - a);

    const hasData = (y: number, m: number) => monthYearMap.has(`${y}-${m}`);

    const hasTimestamps = minTs !== Infinity && maxTs !== -Infinity;
    const minDateStr = hasTimestamps ? toInputDateString(new Date(minTs)) : undefined;
    const maxDateStr = hasTimestamps ? toInputDateString(new Date(maxTs)) : undefined;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let has7DaysData = !availableTimestamps.length;
    let has30DaysData = !availableTimestamps.length;
    let has90DaysData = !availableTimestamps.length;
    let hasThisMonthData = !availableTimestamps.length;

    if (hasTimestamps) {
      const minDate = new Date(minTs);
      const maxDate = new Date(maxTs);

      // Check if dataset spans across month or year boundaries
      const spansMonthBoundary =
        minDate.getFullYear() !== maxDate.getFullYear() ||
        minDate.getMonth() !== maxDate.getMonth();

      // Dataset has data going back 7, 30 or more days, or dataset span >= 7 days
      const isSpanAtLeast7Days = minTs <= sevenDaysAgo || maxTs - minTs >= 7 * 24 * 60 * 60 * 1000;
      const isSpanAtLeast30Days = minTs <= thirtyDaysAgo;

      has7DaysData = isSpanAtLeast7Days;
      has30DaysData = isSpanAtLeast30Days || spansMonthBoundary;
      has90DaysData = isSpanAtLeast30Days;

      // "This Month" preset is available if any timestamp falls within current month
      const nowDate = new Date();
      const thisMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
      const thisMonthEnd = new Date(
        nowDate.getFullYear(),
        nowDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ).getTime();

      hasThisMonthData = availableTimestamps.some((ts) => {
        const t = new Date(ts).getTime();
        return !isNaN(t) && t >= thisMonthStart && t <= thisMonthEnd;
      });
    }

    return {
      years: years.length > 0 ? years : [currentYear],
      hasData,
      minDateStr,
      maxDateStr,
      minTs: hasTimestamps ? minTs : null,
      maxTs: hasTimestamps ? maxTs : null,
      has7DaysData,
      has30DaysData,
      has90DaysData,
      hasThisMonthData,
    };
  }, [availableTimestamps, currentYear]);

  const [mode, setMode] = useState<'all' | 'month' | 'range'>('all');
  const [activePreset, setActivePreset] = useState<
    'thisMonth' | 'last7Days' | 'last30Days' | 'last90Days' | null
  >(null);
  const [popoverYear, setPopoverYear] = useState<number>(
    datasetYearsMonths.years[0] ?? currentYear
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState(false);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [appliedLabel, setAppliedLabel] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const monthPopoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthPopoverRef.current && !monthPopoverRef.current.contains(event.target as Node)) {
        setIsMonthPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyMonthFilter = (monthIndex = selectedMonth, year = selectedYear) => {
    if (monthIndex === null || year === null) return;
    setMode('month');
    setActivePreset(null);
    const fromDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const toDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const labelStr = `${MONTH_NAMES[monthIndex]} ${year}`;

    setStartDate(toInputDateString(fromDate));
    setEndDate(toInputDateString(toDate));
    setAppliedLabel(labelStr);
    setIsDirty(false);

    onFilterChange({
      fromTimestamp: fromDate.getTime(),
      toTimestamp: toDate.getTime(),
      label: labelStr,
    });
  };

  const handleSelectMonthGrid = (monthIndex: number, year: number) => {
    setSelectedMonth(monthIndex);
    setSelectedYear(year);
    setIsMonthPopoverOpen(false);
    handleApplyMonthFilter(monthIndex, year);
  };

  const handleApplyRangeFilter = () => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) return;

    let fromTime: number | null = null;
    let toTime: number | null = null;

    const fromD = new Date(`${startDate}T00:00:00`);
    if (!isNaN(fromD.getTime())) fromTime = fromD.getTime();

    const toD = new Date(`${endDate}T23:59:59.999`);
    if (!isNaN(toD.getTime())) toTime = toD.getTime();

    const labelStr = `${formatIsoToDDMMYYYY(startDate)} to ${formatIsoToDDMMYYYY(endDate)}`;

    setMode('range');
    setActivePreset(null);
    setAppliedLabel(labelStr);
    setIsDirty(false);

    onFilterChange({
      fromTimestamp: fromTime,
      toTimestamp: toTime,
      label: labelStr,
    });
  };

  const handlePreset = (presetType: 'thisMonth' | 'last7Days' | 'last30Days' | 'last90Days') => {
    if (activePreset === presetType) {
      handleClearFilter();
      return;
    }

    const now = new Date();
    let rawFromTime: number;
    let rawToTime: number;

    let presetLabel: string;
    if (presetType === 'thisMonth') {
      const y = now.getFullYear();
      const m = now.getMonth();
      presetLabel = `${MONTH_NAMES[m]} ${y}`;
      rawFromTime = new Date(y, m, 1, 0, 0, 0, 0).getTime();
      rawToTime = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();
      setSelectedMonth(m);
      setSelectedYear(y);
      setMode('month');
    } else if (presetType === 'last7Days') {
      presetLabel = 'Last 7 Days';
      rawFromTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      rawToTime = now.getTime();
      setMode('range');
    } else if (presetType === 'last30Days') {
      presetLabel = 'Last 30 Days';
      rawFromTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      rawToTime = now.getTime();
      setMode('range');
    } else {
      presetLabel = 'Last 90 Days';
      rawFromTime = now.getTime() - 90 * 24 * 60 * 60 * 1000;
      rawToTime = now.getTime();
      setMode('range');
    }

    // Clamp effective range to available dataset bounds for accurate display & filter
    const effectiveFromTime = datasetYearsMonths.minTs
      ? Math.max(rawFromTime, datasetYearsMonths.minTs)
      : rawFromTime;
    const effectiveToTime = datasetYearsMonths.maxTs
      ? Math.min(rawToTime, datasetYearsMonths.maxTs)
      : rawToTime;

    const startStr = toInputDateString(new Date(effectiveFromTime));
    const endStr = toInputDateString(new Date(effectiveToTime));

    const fromD = new Date(`${startStr}T00:00:00`);
    const toD = new Date(`${endStr}T23:59:59.999`);

    const labelStr = `${formatIsoToDDMMYYYY(startStr)} to ${formatIsoToDDMMYYYY(endStr)}`;

    setStartDate(startStr);
    setEndDate(endStr);
    setActivePreset(presetType);
    setAppliedLabel(labelStr);
    setIsDirty(false);

    onFilterChange({
      fromTimestamp: fromD.getTime(),
      toTimestamp: toD.getTime(),
      label: presetLabel,
    });
  };

  const handleClearFilter = () => {
    setMode('all');
    setActivePreset(null);
    setSelectedMonth(null);
    setSelectedYear(null);
    setStartDate('');
    setEndDate('');
    setAppliedLabel(null);
    setIsDirty(false);
    setIsMonthPopoverOpen(false);
    onFilterChange({
      fromTimestamp: null,
      toTimestamp: null,
      label: null,
    });
  };

  const selectedMonthLabel =
    selectedMonth !== null && selectedYear !== null
      ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
      : 'Select Month';

  const isFilterApplied = appliedLabel !== null || activePreset !== null;

  return (
    <div className="flex flex-col gap-2">
      {/* Primary Row: Mode Tabs, Date Inputs & Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Segmented Mode Selector */}
        <div className="inline-flex items-center rounded-md border border-border-default bg-surface-100 p-0.5 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={handleClearFilter}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
              mode === 'all'
                ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                : 'border border-transparent text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary font-medium'
            }`}
          >
            <span>All Time</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('month');
              setIsMonthPopoverOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
              mode === 'month'
                ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                : 'border border-transparent text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary font-medium'
            }`}
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Month</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('range');
              setIsMonthPopoverOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
              mode === 'range'
                ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                : 'border border-transparent text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary font-medium'
            }`}
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span>Date Range</span>
          </button>
        </div>

        {/* Month Mode Picker Control */}
        {mode === 'month' && (
          <div className="flex items-center gap-2">
            <div className="relative" ref={monthPopoverRef}>
              <button
                type="button"
                onClick={() => setIsMonthPopoverOpen(!isMonthPopoverOpen)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-50 px-3 py-1.5 text-xs font-semibold text-text-ink dark:text-text-on-primary shadow-xs hover:border-accent-blue transition-colors cursor-pointer"
              >
                <span>📅 {selectedMonthLabel}</span>
                <svg
                  className={`h-3.5 w-3.5 text-text-body-mid transition-transform ${isMonthPopoverOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Month Grid Popover */}
              {isMonthPopoverOpen && (
                <div className="absolute left-0 z-50 mt-1.5 w-64 rounded-lg border border-border-default bg-canvas p-3 shadow-2xl ring-1 ring-black/5 dark:bg-canvas">
                  {/* Year Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-default">
                    <button
                      type="button"
                      onClick={() => setPopoverYear((y) => y - 1)}
                      className="rounded p-1 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:hover:text-text-on-primary transition-colors cursor-pointer"
                      title="Previous Year"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs font-bold text-text-ink dark:text-text-on-primary">
                      {popoverYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPopoverYear((y) => y + 1)}
                      className="rounded p-1 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:hover:text-text-on-primary transition-colors cursor-pointer"
                      title="Next Year"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* 12 Months Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHORT_MONTH_NAMES.map((mName, idx) => {
                      const isSelected = selectedMonth === idx && selectedYear === popoverYear;
                      const hasData = datasetYearsMonths.hasData(popoverYear, idx);

                      return (
                        <button
                          key={mName}
                          type="button"
                          disabled={!hasData}
                          onClick={() => handleSelectMonthGrid(idx, popoverYear)}
                          className={`relative rounded-md py-2 text-center text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-accent-blue text-text-on-primary dark:text-surface-950 font-bold shadow-xs cursor-pointer'
                              : hasData
                                ? 'bg-surface-50 text-text-ink hover:bg-surface-100 dark:text-text-on-primary dark:hover:bg-surface-200 cursor-pointer'
                                : 'bg-surface-50/50 text-text-muted-soft opacity-40 cursor-not-allowed dark:text-text-muted'
                          }`}
                        >
                          {mName}
                          {hasData && !isSelected && (
                            <span
                              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent-blue"
                              title="Data available"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date Range Mode Inputs */}
        {mode === 'range' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <DatePicker
              value={startDate}
              min={datasetYearsMonths.minDateStr}
              max={endDate || datasetYearsMonths.maxDateStr}
              onChange={(val) => {
                setStartDate(val);
                setIsDirty(true);
              }}
              title="Start Date (DD/MM/YYYY)"
            />
            <span className="text-text-body-mid dark:text-text-muted font-medium">to</span>
            <DatePicker
              value={endDate}
              min={startDate || datasetYearsMonths.minDateStr}
              max={datasetYearsMonths.maxDateStr}
              onChange={(val) => {
                setEndDate(val);
                setIsDirty(true);
              }}
              title="End Date (DD/MM/YYYY)"
            />
          </div>
        )}

        {/* Dynamic Action Button: Apply Filter vs Clear Filter */}
        {mode === 'month' && (isDirty || !isFilterApplied) ? (
          <button
            type="button"
            onClick={() => handleApplyMonthFilter()}
            disabled={selectedMonth === null || selectedYear === null}
            className="rounded-md bg-accent-blue px-3 py-1.5 text-xs font-bold text-text-on-primary dark:text-surface-950 hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
          >
            Apply Filter
          </button>
        ) : mode === 'range' && (isDirty || !isFilterApplied) ? (
          <button
            type="button"
            onClick={handleApplyRangeFilter}
            disabled={!startDate || !endDate || startDate > endDate}
            title={
              !startDate
                ? 'Please select a start date'
                : !endDate
                  ? 'Please select an end date'
                  : startDate > endDate
                    ? 'Start date cannot be after end date'
                    : 'Apply date range filter'
            }
            className="rounded-md bg-accent-blue px-3 py-1.5 text-xs font-bold text-text-on-primary dark:text-surface-950 hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
          >
            Apply Filter
          </button>
        ) : isFilterApplied ? (
          <button
            type="button"
            onClick={handleClearFilter}
            className="inline-flex items-center gap-1.5 rounded-md bg-danger-600 text-white font-bold px-3 py-1.5 text-xs shadow-xs hover:bg-danger-700 transition-colors cursor-pointer"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Clear Filter</span>
          </button>
        ) : null}

        {/* Quick Presets */}
        {(datasetYearsMonths.hasThisMonthData ||
          datasetYearsMonths.has7DaysData ||
          datasetYearsMonths.has30DaysData ||
          datasetYearsMonths.has90DaysData) && (
          <div className="flex items-center gap-1.5 border-l border-border-default/60 pl-2 ml-1">
            {datasetYearsMonths.hasThisMonthData && (
              <button
                type="button"
                onClick={() => handlePreset('thisMonth')}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === 'thisMonth'
                    ? 'border-success-600 bg-success-600 text-white dark:bg-success-600 dark:text-white shadow-xs font-bold'
                    : 'border-border-default bg-surface-50 text-text-body-mid hover:border-accent-blue hover:text-text-ink dark:hover:text-text-on-primary'
                }`}
              >
                <span>This Month</span>
                {activePreset === 'thisMonth' && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}

            {datasetYearsMonths.has7DaysData && (
              <button
                type="button"
                onClick={() => handlePreset('last7Days')}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === 'last7Days'
                    ? 'border-success-600 bg-success-600 text-white dark:bg-success-600 dark:text-white shadow-xs font-bold'
                    : 'border-border-default bg-surface-50 text-text-body-mid hover:border-accent-blue hover:text-text-ink dark:hover:text-text-on-primary'
                }`}
              >
                <span>Last 7 Days</span>
                {activePreset === 'last7Days' && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}

            {datasetYearsMonths.has30DaysData && (
              <button
                type="button"
                onClick={() => handlePreset('last30Days')}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === 'last30Days'
                    ? 'border-success-600 bg-success-600 text-white dark:bg-success-600 dark:text-white shadow-xs font-bold'
                    : 'border-border-default bg-surface-50 text-text-body-mid hover:border-accent-blue hover:text-text-ink dark:hover:text-text-on-primary'
                }`}
              >
                <span>Last 30 Days</span>
                {activePreset === 'last30Days' && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}

            {datasetYearsMonths.has90DaysData && (
              <button
                type="button"
                onClick={() => handlePreset('last90Days')}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === 'last90Days'
                    ? 'border-success-600 bg-success-600 text-white dark:bg-success-600 dark:text-white shadow-xs font-bold'
                    : 'border-border-default bg-surface-50 text-text-body-mid hover:border-accent-blue hover:text-text-ink dark:hover:text-text-on-primary'
                }`}
              >
                <span>Last 90 Days</span>
                {activePreset === 'last90Days' && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
