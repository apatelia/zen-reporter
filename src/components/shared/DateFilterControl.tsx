import { useState, useRef, useEffect, useMemo } from 'react';

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

function FormattedDateInput({
  value,
  onChange,
  title,
}: {
  value: string;
  onChange: (val: string) => void;
  title: string;
}) {
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const [typedText, setTypedText] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    setTypedText(null);
  }

  const displayText = useMemo(() => {
    if (typedText !== null) return typedText;
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}/${m}/${y}`;
    }
    return value;
  }, [value, typedText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTypedText(raw);

    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      onChange(`${year}-${month}-${day}`);
    } else if (raw === '') {
      onChange('');
    }
  };

  const handleOpenPicker = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        hiddenDateRef.current.showPicker();
      } else {
        hiddenDateRef.current.focus();
        hiddenDateRef.current.click();
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="text"
        value={displayText}
        onChange={handleTextChange}
        placeholder="DD/MM/YYYY"
        title={title}
        className="w-32 rounded-md border border-border-default bg-surface-50 py-1.5 pl-2.5 pr-8 text-xs font-medium text-text-ink placeholder-text-muted-soft outline-none focus:ring-1 focus:ring-accent-blue dark:text-text-on-primary shadow-xs"
      />
      <button
        type="button"
        onClick={handleOpenPicker}
        className="absolute right-2 p-0.5 text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer"
        title="Open calendar picker"
      >
        <svg
          className="h-3.5 w-3.5"
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
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        value={value}
        onChange={(e) => {
          setTypedText(null);
          onChange(e.target.value);
        }}
        className="absolute right-0 bottom-0 opacity-0 pointer-events-none w-8 h-8"
        tabIndex={-1}
      />
    </div>
  );
}

export default function DateFilterControl({
  onFilterChange,
  availableTimestamps = [],
}: DateFilterControlProps) {
  const [currentYear] = useState(() => new Date().getFullYear());

  // Extract available years and months from dataset if provided
  const datasetYearsMonths = useMemo(() => {
    const yearSet = new Set<number>();
    const monthYearMap = new Map<string, boolean>();

    availableTimestamps.forEach((ts) => {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = d.getMonth();
        yearSet.add(y);
        monthYearMap.set(`${y}-${m}`, true);
      }
    });

    const years = Array.from(yearSet).sort((a, b) => b - a);
    return {
      years: years.length > 0 ? years : [currentYear],
      hasData: (y: number, m: number) => monthYearMap.has(`${y}-${m}`),
    };
  }, [availableTimestamps, currentYear]);

  const [mode, setMode] = useState<'all' | 'month' | 'range'>('all');
  const [activePreset, setActivePreset] = useState<
    'thisMonth' | 'last30Days' | 'last90Days' | null
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

  const handleSelectMonthGrid = (monthIndex: number, year: number) => {
    setSelectedMonth(monthIndex);
    setSelectedYear(year);
    setIsMonthPopoverOpen(false);
    const startD = new Date(year, monthIndex, 1);
    const endD = new Date(year, monthIndex + 1, 0);
    setStartDate(toInputDateString(startD));
    setEndDate(toInputDateString(endD));
    setIsDirty(true);
  };

  const handleApplyMonthFilter = () => {
    if (selectedMonth === null || selectedYear === null) return;
    setMode('month');
    setActivePreset(null);
    const fromDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
    const toDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    const labelStr = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

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

  const handlePreset = (presetType: 'thisMonth' | 'last30Days' | 'last90Days') => {
    if (activePreset === presetType) {
      handleClearFilter();
      return;
    }

    const now = new Date();
    let fromTime: number | null = null;
    let toTime: number | null = null;
    let labelStr = '';

    if (presetType === 'thisMonth') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const startD = new Date(y, m, 1, 0, 0, 0, 0);
      const endD = new Date(y, m + 1, 0, 23, 59, 59, 999);
      fromTime = startD.getTime();
      toTime = endD.getTime();
      labelStr = `${MONTH_NAMES[m]} ${y}`;
      setSelectedMonth(m);
      setSelectedYear(y);
      setStartDate(toInputDateString(startD));
      setEndDate(toInputDateString(endD));
      setMode('month');
    } else if (presetType === 'last30Days') {
      const fromD = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      fromTime = fromD.getTime();
      toTime = now.getTime();
      labelStr = 'Last 30 Days';
      setStartDate(toInputDateString(fromD));
      setEndDate(toInputDateString(now));
      setMode('range');
    } else if (presetType === 'last90Days') {
      const fromD = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      fromTime = fromD.getTime();
      toTime = now.getTime();
      labelStr = 'Last 90 Days';
      setStartDate(toInputDateString(fromD));
      setEndDate(toInputDateString(now));
      setMode('range');
    }

    setActivePreset(presetType);
    setAppliedLabel(labelStr);
    setIsDirty(false);

    onFilterChange({
      fromTimestamp: fromTime,
      toTimestamp: toTime,
      label: labelStr,
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

  const isFilterApplied = mode !== 'all' || activePreset !== null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
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
            setActivePreset(null);
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
                        onClick={() => handleSelectMonthGrid(idx, popoverYear)}
                        className={`relative rounded-md py-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-accent-blue text-text-on-primary dark:text-surface-950 font-bold shadow-xs'
                            : 'bg-surface-50 text-text-ink hover:bg-surface-100 dark:text-text-on-primary dark:hover:bg-surface-200'
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
          <FormattedDateInput
            value={startDate}
            onChange={(val) => {
              setStartDate(val);
              setIsDirty(true);
            }}
            title="Start Date (DD/MM/YYYY)"
          />
          <span className="text-text-body-mid dark:text-text-muted font-medium">to</span>
          <FormattedDateInput
            value={endDate}
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
          onClick={handleApplyMonthFilter}
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
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handlePreset('thisMonth')}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            activePreset === 'thisMonth'
              ? 'border-accent-blue bg-accent-blue text-text-on-primary dark:text-surface-950 shadow-xs font-bold'
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
        <button
          type="button"
          onClick={() => handlePreset('last30Days')}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            activePreset === 'last30Days'
              ? 'border-accent-blue bg-accent-blue text-text-on-primary dark:text-surface-950 shadow-xs font-bold'
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
        <button
          type="button"
          onClick={() => handlePreset('last90Days')}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            activePreset === 'last90Days'
              ? 'border-accent-blue bg-accent-blue text-text-on-primary dark:text-surface-950 shadow-xs font-bold'
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
      </div>

      {/* Active Filter Badge (Inline) when active preset is null and filter is active */}
      {isFilterApplied && activePreset === null && appliedLabel && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-accent-blue/40 bg-accent-blue/10 px-2.5 py-1 text-xs font-semibold text-accent-blue dark:bg-accent-blue/20 dark:text-text-on-primary shadow-xs">
          <span>
            🏷️ Filtered: <strong>{appliedLabel}</strong>
          </span>
          <button
            type="button"
            onClick={handleClearFilter}
            className="ml-1 rounded p-0.5 hover:bg-accent-blue/20 transition-colors cursor-pointer"
            title="Clear Filter"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      )}
    </div>
  );
}
