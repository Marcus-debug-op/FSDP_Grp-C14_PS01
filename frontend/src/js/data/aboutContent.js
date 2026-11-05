// ============================================================
// CONTENT FOR THE ABOUT PAGE
// Edit text here: the page layout does not need to change.
// ============================================================

// The nine sections on the About page (order = order of the side menu)
export const aboutTabs = [
  { id: "benefits", label: "Benefits of Aikido", kanji: "益" },
  { id: "history", label: "Our History", kanji: "史" },
  { id: "vision", label: "Vision & Mission", kanji: "志" },
  { id: "shihan", label: "Philip Lee Shihan", kanji: "師" },
  { id: "instructors", label: "Our Instructors", kanji: "導" },
  { id: "overseas", label: "Overseas Instructors", kanji: "海" },
  { id: "family", label: "Extended Family", kanji: "家" },
  { id: "life-members", label: "Life Members", kanji: "縁" },
  { id: "careers", label: "Careers", kanji: "弟" },
];

export const aboutStats = [
  { to: 1988, label: "Founded", plain: true },
  { to: 60, suffix: "+", label: "Dojos" },
  { to: 70, label: "Instructors" },
  { to: 10000, suffix: "+", label: "Members" },
];

// ---------- Our History ----------
export const historyEras = ["All", "1988\u20132003", "2005\u20132013", "2014\u20132024"];
export const eraOf = (year) => (year <= 2003 ? "1988\u20132003" : year <= 2013 ? "2005\u20132013" : "2014\u20132024");

export const history = [
  { year: 1988, title: "The birth of Aikido Shinju-Kai", text: "Philip Lee Shihan founds the school at SAFRA Tampines. The first instructors are John Lim, Kelly Tan, Alice Tan and Allan Lai." },
  { year: 1995, title: "Building the foundation", text: "Eight years go into building strong discipline and culture before a second dojo opens at Cheng San Community Centre." },
  { year: 1999, title: "The expansion", text: "Eight new dojos open in community clubs, and aikido training begins for the Gurkha Contingent of the Singapore Police Force." },
  { year: 2001, title: "Official recognition", text: "Hombu Dojo, the Aikido World Headquarters in Japan, officially recognises the school. It also becomes the first aikido organisation to teach the Singapore Armed Forces." },
  { year: 2003, title: "First permanent headquarters", text: "A permanent training centre opens at HomeTeamNS Balestier, officiated by Masuda Seijuro Shihan (8th Dan) from Japan." },
  { year: 2005, title: "Growing overseas", text: "Dojos open in Malaysia, China and Indonesia, alongside 31 new dojos in Singapore." },
  { year: 2006, title: "Aikido in schools", text: "Recognised by the Ministry of Education and the Singapore Sports Council, the school brings aikido to thousands of students through the Sports Education Programme." },
  { year: 2008, title: "20th anniversary", text: "The first All Aikido Shinju-Kai Demonstration and Youth Aikido Meet welcomes over 800 participants from 17 countries, with Hiroshi Tada Shihan (9th Dan). The first public demonstration is held at Ngee Ann City Civic Plaza." },
  { year: 2010, title: "International Friendship Seminar", text: "The first seminar brings together aikido communities from Japan, the United Kingdom, Canada, Belgium and Singapore." },
  { year: 2011, title: "Giving back, and AikiForest", text: "A one-day donation drive raises S$32,270 for victims of the Tohoku earthquake and tsunami. The school also launches AikiForest, the first aikido school for children as young as three." },
  { year: 2013, title: "25th anniversary", text: "The school stands at 48 dojos in Singapore and 30 in China, Indonesia and Malaysia, and wins the Promising SME 500 Award and the Industry Star Award." },
  { year: 2014, title: "A heritage katana", text: "Masaki Tani of the Aikido World Headquarters presents a certified 800-year-old katana as a symbol of friendship." },
  { year: 2015, title: "SG50 celebration", text: "The SG50 demonstration and seminar at Toa Payoh Sports Centre is organised together with the other founding figures of aikido in Singapore: Harry Ng, George Chang, Freddy Khong and Seah Ah Hee." },
  { year: 2016, title: "National Chingay Parade", text: "Chosen by the People's Association to represent aikido at the Chingay Parade, with a demonstration in front of over 180,000 spectators. The first Keiko Hajime, the annual first class of the year, is also held." },
  { year: 2017, title: "Entering China", text: "After 15 years of promoting aikido in China, a China-based headquarters is set up in Shanghai. Shidoin Aloyseus Lee is stationed there for three years." },
  { year: 2018, title: "30th anniversary", text: "Mitsuteru Ueshiba, Dojo-Cho of Hombu Dojo, is guest of honour with over 800 participants from 26 countries. A new 200 m\u00b2 dojo opens at Heartbeat@Bedok." },
  { year: 2019, title: "Facing COVID-19", text: "The pandemic hits and many dojos lose students as people turn to other ways to exercise." },
  { year: 2022, title: "Back to normal", text: "The school stays positive and rebuilds its membership slowly and steadily." },
  { year: 2024, title: "A home of our own", text: "After 36 years, the school opens its own permanent Headquarters and Shinju Hub at Thomson V One on 18 May 2024." },
];

