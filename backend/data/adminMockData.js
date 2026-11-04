import { addDays, dateFromToday, mondayOf, parseDate } from "../utils/schedule.js";

const instructors = [
  { id: 101, fullName: "Sensei Robin Tan" },
  { id: 102, fullName: "Instructor Nicholas Lee" },
  { id: 103, fullName: "Instructor Elaine Ong" },
  { id: 104, fullName: "Sensei Mark Lim" },
  { id: 105, fullName: "Sensei Alexander Lee" },
];

const dojos = [
  {
    id: 1,
    name: "ASK Headquarters Dojo",
    address: "Thomson V One, 9 Sin Ming Road, #B1-02, Singapore 575630",
    postalCode: "575630",
    isActive: true,
    rooms: [
      { id: 1, name: "Main Mat", capacity: 30, isActive: true },
      { id: 2, name: "Small Mat", capacity: 6, isActive: true },
    ],
  },
  {
    id: 2,
    name: "Serangoon Sport Centre",
    address: "Sample address, update before demo",
    postalCode: null,
    isActive: true,
    rooms: [{ id: 3, name: "Multi-Purpose Hall", capacity: 25, isActive: true }],
  },
];

const weeklyGroupClasses = [
  { weekday: 1, title: "Adult Class", dojoId: 1, roomId: 1, startTime: "19:15", endTime: "20:15", capacity: 30, instructorId: 104 },
  { weekday: 1, title: "Adult Class", dojoId: 1, roomId: 1, startTime: "20:30", endTime: "21:30", capacity: 30, instructorId: 105 },
  { weekday: 2, title: "Children Beginners Class", dojoId: 1, roomId: 1, startTime: "18:00", endTime: "19:00", capacity: 20, instructorId: 101 },
  { weekday: 2, title: "Weapons Class", dojoId: 1, roomId: 1, startTime: "20:30", endTime: "21:30", capacity: 20, instructorId: 101 },
  { weekday: 3, title: "Adult Class", dojoId: 1, roomId: 1, startTime: "10:00", endTime: "11:00", capacity: 30, instructorId: 103 },
  { weekday: 3, title: "Advanced Class", dojoId: 1, roomId: 1, startTime: "20:30", endTime: "21:30", capacity: 20, instructorId: null },
  { weekday: 4, title: "Children Beginners Class", dojoId: 1, roomId: 1, startTime: "17:00", endTime: "18:00", capacity: 20, instructorId: 102 },
  { weekday: 4, title: "Adult Class", dojoId: 1, roomId: 1, startTime: "19:15", endTime: "20:15", capacity: 30, instructorId: 102 },
  { weekday: 5, title: "Kids Class", dojoId: 2, roomId: 3, startTime: "17:30", endTime: "18:30", capacity: 25, instructorId: 103 },
  { weekday: 5, title: "Youth/Adult Class", dojoId: 2, roomId: 3, startTime: "20:00", endTime: "21:00", capacity: 25, instructorId: 103 },
  { weekday: 6, title: "Children Beginners Class", dojoId: 1, roomId: 1, startTime: "09:15", endTime: "10:15", capacity: 20, instructorId: 101 },
  { weekday: 6, title: "Adult Class", dojoId: 1, roomId: 1, startTime: "11:45", endTime: "12:45", capacity: 30, instructorId: 105 },
  { weekday: 6, title: "Mixed/Family Class", dojoId: 1, roomId: 1, startTime: "15:30", endTime: "16:30", capacity: 30, instructorId: 104 },
  { weekday: 0, title: "Adult Class", dojoId: 1, roomId: 1, startTime: "10:30", endTime: "11:30", capacity: 30, instructorId: null },
  { weekday: 0, title: "Ladies Class", dojoId: 1, roomId: 1, startTime: "16:45", endTime: "17:45", capacity: 20, instructorId: 101 },
];

function buildLessons() {
  const lessons = [];
  let id = 1;
  const start = addDays(mondayOf(dateFromToday(0)), -7);
  for (let offset = 0; offset < 35; offset += 1) {
    const date = addDays(start, offset);
    const weekday = parseDate(date).getDay();
    for (const item of weeklyGroupClasses.filter((c) => c.weekday === weekday)) {
      lessons.push({
        id: id++,
        type: "group",
        title: item.title,
        dojoId: item.dojoId,
        roomId: item.roomId,
        externalVenue: null,
        instructorIds: item.instructorId ? [item.instructorId] : [],
        date,
        startTime: item.startTime,
        endTime: item.endTime,
        capacity: item.capacity,
        status: "scheduled",
      });
    }
  }

  const extras = [
    { type: "private", title: "1 on 1 Lesson", dojoId: 1, roomId: 2, instructorIds: [103], dayOffset: 1, startTime: "15:00", endTime: "16:00", capacity: 1 },
    { type: "private", title: "1 on 1 Lesson", dojoId: 1, roomId: 2, instructorIds: [101], dayOffset: 3, startTime: "14:00", endTime: "15:00", capacity: 1 },
    { type: "private", title: "1 on 1 Lesson", dojoId: 1, roomId: 2, instructorIds: [104], dayOffset: 9, startTime: "16:00", endTime: "17:00", capacity: 1 },
    { type: "external", title: "Weapons Seminar", dojoId: null, roomId: null, externalVenue: "Jurong West Sport Centre", instructorIds: [105], dayOffset: 5, startTime: "14:00", endTime: "17:00", capacity: 40 },
    { type: "grading", title: "Kyu Grading", dojoId: 1, roomId: 1, instructorIds: [101, 104], dayOffset: 12, startTime: "13:00", endTime: "16:00", capacity: 30 },
    { type: "group", title: "Adult Class", dojoId: 1, roomId: 1, instructorIds: [102], dayOffset: 2, startTime: "07:15", endTime: "08:15", capacity: 30, status: "cancelled" },
  ];
  const thisMonday = mondayOf(dateFromToday(0));
  for (const extra of extras) {
    lessons.push({
      id: id++,
      type: extra.type,
      title: extra.title,
      dojoId: extra.dojoId,
      roomId: extra.roomId,
      externalVenue: extra.externalVenue ?? null,
      instructorIds: extra.instructorIds,
      date: addDays(thisMonday, extra.dayOffset),
      startTime: extra.startTime,
      endTime: extra.endTime,
      capacity: extra.capacity,
      status: extra.status ?? "scheduled",
    });
  }
  return lessons;
}

export function createMockStore() {
  return {
    instructors: structuredClone(instructors),
    dojos: structuredClone(dojos),
    lessons: buildLessons(),
    nextIds: { dojo: 3, room: 4 },
  };
}
