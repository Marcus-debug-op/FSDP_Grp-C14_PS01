// Small shared helpers for the belt components.

// The database stores belt colours as words (white, brown, black). Map them to a hex
// swatch. Unknown colours fall back to a neutral grey.
const COLOUR_HEX = {
  white: "#f5f5f5",
  yellow: "#e6c229",
  orange: "#e07b1a",
  green: "#2e8b57",
  blue: "#2f5fa8",
  purple: "#6b3fa0",
  brown: "#7a4a24",
  red: "#b23b3b",
  black: "#1a1a1a",
};

export function colourHex(colour) {
  return COLOUR_HEX[(colour || "").toLowerCase()] || "#b8b2aa";
}

// "12 Mar 2025" from "2025-03-12". Built by hand so the browser's timezone can't shift the day.
export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

// "7 months", "1 month", or "12 days" for a belt held less than a month.
export function timeAtBelt({ monthsAtBelt, daysAtBelt }) {
  if (monthsAtBelt >= 1) return `${monthsAtBelt} month${monthsAtBelt === 1 ? "" : "s"}`;
  return `${daysAtBelt} day${daysAtBelt === 1 ? "" : "s"}`;
}