// ---------- Vision & Mission ----------
export const vision = "To be recognised as South-East Asia's leading aikido organisation.";
export const missions = [
  { title: "Excellence", text: "Provide aikido instruction of the highest quality." },
  { title: "Reach", text: "Spread aikido to all walks of life." },
  { title: "Growth", text: "Bring out the best in each person and help them find greater satisfaction in life." },
];

// ---------- Philip Lee Shihan ----------
// highlight: true = shown by default; the rest appear under "Show full timeline"
export const shihanProfile = {
  name: "Philip Lee Shihan",
  chinese: "师范李馥全",
  role: "Founder and Chief Instructor",
  summary: "Born in Singapore on 29 October 1954, Philip Lee Shihan is regarded as one of the five founding fathers of aikido in Singapore. He holds the grade of 7th Dan from the Aikido World Headquarters in Japan.",
};
export const shihanTimeline = [
  { year: 1963, age: 9, text: "Begins martial arts with Wushu, followed by three decades of Judo, Taichi, Karate and Kodachi Goshindo." },
  { year: 1971, age: 17, text: "Starts aikido under Sensei Harry Ng at the YMCA, Stevens Road.", highlight: true },
  { year: 1973, age: 19, text: "Completes two years of National Service with the School of Combat Engineers." },
  { year: 1978, age: 24, text: "Graduates in architectural draughtsmanship from Singapore Polytechnic." },
  { year: 1979, age: 25, text: "Appointed an instructor under Aikikai Singapore." },
  { year: 1981, age: 27, text: "One of the first two Singaporeans to train as a live-in student (uchideshi) at the Aikido World Headquarters under the second Doshu, Kisshomaru Ueshiba.", highlight: true },
  { year: 1982, age: 28, text: "Founds a permanent dojo at SAFRA Bukit Merah and becomes a founding member of Aikikai Singapore, serving as Secretary General until 2002." },
  { year: 1985, age: 31, text: "Starts an interior and construction company and joins the Special Constabulary as a Physical Training Instructor at the Police Academy." },
  { year: 1988, age: 34, text: "Founds Aikido Shinju-Kai with his first dojo at SAFRA Tampines.", highlight: true },
  { year: 1989, age: 35, text: "First Singaporean awarded a teaching certificate in Kodachi Goshindo by the International Sports Chanbara Association, Japan." },
  { year: 1990, age: 36, text: "Wins gold in the Open Kodachi category in Yokohama, Japan." },
  { year: 1999, age: 45, text: "Awarded 5th Dan by the Aikido World Headquarters and introduces aikido to the Gurkha Contingent." },
  { year: 2001, age: 47, text: "Brings aikido to the Singapore Armed Forces with a programme tailored for the guards unit." },
  { year: 2002, age: 48, text: "Opens his first dojo in China, in Shanghai." },
  { year: 2003, age: 49, text: "Leaves his business to promote aikido full time and sets up the first permanent headquarters." },
  { year: 2005, age: 51, text: "Awarded 6th Dan by third Doshu Moriteru Ueshiba. Opens the first dojos in Johor Bahru and Batam.", highlight: true },
  { year: 2010, age: 56, text: "Starts the International Friendship Seminar." },
  { year: 2014, age: 60, text: "Conferred the title of Shihan by the Aikido World Headquarters.", highlight: true },
  { year: 2017, age: 63, text: "Awarded 7th Dan by Moriteru Ueshiba at the annual Kagami Biraki Ceremony.", highlight: true },
  { year: 2018, age: 64, text: "Founds Aikido Shinju-Kai (E) Pte Ltd to grow aikido in the east, with the Bedok centre opened by Mitsuteru Ueshiba." },
  { year: 2024, age: 70, text: "Opens the first permanent Headquarters with two training halls, a lounge and a caf\u00e9.", highlight: true },
];

