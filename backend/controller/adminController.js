import * as Admin from "../model/adminModel.js";
import { addDays, dateFromToday, isValidDate, mondayOf } from "../utils/schedule.js";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);

function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  };
}

function parseId(value, label = "ID") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`${label} is not valid.`);
  return id;
}

function optionalId(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  return parseId(value, label);
}

function text(value, label, { min = 1, max = 255, required = true } = {}) {
  if (value !== undefined && value !== null && typeof value !== "string") throw badRequest(`${label} must be text.`);
  const trimmed = (value || "").trim();
  if (!trimmed && !required) return "";
  if (trimmed.length < min) throw badRequest(`Please enter the ${label.toLowerCase()}.`);
  if (trimmed.length > max) throw badRequest(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

function wholeNumber(value, label, { min = 0, max = 100000 } = {}) {
  const number = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isInteger(number)) {
    throw badRequest(`${label} must be a whole number.`);
  }
  if (number < min || number > max) throw badRequest(`${label} must be between ${min} and ${max}.`);
  return number;
}

function bool(value, label, fallback) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "boolean") throw badRequest(`${label} must be true or false.`);
  return value;
}

async function validateDojo(body, excludeId) {
  const name = text(body.name, "Dojo name", { min: 2, max: 100 });
  const address = text(body.address, "Address", { min: 5, max: 255 });
  const postalCode = text(body.postalCode, "Postal code", { required: false, max: 6 }) || null;
  if (postalCode && !/^\d{6}$/.test(postalCode)) throw badRequest("Postal code must be 6 digits.");
  if (!Array.isArray(body.rooms) || body.rooms.length === 0) throw badRequest("Add at least one room.");
  if (body.rooms.length > 30) throw badRequest("A dojo can have at most 30 rooms.");
  const rooms = body.rooms.map((room, index) => {
    if (!room || typeof room !== "object") throw badRequest(`Room ${index + 1} is not valid.`);
    return {
      id: optionalId(room.id, "Room ID"),
      name: text(room.name, `Room ${index + 1} name`, { max: 50 }),
      capacity: wholeNumber(room.capacity, `Room ${index + 1} capacity`, { min: 1, max: 500 }),
      isActive: bool(room.isActive, "Room in use", true),
    };
  });
  if (!rooms.some((room) => room.isActive)) throw badRequest("At least one room must be in use.");
  const names = rooms.map((room) => room.name.toLowerCase());
  if (new Set(names).size !== names.length) throw badRequest("Each room in a dojo needs a different name.");
  if (await Admin.findDojoByName(name, excludeId)) throw new HttpError(409, "A dojo with this name already exists.");
  return { name, address, postalCode, rooms };
}

export const listDojos = handle(async (req, res) => {
  res.json({ dojos: await Admin.listDojos() });
});

export const createDojo = handle(async (req, res) => {
  const data = await validateDojo(req.body);
  res.status(201).json({ dojo: await Admin.createDojo(data) });
});

export const updateDojo = handle(async (req, res) => {
  const id = parseId(req.params.id, "Dojo ID");
  if (!(await Admin.findDojoById(id))) throw new HttpError(404, "Dojo not found.");
  const data = await validateDojo(req.body, id);
  res.json({ dojo: await Admin.updateDojo(id, data) });
});

export const setDojoStatus = handle(async (req, res) => {
  const id = parseId(req.params.id, "Dojo ID");
  const dojo = await Admin.setDojoActive(id, bool(req.body.isActive, "Active"));
  if (!dojo) throw new HttpError(404, "Dojo not found.");
  res.json({ dojo });
});

export const overview = handle(async (req, res) => {
  const weekStart = mondayOf(dateFromToday(0));
  const weekEnd = addDays(weekStart, 6);
  res.json({ weekStart, weekEnd, ...(await Admin.getOverview({ from: weekStart, to: weekEnd })) });
});

export const listInstructors = handle(async (req, res) => {
  res.json({ instructors: await Admin.listInstructors() });
});

export const getSchedule = handle(async (req, res) => {
  const requested = req.query.week || dateFromToday(0);
  if (!isValidDate(requested)) throw badRequest("Week must be a valid date.");
  const weekStart = mondayOf(requested);
  const weekEnd = addDays(weekStart, 6);
  const items = await Admin.listSchedule({
    from: weekStart,
    to: weekEnd,
    dojoId: optionalId(req.query.dojoId, "Dojo ID"),
    instructorId: optionalId(req.query.instructorId, "Instructor ID"),
    includeCancelled: req.query.includeCancelled === "true",
  });
  res.json({ weekStart, weekEnd, items });
});
