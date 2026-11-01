// ============================================================
// HEADQUARTERS DOJO WEEKLY TIMETABLE
// Stored here as simple rows so it is easy to read and edit.
// Later this can be replaced by data from the database/API
// (see classService.js) without changing any page.
// ============================================================

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const HQ = "ASK Headquarters Dojo";
export const HQ_ADDRESS = "Thomson V One, 9 Sin Ming Road, #B1-02, Singapore 575630";

// What each class type means (shown on the class cards). Classes run 60 minutes.
export const classTypes = {
  "Children Beginners": "7th Kyu & above, ages 4 to 12",
  "Children Juniors": "Suitable for all grades, ages 4 to 6",
  Adults: "13 years & above",
  "Mixed/Family": "Suitable for all adults & children",
  Weapons: "Weapons class",
  Intermediate: "4th Kyu & above",
  Advanced: "1st Kyu & above only",
  SG50: "Energy | Ki | Training",
  Ladies: "Ladies only",
  Instructional: "Appointment holders only, first week of every month",
};

const classNames = {
  Adults: "Adult Class",
  "Children Beginners": "Children Beginners Class",
  "Children Juniors": "Children Juniors Class",
  "Mixed/Family": "Mixed/Family Class",
  Weapons: "Weapons Class",
  Intermediate: "Intermediate Class",
  Advanced: "Advanced Class",
  SG50: "Senior SG50 Class",
  Ladies: "Ladies Class",
  Instructional: "Instructional Class",
};

// Instructor names, written once so rows stay short
const robin = "Sensei Robin Tan";
const nick = "Instructor Nicholas Lee";
const annie = "Sensei Annie Goh";
const aloy = "Sensei Aloyseus Lee";
const philip = "Shihan Philip Lee";
const alex = "Sensei Alexander Lee";
const elaine = "Instructor Elaine Ong";
const kok = "Sensei Tan Kok Hiang";
const mark = "Sensei Mark Lim";
const james = "Sensei James Tan";
const bob = "Sensei Bob Tan";
const ronald = "Sensei Ronald Tan";
const mun = "Sensei Mun Kit";

// Each row: [day, start time, instructor, class type]
const rows = [
  // Monday
  ["Monday", "07:15", aloy, "Adults"],
  ["Monday", "15:00", nick, "Adults"],
  ["Monday", "17:00", nick, "Children Juniors"],
  ["Monday", "18:00", mark, "Adults"],
  ["Monday", "19:15", mark, "Adults"],
  ["Monday", "20:30", alex, "Adults"],
  // Tuesday
  ["Tuesday", "07:15", philip, "Adults"],
  ["Tuesday", "17:00", robin, "Children Beginners"],
  ["Tuesday", "18:00", robin, "Children Beginners"],
  ["Tuesday", "18:00", robin, "Adults"],
  ["Tuesday", "19:15", james, "Adults"],
  ["Tuesday", "20:30", robin, "Weapons"],
  // Wednesday
  ["Wednesday", "10:00", elaine, "Adults"],
  ["Wednesday", "11:00", elaine, "Adults"],
  ["Wednesday", "12:15", nick, "Adults"],
  ["Wednesday", "16:00", robin, "Children Beginners"],
  ["Wednesday", "17:00", robin, "Children Beginners"],
  ["Wednesday", "18:00", robin, "Adults"],
  ["Wednesday", "19:15", aloy, "Adults"],
  ["Wednesday", "20:30", philip, "Advanced"],
  // Thursday
  ["Thursday", "07:15", alex, "Adults"],
  ["Thursday", "11:00", alex, "Adults"],
  ["Thursday", "12:15", nick, "Adults"],
  ["Thursday", "16:00", nick, "Children Beginners"],
  ["Thursday", "17:00", nick, "Children Beginners"],
  ["Thursday", "18:00", nick, "Adults"],
  ["Thursday", "19:15", philip, "Adults"],
  ["Thursday", "20:30", bob, "Intermediate"],
  // Friday
  ["Friday", "11:00", kok, "Adults"],
  ["Friday", "12:15", nick, "Adults"],
  ["Friday", "16:00", robin, "Children Beginners"],
  ["Friday", "17:00", robin, "Children Beginners"],
  ["Friday", "18:00", nick, "Children Beginners"],
  ["Friday", "18:00", elaine, "Adults"],
  ["Friday", "19:15", elaine, "Adults"],
  ["Friday", "20:30", robin, "Adults"],
  // Saturday
  ["Saturday", "08:00", philip, "Adults"],
  ["Saturday", "09:15", `${mark}, ${robin}`, "Adults"],
  ["Saturday", "09:15", robin, "Children Beginners"],
  ["Saturday", "10:30", robin, "Children Beginners"],
  ["Saturday", "11:45", nick, "Children Beginners"],
  ["Saturday", "11:45", alex, "Adults"],
  ["Saturday", "13:00", robin, "Adults"],
  ["Saturday", "14:15", nick, "Children Beginners"],
  ["Saturday", "14:15", bob, "Adults"],
  ["Saturday", "15:30", nick, "Children Beginners"],
  ["Saturday", "15:30", mun, "Mixed/Family"],
  ["Saturday", "16:45", annie, "Mixed/Family"],
  ["Saturday", "18:00", robin, "Adults"],
  // Sunday
  ["Sunday", "08:00", null, "Instructional"],
  ["Sunday", "09:15", nick, "Children Beginners"],
  ["Sunday", "09:15", philip, "SG50"],
  ["Sunday", "10:30", nick, "Children Beginners"],
  ["Sunday", "10:30", ronald, "Adults"],
  ["Sunday", "11:45", nick, "Children Beginners"],
  ["Sunday", "11:45", alex, "Adults"],
  ["Sunday", "13:00", mark, "Adults"],
  ["Sunday", "14:15", annie, "Children Beginners"],
  ["Sunday", "14:15", mark, "Adults"],
  ["Sunday", "15:30", nick, "Children Beginners"],
  ["Sunday", "15:30", robin, "Mixed/Family"],
  ["Sunday", "16:45", robin, "Children Beginners"],
  ["Sunday", "16:45", robin, "Ladies"],
];

// "07:15" -> "08:15" (every class is 60 minutes)
function addOneHour(start) {
  const [h, m] = start.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Turn the rows into the objects the timetable page uses, sorted by day then time.
export const hqClasses = rows
  .map(([day, start, instructor, type], i) => ({
    id: `hq-${i + 1}`,
    name: classNames[type],
    type,
    day,
    start,
    // The instructional class is by appointment, so it shows a start time only.
    time: type === "Instructional" ? start : `${start} - ${addOneHour(start)}`,
    instructor,
    dojo: HQ,
    note: classTypes[type],
  }))
  .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start));
