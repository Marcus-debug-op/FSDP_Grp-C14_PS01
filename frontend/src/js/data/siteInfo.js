// One place for the school's public contact details.
// The footer (and later the Join and Contact pages) read from here, so the
// same phone number, email and hours appear everywhere.
// TODO (client to confirm): the official website shows two different sets of
// office hours. These match its homepage and footer.
import { HQ, HQ_ADDRESS } from "./hqClasses.js";

export const site = {
  name: "Aikido Shinju-Kai",
  hqName: HQ,
  hqAddress: HQ_ADDRESS,
  email: "hq@aikidoshinjukai.com.sg",
  phoneDisplay: "(+65) 6513 1588",
  phoneHref: "tel:+6565131588",
  officeHours: [
    { days: "Mon–Fri", hours: "10am–9pm" },
    { days: "Sat–Sun", hours: "8am–6pm" },
  ],
};
