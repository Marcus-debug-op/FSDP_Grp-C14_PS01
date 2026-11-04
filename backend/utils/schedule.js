export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value, days) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function dateFromToday(offsetDays) {
  return addDays(toDateString(new Date()), offsetDays);
}

export function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function mondayOf(value) {
  const day = parseDate(value).getDay();
  return addDays(value, day === 0 ? -6 : 1 - day);
}
