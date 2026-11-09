// =====================================================================
// Singapore postal codes -> rough location, for FSDP-42's nearby-dojo
// suggestions.
//
// Why this and not a geocoding API: every dojo address in `centres` already
// carries a 6-digit postal code, and the first two digits (the postal
// sector) place an address inside one of Singapore's 28 postal districts.
// That is enough to rank dojos by distance without a network call, an API
// key, or storing coordinates for every student. It works offline and it
// cannot fail halfway through saving a student's address.
//
// What it is NOT: exact. Distances are measured between the approximate
// CENTRES of two districts, so they are accurate to a couple of kilometres,
// and two addresses in the same district come out as distance 0. Good
// enough to sort a list and say "closest first"; not good enough to print
// a precise distance or to drive navigation. Anything that shows these
// numbers to a student should round them and hedge the wording.
//
// Sector -> district mapping is the standard SingPost/URA table (28
// districts, sectors 01-82). Sector 74 is not assigned in that table, so it
// resolves to null and is handled as "unknown", like any malformed code.
// =====================================================================

// lat/lng are an approximate centre for the district, not a real address.
export const POSTAL_DISTRICTS = [
  { district: 1,  sectors: ["01", "02", "03", "04", "05", "06"], area: "Raffles Place, Marina, Cecil",            lat: 1.2830, lng: 103.8513 },
  { district: 2,  sectors: ["07", "08"],                         area: "Anson, Tanjong Pagar",                    lat: 1.2760, lng: 103.8450 },
  { district: 3,  sectors: ["14", "15", "16"],                   area: "Queenstown, Tiong Bahru, Bukit Merah",    lat: 1.2860, lng: 103.8220 },
  { district: 4,  sectors: ["09", "10"],                         area: "Telok Blangah, HarbourFront, Sentosa",    lat: 1.2650, lng: 103.8220 },
  { district: 5,  sectors: ["11", "12", "13"],                   area: "Clementi, West Coast, Pasir Panjang",     lat: 1.2950, lng: 103.7720 },
  { district: 6,  sectors: ["17"],                               area: "City Hall, Fort Canning",                 lat: 1.2930, lng: 103.8520 },
  { district: 7,  sectors: ["18", "19"],                         area: "Bugis, Beach Road, Middle Road",          lat: 1.3000, lng: 103.8580 },
  { district: 8,  sectors: ["20", "21"],                         area: "Little India, Farrer Park",               lat: 1.3100, lng: 103.8530 },
  { district: 9,  sectors: ["22", "23"],                         area: "Orchard, River Valley, Cairnhill",        lat: 1.3000, lng: 103.8400 },
  { district: 10, sectors: ["24", "25", "26", "27"],             area: "Tanglin, Holland, Bukit Timah",           lat: 1.3150, lng: 103.8100 },
  { district: 11, sectors: ["28", "29", "30"],                   area: "Novena, Thomson, Watten Estate",          lat: 1.3250, lng: 103.8370 },
  { district: 12, sectors: ["31", "32", "33"],                   area: "Balestier, Toa Payoh, Serangoon",         lat: 1.3330, lng: 103.8550 },
  { district: 13, sectors: ["34", "35", "36", "37"],             area: "Macpherson, Braddell",                    lat: 1.3350, lng: 103.8800 },
  { district: 14, sectors: ["38", "39", "40", "41"],             area: "Geylang, Eunos",                          lat: 1.3180, lng: 103.8900 },
  { district: 15, sectors: ["42", "43", "44", "45"],             area: "Katong, Joo Chiat, Marine Parade",        lat: 1.3050, lng: 103.9050 },
  { district: 16, sectors: ["46", "47", "48"],                   area: "Bedok, Upper East Coast",                 lat: 1.3250, lng: 103.9400 },
  { district: 17, sectors: ["49", "50", "81"],                   area: "Changi, Loyang",                          lat: 1.3500, lng: 103.9700 },
  { district: 18, sectors: ["51", "52"],                         area: "Tampines, Pasir Ris",                     lat: 1.3550, lng: 103.9450 },
  { district: 19, sectors: ["53", "54", "55", "82"],             area: "Hougang, Serangoon Garden, Punggol",      lat: 1.3700, lng: 103.8950 },
  { district: 20, sectors: ["56", "57"],                         area: "Bishan, Ang Mo Kio",                      lat: 1.3600, lng: 103.8400 },
  { district: 21, sectors: ["58", "59"],                         area: "Upper Bukit Timah, Clementi Park",        lat: 1.3350, lng: 103.7800 },
  { district: 22, sectors: ["60", "61", "62", "63", "64"],       area: "Jurong East, Jurong West",                lat: 1.3400, lng: 103.7100 },
  { district: 23, sectors: ["65", "66", "67", "68"],             area: "Hillview, Bukit Panjang, Choa Chu Kang",  lat: 1.3800, lng: 103.7620 },
  { district: 24, sectors: ["69", "70", "71"],                   area: "Lim Chu Kang, Tengah",                    lat: 1.3900, lng: 103.7000 },
  { district: 25, sectors: ["72", "73"],                         area: "Kranji, Woodlands",                       lat: 1.4350, lng: 103.7850 },
  { district: 26, sectors: ["77", "78"],                         area: "Upper Thomson, Springleaf, Mandai",       lat: 1.4000, lng: 103.8200 },
  { district: 27, sectors: ["75", "76"],                         area: "Yishun, Sembawang",                       lat: 1.4300, lng: 103.8350 },
  { district: 28, sectors: ["79", "80"],                         area: "Seletar, Yio Chu Kang",                   lat: 1.4050, lng: 103.8700 },
];

