/**
 * Regions and cities of Isometric World. Pure data, shared by the pipeline and the web viewer.
 *
 * A REGION is one flat map: one orthographic camera in a local East-North-Up frame at its origin,
 * one tile pyramid (web/public/regions/<id>/). A flat map is accurate to ~1° of building lean at
 * 100 km from its origin, so a region can hold all cities within ~150 km and you scroll between them.
 * Far-apart cities get their own region (joined later by a world overview).
 *
 * A CITY is a named view into a region: /<city-slug> opens the region centred on it.
 */

export interface Region {
  title: string;
  /** ENU origin. Fixed forever once tiles exist: changing it moves every tile of the region. */
  origin: { lat: number; lon: number; h: number };
  /** Compass bearing the camera looks toward (pick it diagonal to the main street grid). */
  headingDeg: number;
  /** OSM country (name:en of the admin_level=2 area) and municipality names (admin_level=8) for the border overlay. */
  country: string;
  municipalities: string[];
  /** admin_level values of the border overlay's municipalities (default ["8"]; a city-county like Stuttgart is 6). */
  adminLevels?: string[];
  /**
   * Airliners on final approach drawn over the map (optional): runway threshold, true heading,
   * threshold ellipsoid height (default 0) and the stretch drawn in metres before the threshold
   * (default 22000 → 7000; negative = past it, on the runway). web/src/scripts/sky.ts.
   */
  airport?: { lat: number; lon: number; runwayHeadingDeg: number; h?: number; from?: number; to?: number };
  /** Credit lines (video mode and footer). */
  credits: string[];
  /** Optional source-specific credit lines. Applied only when an artifact declares that source. */
  creditsBySource?: Record<string, string[]>;
  /** Geoid undulation at the origin (EGM2008, m): sea level as ellipsoid height. */
  geoidM: number;
  /** Typical ground ellipsoid height (m): area outlines and the first guess before the terrain is known. */
  groundH: number;
  /**
   * Ellipsoid height (m) the height pass counts from: it stores 0…655 m above `heightBase - 100`
   * (cm, 16 bit), so a hilly region shifts it to keep its valleys and towers in range. Default 0.
   */
  heightBase?: number;
  /**
   * Where buildings, trees and terrain come from beyond OSM:
   *   "tlv"  Tel Aviv-Yafo municipal GIS (buildings + canopy), Copernicus GLO-30 terrain
   *   "lgl"  LGL Baden-Württemberg open data: LoD2 buildings, nDOM1 tree crowns, DGM1 terrain
   *   unset  OSM buildings and trees, Copernicus GLO-30 terrain
   */
  sources?: "tlv" | "lgl";
  /** OSM from this Geofabrik .osm.pbf extract (osmlocal.ts) instead of the Overpass API. */
  osmExtract?: string;
  /**
   * Shape of the map (outline.ts): the union of OSM boundary relations (from `osmExtract`) plus extra
   * boxes [s, w, n, e]. Only tiles inside are fetched and rendered, and the map edge fades along its
   * outer border (not along borders between the relations). Default: the areas' bboxes.
   */
  outline?: { relations: number[]; add?: Array<[number, number, number, number]> };
}

export interface City {
  title: string;
  region: string;
  /** Opening view: centre and on-screen width in metres. */
  center: [number, number];
  widthM: number;
}