// ---------- Overseas instructors ----------
export const overseasCountries = ["China", "Indonesia", "Malaysia"];
export const overseasInstructors = {
  China: [
    { name: "余立人老师", dojo: "上海合气会馆", rank: "5th Dan" },
    { name: "卢剑文老师", dojo: "鸿胜合气道", rank: "5th Dan" },
    { name: "林骏老师", dojo: "心勝道场", rank: "5th Dan" },
    { name: "Fox Mok 老师", dojo: "心柔会上海道场", rank: "4th Dan" },
    { name: "钟滢老师", dojo: "心柔会上海道场", rank: "4th Dan" },
    { name: "王翊迪老师", dojo: "心柔会上海道场", rank: "4th Dan" },
    { name: "于卫兵老师", dojo: "极风武道馆", rank: "4th Dan" },
    { name: "贾璐老师", dojo: "武之禅合气道", rank: "4th Dan" },
    { name: "柴华老师", dojo: "武研社", rank: "4th Dan" },
    { name: "冯福海", dojo: "鸿胜合气道", rank: "3rd Dan" },
    { name: "富强", dojo: "合气道极武道场", rank: "3rd Dan" },
    { name: "楼小宇", dojo: "擎云道场", rank: "3rd Dan" },
    { name: "张飞", dojo: "正武合气道", rank: "3rd Dan" },
    { name: "王军", dojo: "金龍道场", rank: "2nd Dan" },
    { name: "陈鹏程", dojo: "燕道场", rank: "2nd Dan" },
    { name: "林晓燕", dojo: "燕道场", rank: "2nd Dan" },
    { name: "李勇", dojo: "合气道北京胜心馆", rank: "2nd Dan" },
  ],
  Indonesia: [
    { name: "Hendy Louis", dojo: "Shinkenryukai", rank: "3rd Dan" },
    { name: "Elvis Mardi", dojo: "Seiki Kai Indonesia", rank: "2nd Dan" },
    { name: "Handy Gunawan", dojo: "Shinkenryukai", rank: "2nd Dan" },
    { name: "Ronald Wibawa", dojo: "Seiki Kai Indonesia", rank: "1st Dan" },
    { name: "Bary Fardan Siregar", dojo: "Seiki Kai Indonesia", rank: "1st Dan" },
  ],
  Malaysia: [
    { name: "Bryan Loi Sensei", dojo: "Hibana Bushidoo", rank: "5th Dan" },
    { name: "Chris Khor", dojo: "Hibana Bushidoo", rank: "3rd Dan" },
    { name: "Ng Kim San Francis", dojo: "Hibana Bushidoo", rank: "2nd Dan" },
    { name: "Ku Keng Leong", dojo: "Hibana Bushidoo", rank: "2nd Dan" },
    { name: "Khoo Kiat Siong", dojo: "Hibana Bushidoo", rank: "1st Dan" },
    { name: "Ng Yu Xuan Denise", dojo: "Hibana Bushidoo", rank: "1st Dan" },
  ],
};

