import { createMockStore } from "../data/adminMockData.js";

let store = createMockStore();

export function resetMockData() {
  store = createMockStore();
}

const copy = (value) => (value === undefined ? undefined : structuredClone(value));

export async function listDojos() {
  return copy(store.dojos);
}

export async function findDojoById(id) {
  return copy(store.dojos.find((d) => d.id === id));
}

export async function findDojoByName(name, excludeId) {
  const lower = name.toLowerCase();
  return copy(store.dojos.find((d) => d.id !== excludeId && d.name.toLowerCase() === lower));
}

export async function createDojo({ name, address, postalCode, rooms }) {
  const dojo = {
    id: store.nextIds.dojo++,
    name,
    address,
    postalCode,
    isActive: true,
    rooms: rooms.map((r) => ({ id: store.nextIds.room++, name: r.name, capacity: r.capacity, isActive: r.isActive })),
  };
  store.dojos.push(dojo);
  return copy(dojo);
}

export async function updateDojo(id, { name, address, postalCode, rooms }) {
  const dojo = store.dojos.find((d) => d.id === id);
  if (!dojo) return undefined;
  const kept = rooms.map((r) => {
    const existing = r.id ? dojo.rooms.find((room) => room.id === r.id) : null;
    if (existing) return { ...existing, name: r.name, capacity: r.capacity, isActive: r.isActive };
    return { id: store.nextIds.room++, name: r.name, capacity: r.capacity, isActive: r.isActive };
  });
  const dropped = dojo.rooms
    .filter((room) => !kept.some((k) => k.id === room.id))
    .map((room) => ({ ...room, isActive: false }));
  Object.assign(dojo, { name, address, postalCode, rooms: [...kept, ...dropped] });
  return copy(dojo);
}

export async function setDojoActive(id, isActive) {
  const dojo = store.dojos.find((d) => d.id === id);
  if (!dojo) return undefined;
  dojo.isActive = isActive;
  return copy(dojo);
}

export async function getOverview({ from, to }) {
  const week = store.lessons.filter((l) => l.date >= from && l.date <= to && l.status !== "cancelled");
  const activeDojos = store.dojos.filter((d) => d.isActive);
  return {
    lessonsThisWeek: week.length,
    withoutInstructor: week.filter((l) => l.instructorIds.length === 0).length,
    activeDojos: activeDojos.length,
    activeRooms: activeDojos.flatMap((d) => d.rooms).filter((r) => r.isActive).length,
  };
}

export async function listInstructors() {
  return copy(store.instructors);
}

export async function listSchedule({ from, to, dojoId, instructorId, includeCancelled }) {
  return store.lessons
    .filter((l) => l.date >= from && l.date <= to)
    .filter((l) => !dojoId || l.dojoId === dojoId)
    .filter((l) => !instructorId || l.instructorIds.includes(instructorId))
    .filter((l) => includeCancelled || l.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.id - b.id)
    .map((lesson) => {
      const dojo = store.dojos.find((d) => d.id === lesson.dojoId);
      const room = dojo?.rooms.find((r) => r.id === lesson.roomId);
      return {
        id: lesson.id,
        type: lesson.type,
        title: lesson.title,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        capacity: lesson.capacity,
        status: lesson.status,
        dojoId: lesson.dojoId,
        location: dojo ? dojo.name : lesson.externalVenue,
        roomName: room?.name ?? null,
        instructors: lesson.instructorIds
          .map((iid) => store.instructors.find((i) => i.id === iid))
          .filter(Boolean)
          .map((i) => ({ id: i.id, fullName: i.fullName })),
      };
    });
}
