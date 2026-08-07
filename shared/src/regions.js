// Catalog of deployable regions. Each entry is a procedurally generated
// grid (same generation technique as the original "Metroville" demo city)
// anchored at real-world coordinates with real street-naming conventions,
// so the same engine can stand up a plausible network for "any place on the
// globe" without depending on a live geocoding/OSM call at runtime.
//
// These are illustrative grids for demo/operational purposes, not surveyed
// intersection data - block spacing is a realistic approximation, not a
// precise survey. A real municipal deployment would replace a region entry
// with its actual signal-controller inventory (see docs/ARCHITECTURE.md).
export const REGIONS = {
  bangalore: {
    id: "bangalore",
    cityName: "HSR Layout & Silk Board, Bangalore, Karnataka",
    description: "Active emergency corridor through Outer Ring Road, HSR Layout, Silk Board, and JP Nagar.",
    cols: ["Outer Ring Rd", "14th Main Rd", "17th Cross Rd", "24th Main Rd"],
    rows: ["HSR 19th Main", "Silk Board Corridor", "JP Nagar ORR"],
    baseLat: 12.9175,
    baseLng: 77.6228,
    latStep: 0.001,
    lngStep: 0.001,
  },
  belagavi: {
    id: "belagavi",
    cityName: "Tilakwadi & RPD College Rd, Belagavi, Karnataka",
    description: "Emergency medical transit grid linking Tilakwadi First Gate, Congress Road, and Chennamma Circle.",
    cols: ["RPD College Rd", "Khanapur Rd", "Congress Rd", "Tilakwadi First Gate"],
    rows: ["Chennamma Circle Blvd", "RPD Cross Rd", "Club Road"],
    baseLat: 15.8497,
    baseLng: 74.4977,
    latStep: 0.001,
    lngStep: 0.001,
  }
};

export const DEFAULT_REGION_ID = "bangalore";

export function getRegion(regionId) {
  const region = REGIONS[regionId || DEFAULT_REGION_ID];
  if (!region) {
    const available = Object.keys(REGIONS).join(", ");
    throw new Error(`Unknown region "${regionId}". Available regions: ${available}`);
  }
  return region;
}

export function listRegions() {
  return Object.values(REGIONS).map(({ id, cityName, description }) => ({ id, cityName, description }));
}