export const REGIONS: Record<string, Region> = {
  bologna: {
    title: "Bologna",
    // BO-001: fixed before the first render; see docs/bologna-data-audit.md.
    origin: { lat: 44.4938, lon: 11.343, h: 0 }, // Piazza Maggiore, WGS84 ellipsoid
    headingDeg: 315, // NW: diagonal to the central north/south and east/west streets
    country: "Italy",
    municipalities: ["Bologna"],
    credits: [
      "Map data © OpenStreetMap contributors",
      "Terrain: Copernicus DEM © DLR, Airbus DS",
    ],
    creditsBySource: {
      ctc: ["Comune di Bologna – SIT · CTC Edifici volumetrici · CC BY 4.0 (projected, filtered and extruded)", "https://opendata.comune.bologna.it/explore/dataset/c_a944ctc_edifici_pl/ · https://creativecommons.org/licenses/by/4.0/"],
      trees: ["Comune di Bologna – Settore Ambiente e Verde · Alberi in manutenzione · CC BY 4.0 (projected, filtered; class-based estimates)", "https://opendata.comune.bologna.it/explore/dataset/alberi-manutenzioni/ · https://creativecommons.org/licenses/by/4.0/"],
    },
    geoidM: 39.647, // GeographicLib EGM2008 at origin; orthometric + N = ellipsoid
    groundH: 100, // initial projection estimate (~60 m MSL + geoid); terrain replaces it
    // sources intentionally unset: OSM buildings/trees + Copernicus, no municipal adapters yet.
  },
  "israel-center": {
    title: "Israel · Center",
    origin: { lat: 32.0778, lon: 34.774, h: 0 }, // Dizengoff Square
    headingDeg: 340, // 20° west of north: diagonal to Tel Aviv's grid, sea on the left
    country: "Israel",
    municipalities: [
      "תל־אביב–יפו", // maqaf + en dash, as in OSM relation 1382494
      "רמת גן",
      "גבעתיים",
      "בני ברק",
      "חולון",
      "בת ים",
      "הרצליה",
      "רמת השרון",
      "פתח תקווה",
      "קריית אונו",
      "אור יהודה",
      "גבעת שמואל",
    ],
    airport: { lat: 32.0055, lon: 34.8854, runwayHeadingDeg: 117 }, // Ben Gurion, runway 12
    credits: [
      "Map data © OpenStreetMap contributors · Tel Aviv-Yafo Municipality",
      "Terrain: Copernicus DEM © DLR, Airbus DS · Painted with AI",
    ],
    geoidM: 19.1,
    groundH: 25,
    sources: "tlv",
  },
  stuttgart: {
    title: "Stuttgart",
    origin: { lat: 48.7784, lon: 9.18, h: 0 }, // Schlossplatz
    headingDeg: 257, // looks WSW from the Neckar side, where the Kessel opens; main grid (Königstraße, 212°) at 45°
    country: "Germany",
    municipalities: [
      "Stuttgart", "Fellbach", "Kernen im Remstal", "Esslingen am Neckar", "Ostfildern", "Neuhausen auf den Fildern",
      "Filderstadt", "Leinfelden-Echterdingen", "Sindelfingen", "Leonberg", "Gerlingen", "Ditzingen",
      "Korntal-Münchingen", "Kornwestheim", "Remseck am Neckar", "Waiblingen", "Ludwigsburg", "Böblingen",
    ],
    adminLevels: ["6", "8"], // Stuttgart is a city-county (admin_level 6), its neighbours are 8
    credits: [
      "Map data © OpenStreetMap contributors · Datenquelle: LGL, www.lgl-bw.de, dl-de/by-2-0 (verändert)",
      "Buildings: LGL LoD2 · Terrain: LGL DGM1, Copernicus DEM © DLR, Airbus DS · Trees: LGL nDOM1",
    ],
    // Stuttgart Airport (EDDS) runway 25: threshold and true heading from OSM (way 164016757, node 10710079299),
    // threshold ground 359.9 m NHN from LGL DGM1 (+ geoid 48.4). Planes come in from the east over the faded
    // edge, cross the threshold at 30 m and roll out on the runway (the outline's airport box).
    airport: { lat: 48.6940216, lon: 9.2438069, runwayHeadingDeg: 254, h: 408.3, from: 6000, to: -2500 },
    osmExtract: "https://download.geofabrik.de/europe/germany/baden-wuerttemberg/stuttgart-regbez-latest.osm.pbf",
    geoidM: 48.4, // EGM2008 at Schlossplatz (GeographicLib GeoidEval: 48.373 m)
    groundH: 300, // Kessel floor ~245 m NHN + geoid
    heightBase: 250, // valley ~250 m, Fernsehturm top ~750 m ellipsoid: 150…805 m fits
    sources: "lgl",
    // Stuttgart (OSM relation 62375, Stadtkreis) and the towns around it (admin_level 8): Fellbach, Waiblingen,
    // Remseck am Neckar, Ludwigsburg, Kornwestheim, Korntal-Münchingen, Gerlingen, Ditzingen, Böblingen,
    // Sindelfingen, Leonberg, Esslingen am Neckar, Ostfildern, Filderstadt, Leinfelden-Echterdingen;
    // plus a box over Stuttgart Airport (EDDS) and the Messe, which straddle the borders
    outline: {
      relations: [62375, 401692, 401697, 405291, 405292, 405293, 405811, 405812, 405817, 722090, 722092, 722150, 2792882, 2793022, 2796535, 2796536],
      add: [[48.672, 9.17, 48.712, 9.262]],
    },
  },
};

export const CITIES: Record<string, City> = {
  bologna: { title: "Bologna", region: "bologna", center: [44.4938, 11.343], widthM: 1500 },
  "tel-aviv-yafo": { title: "Tel Aviv-Yafo", region: "israel-center", center: [32.0745, 34.7810], widthM: 5200 },
  stuttgart: { title: "Stuttgart", region: "stuttgart", center: [48.7784, 9.18], widthM: 3000 },
};

export const DEFAULT_CITY = "tel-aviv-yafo";
