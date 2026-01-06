export type DateRange = 'day' | '7d' | 'month';

export const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const addDays = (value: Date, amount: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

export const isSameDay = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

export const getDateKey = (value: Date) => {
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRangeBounds = (range: DateRange, anchorDate: Date) => {
  const anchor = startOfDay(anchorDate);
  if (range === 'day') {
    return {
      start: anchor,
      end: endOfDay(anchor),
    };
  }
  if (range === '7d') {
    const start = startOfDay(addDays(anchor, -6));
    return {
      start,
      end: endOfDay(anchor),
    };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
  return { start, end };
};

export const getSlidingWindowDays = (anchorDate: Date, totalDays = 7) => {
  const anchor = startOfDay(anchorDate);
  const start = addDays(anchor, -(totalDays - 1));
  return Array.from({ length: totalDays }, (_, index) =>
    addDays(start, index),
  );
};

export const getCenteredWindowDays = (anchorDate: Date, radius = 3) => {
  const anchor = startOfDay(anchorDate);
  return Array.from({ length: radius * 2 + 1 }, (_, index) =>
    addDays(anchor, index - radius),
  );
};

export const getRelativeDayLabel = (value: Date, today: Date) => {
  const day = startOfDay(value);
  const base = startOfDay(today);
  const diffDays = Math.round(
    (day.getTime() - base.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === -1) {
    return 'Yesterday';
  }
  if (diffDays === 1) {
    return 'Tomorrow';
  }
  return day.toLocaleDateString('en-US', { weekday: 'short' });
};
