export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function formatReadableDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimeFromMs(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getMonthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export interface CalendarCell {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function getMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const todayKey = toLocalDateKey(new Date());
  const firstDay = new Date(year, monthIndex, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: CalendarCell[] = [];

  // Leading days from previous month
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex - 1, prevMonthDays - i);
    const dateKey = toLocalDateKey(d);
    cells.push({
      dateKey,
      dayNumber: d.getDate(),
      inCurrentMonth: false,
      isToday: dateKey === todayKey,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dateKey = toLocalDateKey(d);
    cells.push({
      dateKey,
      dayNumber: day,
      inCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  // Trailing days to complete 35 or 42 grid
  const totalSlots = cells.length <= 35 ? 35 : 42;
  let nextDay = 1;
  while (cells.length < totalSlots) {
    const d = new Date(year, monthIndex + 1, nextDay++);
    const dateKey = toLocalDateKey(d);
    cells.push({
      dateKey,
      dayNumber: d.getDate(),
      inCurrentMonth: false,
      isToday: dateKey === todayKey,
    });
  }

  return cells;
}

export function getLastNDaysKeys(count: number, endDate: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i);
    result.push(toLocalDateKey(d));
  }
  return result;
}
