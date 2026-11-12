import { listPublicClasses } from "../model/publicClassModel.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getPublicClasses(req, res, next) {
  try {
    const rows = await listPublicClasses();
    res.json(rows.map((row) => ({
      id: row.id,
      name: row.title,
      type: row.title.replace(/\s+Class$/i, ""),
      day: DAY_NAMES[row.day_of_week],
      start: row.start_time,
      time: `${row.start_time} - ${row.end_time}`,
      instructorId: row.instructor_id,
      instructor: row.instructor_name,
      dojo: row.dojo,
      dojoAddress: row.dojo_address,
      note: "",
    })));
  } catch (error) {
    next(error);
  }
}
