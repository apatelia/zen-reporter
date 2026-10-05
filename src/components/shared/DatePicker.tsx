import { useState, useRef, useEffect, useMemo } from 'react';

export interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  className?: string;
  disabled?: boolean;
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

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseYmd(ymdStr: string): Date | null {
  if (!ymdStr) return null;
  const parts = ymdStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return null;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDdMmYyyy(ymdStr: string): string {
  if (!ymdStr) return '';
  const parts = ymdStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return ymdStr;
}

export default function DatePicker({
  value,
  onChange,
  title = 'Select date',
  placeholder = 'DD/MM/YYYY',
  min,
  max,
  className = '',
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [typedText, setTypedText] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState(value);

  const containerRef = useRef<HTMLDivElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setTypedText(null);
  }

  const selectedDate = useMemo(() => parseYmd(value), [value]);
  const minDate = useMemo(() => (min ? parseYmd(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parseYmd(max) : null), [max]);

  const [viewYear, setViewYear] = useState<number>(() => {
    return selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  });

  const handleToggleOpen = () => {
    if (!isOpen) {
      const activeDate = selectedDate || new Date();
      setViewYear(activeDate.getFullYear());
      setViewMonth(activeDate.getMonth());
    }
    setIsOpen((open) => !open);
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const displayText = useMemo(() => {
    if (typedText !== null) return typedText;
    return formatDisplayDdMmYyyy(value);
  }, [value, typedText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTypedText(raw);

    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      const newYmd = `${year}-${month}-${day}`;
      onChange(newYmd);
    } else if (raw === '') {
      onChange('');
    }
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0-6
    const totalDays = lastDay.getDate();

    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateObj: Date;
      ymd: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    const todayYmd = formatYmd(new Date());

    // Previous month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      const ymd = formatYmd(d);
      let isDisabled = false;
      if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()))
        isDisabled = true;
      if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()))
        isDisabled = true;

      days.push({
        dateObj: d,
        ymd,
        dayNum,
        isCurrentMonth: false,
        isDisabled,
        isSelected: value === ymd,
        isToday: todayYmd === ymd,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const d = new Date(viewYear, viewMonth, dayNum);
      const ymd = formatYmd(d);
      let isDisabled = false;
      if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()))
        isDisabled = true;
      if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()))
        isDisabled = true;

      days.push({
        dateObj: d,
        ymd,
        dayNum,
        isCurrentMonth: true,
        isDisabled,
        isSelected: value === ymd,
        isToday: todayYmd === ymd,
      });
    }

    // Next month padding days to fill 42 cells (6 rows)
    const remaining = 42 - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(viewYear, viewMonth + 1, dayNum);
      const ymd = formatYmd(d);
      let isDisabled = false;
      if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()))
        isDisabled = true;
      if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()))
        isDisabled = true;

      days.push({
        dateObj: d,
        ymd,
        dayNum,
        isCurrentMonth: false,
        isDisabled,
        isSelected: value === ymd,
        isToday: todayYmd === ymd,
      });
    }

    return days;
  }, [viewYear, viewMonth, minDate, maxDate, value]);

  const canPrevMonth = useMemo(() => {
    if (!minDate) return true;
    const lastOfPrev = new Date(viewYear, viewMonth, 0);
    return lastOfPrev >= new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  }, [viewYear, viewMonth, minDate]);

  const canNextMonth = useMemo(() => {
    if (!maxDate) return true;
    const firstOfNext = new Date(viewYear, viewMonth + 1, 1);
    return firstOfNext <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  }, [viewYear, viewMonth, maxDate]);

  const handlePrevMonth = () => {
    if (!canPrevMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canNextMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (ymd: string) => {
    setTypedText(null);
    onChange(ymd);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const todayYmd = formatYmd(new Date());
    setTypedText(null);
    onChange(todayYmd);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTypedText(null);
    onChange('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <input
        type="text"
        value={displayText}
        disabled={disabled}
        onChange={handleTextChange}
        placeholder={placeholder}
        title={title}
        className="w-32 rounded-md border border-border-default bg-surface-100 py-1.5 pl-2.5 pr-8 text-xs font-medium text-text-ink placeholder-text-muted-soft outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue dark:bg-surface-100 dark:text-text-on-primary shadow-xs"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className="absolute right-2 p-0.5 text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer disabled:opacity-40"
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

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-64 rounded-md border border-border-default bg-canvas p-3 shadow-lg dark:bg-surface-100">
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-default">
            <span className="text-xs font-bold text-text-ink dark:text-text-on-primary">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canPrevMonth}
                onClick={handlePrevMonth}
                className="rounded p-1 text-text-ink hover:bg-surface-200 dark:text-text-on-primary dark:hover:bg-surface-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous month"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!canNextMonth}
                onClick={handleNextMonth}
                className="rounded p-1 text-text-ink hover:bg-surface-200 dark:text-text-on-primary dark:hover:bg-surface-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next month"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center mb-1">
            {WEEKDAY_NAMES.map((wd) => (
              <span
                key={wd}
                className="text-[11px] font-bold text-text-muted dark:text-text-muted py-0.5"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((d) => {
              let btnStyle =
                'text-xs rounded py-1 transition-colors font-medium cursor-pointer flex items-center justify-center';

              if (d.isDisabled) {
                btnStyle +=
                  ' text-text-muted-soft dark:text-text-muted opacity-30 cursor-not-allowed';
              } else if (d.isSelected) {
                btnStyle +=
                  ' bg-success-600 text-white font-bold dark:bg-success-600 dark:text-white shadow-xs';
              } else if (!d.isCurrentMonth) {
                btnStyle +=
                  ' text-text-muted-soft dark:text-text-muted hover:bg-surface-100 dark:hover:bg-surface-200';
              } else {
                btnStyle +=
                  ' text-text-ink dark:text-text-on-primary hover:bg-surface-100 dark:hover:bg-surface-200';
              }

              if (d.isToday && !d.isSelected) {
                btnStyle += ' ring-1 ring-accent-blue font-bold';
              }

              return (
                <button
                  key={d.ymd}
                  type="button"
                  disabled={d.isDisabled}
                  onClick={() => handleSelectDay(d.ymd)}
                  className={btnStyle}
                >
                  {d.dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="mt-2.5 pt-2 border-t border-border-default flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-text-muted hover:text-danger-600 dark:text-text-muted dark:hover:text-danger-500 font-medium cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-accent-blue font-semibold hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