// sector ("56") -> the district entry above. Built once, read many times.
const BY_SECTOR = new Map();
for (const entry of POSTAL_DISTRICTS) {
  for (const sector of entry.sectors) BY_SECTOR.set(sector, entry);
}

// True only for exactly six digits. Used for form validation, so it is
// deliberately stricter than readPostalCode below.
export function isPostalCode(value) {
  return typeof value === "string" && /^\d{6}$/.test(value);
}

// Pulls a 6-digit postal code out of a free-text address, e.g.
// "5 Bishan Street 14, Singapore 579783" -> "579783".
// Prefers one written after "Singapore", because some addresses contain
// other 6-digit-looking runs. Returns null when there isn't one.
export function readPostalCode(address) {
  if (typeof address !== "string") return null;
  const labelled = address.match(/Singapore\s+(\d{6})\b/i);
  if (labelled) return labelled[1];
  const bare = address.match(/\b(\d{6})\b/);
  return bare ? bare[1] : null;
}

// The district a postal code sits in, or null if the sector isn't assigned.
export function districtFor(postalCode) {
  if (!isPostalCode(postalCode)) return null;
  return BY_SECTOR.get(postalCode.slice(0, 2)) || null;
}

// Straight-line distance in km between two {lat, lng} points.
export function distanceKm(from, to) {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// Ranks places (dojos from `centres`) by how close they are to a student's
// postal code, closest first.
//
// Each place needs { address }; everything else on it is passed through.
// Adds: district, area, distanceKm (rounded to 1dp, or null), sameDistrict.
//
// Places whose address has no readable postal code, or an unassigned
// sector, keep their details but sort last with distanceKm: null -- better
// to list a dojo without a distance than to drop it from the directory.
// Returns [] when the student's own postal code is unusable, so the caller
// can tell "no suggestions yet" apart from "no dojos".
export function rankByProximity(studentPostalCode, places = [], limit = null) {
  const home = districtFor(studentPostalCode);
  if (!home) return [];

  const ranked = places.map((place) => {
    const code = readPostalCode(place.address || "");
    const district = districtFor(code);
    return {
      ...place,
      postalCode: code,
      district: district ? district.district : null,
      area: district ? district.area : null,
      sameDistrict: Boolean(district && district.district === home.district),
      distanceKm: district ? Math.round(distanceKm(home, district) * 10) / 10 : null,
    };
  });

  ranked.sort((a, b) => {
    // Unknown distance always sorts last, whichever side it is on.
    if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name);
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    // Same district (distance 0) or a genuine tie: keep it stable by name.
    return a.name.localeCompare(b.name);
  });

  return limit ? ranked.slice(0, limit) : ranked;
}

// Short human label for a ranked row, e.g. "In your area" / "About 7 km away".
// Kept here so the API and any future caller word it the same way.
export function proximityLabel(row) {
  if (row.distanceKm === null) return "Distance unknown";
  if (row.sameDistrict) return "In your area";
  if (row.distanceKm < 1) return "About 1 km away";
  return `About ${Math.round(row.distanceKm)} km away`;
}