// ---------- Extended family ----------
export const familyCountries = [
  { country: "China", kanji: "中", places: ["Shanghai", "Shandong", "Chengdu"] },
  { country: "Indonesia", kanji: "印", places: ["West Sumatera (Padang)", "Batam", "Bandung", "Surabaya"] },
  { country: "Malaysia", kanji: "馬", places: ["Johor Bahru"] },
];
export const affiliationEmail = "iad@aikidoshinjukai.com.sg";

// ---------- Life members (by invitation) ----------
export const lifeMembers = [
  { label: "Founding Life Members \u00b7 2003", names: ["Philip Lee & Family", "Allan Lai", "Ronald Tan", "Charlie Lim", "Bob Tan", "Denny Oetomo", "Jennifer Goh", "Annie Goh", "Chew Eng Lam", "Ahmad Bin Ibrahim", "Kuah Chui Heong", "Bernie Ho", "Vaughan Michael Prentice (deceased)", "Lynn Tan", "Shawn Wang", "Lim Cheen Cheen", "Alice Tan", "James Moy", "Stanley Ang", "Quah Yong Lok", "Trevor Ellis & Family", "Tey Guan Kiat", "Sam Yeo"] },
  { label: "2005", names: ["Pang Kim Lock"] },
  { label: "2006", names: ["Chua Yu Zhan & Brothers (4 pax)", "Ted Ngo"] },
  { label: "2007", names: ["Joanne Leong", "Tan Kok Hiang"] },
  { label: "2008", names: ["Erik Heng & Family (3 pax)"] },
  { label: "2010", names: ["Magali Nicolas & Family (2 pax)", "Teo Kok Meng & Family (4 pax)"] },
  { label: "2011", names: ["N. Y. Lee", "Foo Choon Mei", "James Tan & Family (4 pax)"] },
  { label: "2012", names: ["Ross Lee & Brothers (3 pax)"] },
  { label: "2016", names: ["Edmund Loh Kim Man", "Marvin Tay Choon How", "Chong Quey Lim & Family"] },
  { label: "2019", names: ["Kevin Kwok"] },
  { label: "2020", names: ["Nathaniel Abramowich", "Denise Wong", "Ma\u00eblys Desmartes"] },
  { label: "2024", names: ["Gregorio Jury", "Billy Lim", "Elaine Ong", "Catherine Kang", "Roman Tan & Family", "Dan Mosley", "Endean Tan"] },
];

// ---------- Careers: the Deshi programme ----------
export const deshi = {
  intro: "Deshi means \u201cdisciple\u201d. The Deshi Programme is for serious practitioners who want to train intensively at the Headquarters, following the traditional Japanese way of dedicated practice.",
  daily: "A Deshi usually trains two classes a day plus special practices, which is on average about three times as much as a regular student. Training also covers duties such as caring for the training centre and helping with operations and special projects. Most Deshi fit this around school or work during the day.",
  qualifications: [
    "Open to men and women aged 18 to 40",
    "Healthy, and able to train every day",
    "Individual health insurance in good standing",
    "Able to support yourself for the whole term",
    "Minimum rank of 1st Kyu (Black-Gold belt)",
    "A letter of recommendation from your current instructor",
  ],
  responsibilities: [
    "Train at least twice a day at the Headquarters Dojo",
    "Assist instructors during classes",
    "Maintain the training facilities",
    "Help with administrative tasks",
    "Represent Aikido Shinju-Kai at events and seminars",
  ],
  apply: [
    "A cover letter explaining your motivation",
    "Your current grade and training history",
    "A letter of recommendation from your instructor",
    "Your proposed term",
  ],
  email: "iad@aikidoshinjukai.com.sg",
};
