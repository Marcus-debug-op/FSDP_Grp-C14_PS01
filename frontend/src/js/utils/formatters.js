export function todayString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTime(value) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

export function addDays(value, days) {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDayHeading(value) {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString("en-SG", { weekday: "short" }),
    day: date.toLocaleDateString("en-SG", { day: "numeric", month: "short" }),
  };
}

export function formatWeekRange(start, end) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);
  const startText = startDate.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
  const endText = endDate.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
  return `${startText} to ${endText}`;
}

export function formatShortDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}
