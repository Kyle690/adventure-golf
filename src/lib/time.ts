const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function daysBetween(date: Date, now: Date) {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatClock(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "today, 14:32" / "yesterday, 09:10" / "12 Sep, 14:32". */
export function formatDayTime(date: Date, now = new Date()) {
  const days = daysBetween(date, now);
  if (days <= 0) return `today, ${formatClock(date)}`;
  if (days === 1) return `yesterday, ${formatClock(date)}`;
  const month = date.toLocaleString('en-GB', { month: 'short' });
  return `${date.getDate()} ${month}, ${formatClock(date)}`;
}

/** "today" / "yesterday" / "4 days ago" / "3 weeks ago" / "2 months ago" / "1 year ago". */
export function timeAgo(date: Date, now = new Date()) {
  const days = daysBetween(date, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years <= 1 ? '1 year ago' : `${years} years ago`;
}
