// ============================================================
// DOJO DIRECTORY
// status: "open" | "closed" (temporarily closed) | "renovation"
// region is assigned from each dojo's location: edit the region field if the
// school groups a dojo differently. Times are shown exactly as listed.
// ============================================================
export const REGIONS = ["Central", "South", "West", "East", "North", "North East", "North West"];

const kids = (day, time) => ({ type: "Children", day, time });
const adult = (day, time) => ({ type: "Adult", day, time });
const mixed = (day, time) => ({ type: "Mixed", day, time });

export const dojos = [
  // ----- Central
  { code: "ASK HQ", name: "ASK Headquarters Dojo", region: "Central", status: "open", hq: true,
    address: "Thomson V One, 9 Sin Ming Road, #B1-02, Singapore 575630", slots: [] },
  { code: "BSAS", name: "ActiveSG Bishan Dojo", region: "Central", status: "open",
    address: "5 Bishan Street 14, Singapore 579783", slots: [mixed("Mon", "6:00pm – 7:00pm"), mixed("Thu", "7:30pm – 8:30pm")] },
  { code: "BTCC", name: "Bukit Timah Dojo", region: "Central", status: "open",
    address: "Bukit Timah Community Club, 20 Toh Yi Dr, Singapore 596569", slots: [mixed("Sat", "4:00pm – 5:15pm")] },
  { code: "CSCC", name: "Cheng San Dojo", region: "Central", status: "open",
    address: "6 Ang Mo Kio Street 53, Singapore 569205", slots: [kids("Sat", "10:00am – 11:00am"), adult("Sat", "10:00am – 11:15am")] },
  { code: "EHRW", name: "EtonHouse Pre-School Robertson Walk", region: "Central", status: "open",
    address: "11 Unity St, #02-20, Singapore 237995", slots: [kids("Mon", "3:00pm – 5:00pm")] },
  { code: "JAPA", name: "Japanese Association Dojo", region: "Central", status: "open",
    address: "120 Adam Rd, Singapore 289899", slots: [mixed("Sat", "12:00pm – 1:30pm")] },
  { code: "SICI", name: "The Singapore Island Country Club Dojo", region: "Central", status: "open",
    address: "240 Sime Rd, Singapore 288303", slots: [mixed("Sun", "2:30pm – 3:30pm")] },
  { code: "SMUC", name: "SMU Dojo", region: "Central", status: "open", restricted: "Students & alumni only",
    address: "Singapore Management University, 81 Victoria St, Singapore 188065", slots: [adult("Fri", "8:30pm – 10:00pm")] },
  { code: "STPY", name: "SAFRA Toa Payoh Dojo", region: "Central", status: "open",
    address: "293 Lor 6 Toa Payoh, Singapore 319387", slots: [adult("Sat", "8:00pm – 9:00pm")] },
  { code: "TSCC", name: "Thomson Dojo", region: "Central", status: "open",
    address: "233 Bishan Street 22, Singapore 570233", slots: [mixed("Tue", "7:00pm – 8:15pm")] },
  { code: "YKAS", name: "ActiveSG Yio Chu Kang Dojo", region: "Central", status: "open",
    address: "200 Ang Mo Kio Ave 9, Singapore 569770", slots: [mixed("Sat", "4:00pm – 5:00pm"), mixed("Sat", "5:15pm – 6:15pm")] },

  // ----- South
  { code: "AGORA", name: "AGORA Colearning", region: "South", status: "open",
    address: "1 Maritime Square, HarbourFront Centre, #04-01, Singapore 099253", slots: [kids("Tue", "4:30pm – 5:30pm"), kids("Fri", "3:15pm – 4:15pm")] },
  { code: "EHSC", name: "EtonHouse International School Sentosa", region: "South", status: "open",
    address: "33 Allanbrooke Rd, Singapore 099981", slots: [kids("Fri", "3:00pm – 4:00pm")] },
  { code: "TGPC", name: "Tanjong Pagar Dojo", region: "South", status: "open",
    address: "Tanjong Pagar Community Club, 101 Cantonment Rd, Singapore 089774", slots: [kids("Tue", "8:00pm – 9:00pm"), adult("Tue", "8:00pm – 9:15pm")] },
  { code: "ARCA", name: "Alexandra Retail Centre Dojo", region: "South", status: "open",
    address: "460 Alexandra Road #03-02, Singapore 119963", slots: [adult("Thu", "12:00pm – 1:00pm")] },

  // ----- West
  { code: "CSCB", name: "Civil Service Club (Bukit Batok) Dojo", region: "West", status: "open",
    address: "91 Bukit Batok West Ave 2, Singapore 659206", slots: [kids("Sun", "10:00am – 11:00am"), adult("Sun", "11:00am – 12:15pm")] },
  { code: "GPCC", name: "Gek Poh Dojo", region: "West", status: "renovation",
    address: "Gek Poh Ville Community Club, 1 Jurong West Street 74, Singapore 649149", slots: [] },
  { code: "HTNS-BB", name: "HomeTeamNS – Bukit Batok Dojo", region: "West", status: "open",
    address: "HomeTeamNS @ Bukit Batok, Singapore 659003", slots: [kids("Sat", "2:30pm – 3:30pm"), adult("Sat", "2:30pm – 3:45pm")] },
  { code: "JEAS", name: "ActiveSG Jurong East", region: "West", status: "open",
    address: "21 Jurong East Street 31, Singapore 609517", slots: [mixed("Sun", "2:45pm – 3:45pm")] },
  { code: "TFCC", name: "The Frontier Dojo", region: "West", status: "open",
    address: "665a Jurong West Street 65, Singapore 641665", slots: [kids("Fri", "7:00pm – 8:00pm"), adult("Fri", "8:00pm – 9:15pm")] },
  { code: "WCCC", name: "West Coast Dojo", region: "West", status: "open",
    address: "2 Clementi West Street 2, Singapore 129605", slots: [kids("Sat", "4:00pm – 5:00pm"), adult("Sat", "4:00pm – 5:15pm")] },

  // ----- East
  { code: "BDAS", name: "ActiveSG Bedok Dojo", region: "East", status: "open",
    address: "Heartbeat@Bedok, 11 Bedok North Street 1 #01-02, Singapore 469662",
    slots: [mixed("Sun", "9:00am – 10:00am"), mixed("Sun", "10:15am – 11:15am"), mixed("Sun", "11:30am – 12:30pm")] },
  { code: "BDCC", name: "Bedok Community Centre Dojo", region: "East", status: "closed",
    address: "Bedok Community Centre, 850 New Upper Changi Rd, Singapore 467352", slots: [] },
  { code: "EHIS", name: "Etonhouse International School Dojo", region: "East", status: "open",
    address: "51 Broadrick Rd, Singapore 439501", slots: [kids("Wed", "3:30pm – 4:30pm")] },
  { code: "KKCC", name: "Kampong Kembangan Community Club Dojo", region: "East", status: "renovation",
    address: "5 Lengkong Tiga, Singapore 417408", slots: [] },
  { code: "MCCC", name: "MacPherson Community Club", region: "East", status: "closed",
    address: "400 Paya Lebar Way, Singapore 379131", slots: [] },
  { code: "MPCC", name: "Marine Parade Dojo", region: "East", status: "renovation",
    address: "278 Marine Parade Rd, Singapore 449282", slots: [] },
  { code: "NSRCC", name: "National Service Resort & Country Club", region: "East", status: "open",
    address: "10 Changi Coast Walk, Singapore 499739", slots: [mixed("Sun", "3:00pm – 4:15pm")] },
  { code: "OTH", name: "Our Tampines Hub", region: "East", status: "open",
    address: "1 Tampines Walk, Singapore 528523", slots: [kids("Mon", "7:30pm – 8:30pm"), adult("Mon", "8:30pm – 9:30pm")] },
  { code: "SSCC", name: "Siglap South Dojo", region: "East", status: "open",
    address: "6 Palm Rd, Singapore 456441", slots: [mixed("Mon", "8:00pm – 9:15pm")] },
  { code: "TWCC", name: "Tampines West Dojo", region: "East", status: "closed",
    address: "5 Tampines Ave 3, Singapore 529705", slots: [] },

  // ----- North
  { code: "CPCC", name: "Chong Pang Dojo", region: "North", status: "open",
    address: "109 Yishun Ring Rd, Singapore 760109", slots: [mixed("Sun", "11:00am – 12:00pm")] },
  { code: "FCCC", name: "Fu Chun Dojo", region: "North", status: "renovation",
    address: "Fu Chun Community Club", note: "Temporarily at Woodgrove Zone 10 RN, Blk 310 Link Hall", slots: [] },
  { code: "HTNS-KT", name: "HomeTeamNS Khatib", region: "North", status: "open",
    address: "2 Yishun Walk, Singapore 767944", slots: [mixed("Sat", "11:00am – 12:00pm")] },
  { code: "NYPA", name: "Nanyang Polytechnic Dojo", region: "North", status: "open", restricted: "Students & alumni only",
    address: "180 Ang Mo Kio Ave 8, Singapore 569830", slots: [mixed("Wed", "6:00pm – 8:30pm")] },
  { code: "OCCA", name: "Orchid Country Club Dojo", region: "North", status: "open",
    address: "1 Orchid Club Rd, Singapore 769162", slots: [kids("Sat", "3:00pm – 4:00pm"), adult("Sat", "3:00pm – 4:15pm")] },
  { code: "RPAC", name: "Republic Polytechnic", region: "North", status: "open",
    address: "9 Woodlands Ave 9, Singapore 738964", slots: [mixed("Fri", "3:00pm – 4:30pm")] },
  { code: "WDAS", name: "ActiveSG Woodlands Dojo", region: "North", status: "open",
    address: "2 Woodlands Street 12, Singapore 738599", slots: [mixed("Sun", "9:00am – 10:00am"), mixed("Sun", "10:15am – 11:15am")] },

  // ----- North East
  { code: "PLKC", name: "Paya Lebar Kovan Dojo", region: "North East", status: "open",
    address: "207 Hougang Street 21, Singapore 530207", slots: [kids("Thu", "8:00pm – 9:00pm"), adult("Thu", "8:00pm – 9:15pm")] },
  { code: "RVAF", name: "Rivervale Dojo", region: "North East", status: "open",
    address: "Rivervale Mall, 11 Rivervale Cres, Singapore 545082", slots: [adult("Wed", "8:00pm – 9:00pm")] },
  { code: "SKAS", name: "ActiveSG Seng Kang Dojo", region: "North East", status: "open",
    address: "57 Anchorvale Rd, Singapore 544964", slots: [mixed("Sun", "1:30pm – 2:30pm"), mixed("Sun", "2:45pm – 3:45pm")] },
  { code: "CYCC", name: "Ci Yuan Dojo", region: "North East", status: "open",
    address: "51 Hougang Ave 9, Singapore 538776", slots: [kids("Sat", "3:00pm – 4:00pm"), adult("Sat", "3:00pm – 4:15pm")] },
  { code: "P21C", name: "Punggol 21 Dojo", region: "North East", status: "open",
    address: "80 Punggol Field, Singapore 828815", slots: [mixed("Mon", "7:30pm – 8:30pm")] },

  // ----- North West
  { code: "CCKC", name: "Chua Chu Kang Dojo", region: "North West", status: "open",
    address: "35 Teck Whye Ave, Singapore 688892", slots: [mixed("Sat", "4:30pm – 5:30pm")] },
  { code: "SJCC", name: "Senja-Cashew Community Club Dojo", region: "North West", status: "open",
    address: "101 Bukit Panjang Rd, Singapore 679910", slots: [kids("Thu", "8:00pm – 9:00pm"), adult("Thu", "8:00pm – 9:15pm")] },
];
