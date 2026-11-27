/**
 * Orthographic globe math. Pure functions, no DOM, no data fetched from anywhere:
 * continents are a handful of coarse hand-written polygons sampled into dots at startup.
 */

const RAD = Math.PI / 180;

export interface Pt {
  /** Screen-space, -1..1 (right is +x). */
  x: number;
  /** Screen-space, -1..1 (up is +y). */
  y: number;
  /** Cosine of the angular distance from the view centre: > 0 means on the visible hemisphere. */
  depth: number;
}

export interface Camera {
  sinLat0: number;
  cosLat0: number;
  lon0: number; // radians
  sinLon0: number;
  cosLon0: number;
}

export function makeCamera(latDeg: number, lonDeg: number): Camera {
  return {
    sinLat0: Math.sin(latDeg * RAD),
    cosLat0: Math.cos(latDeg * RAD),
    lon0: lonDeg * RAD,
    sinLon0: Math.sin(lonDeg * RAD),
    cosLon0: Math.cos(lonDeg * RAD),
  };
}

/** Projection from pre-computed trig values (hot path: called once per land dot per frame). */
export function projectTrig(sinLat: number, cosLat: number, lonRad: number, cam: Camera, out: Pt): Pt {
  const dl = lonRad - cam.lon0;
  const cosDl = Math.cos(dl);
  out.depth = cam.sinLat0 * sinLat + cam.cosLat0 * cosLat * cosDl;
  out.x = cosLat * Math.sin(dl);
  out.y = cam.cosLat0 * sinLat - cam.sinLat0 * cosLat * cosDl;
  return out;
}

export function project(latDeg: number, lonDeg: number, camLatDeg: number, camLonDeg: number): Pt {
  const lat = latDeg * RAD;
  return projectTrig(Math.sin(lat), Math.cos(lat), lonDeg * RAD, makeCamera(camLatDeg, camLonDeg), {
    x: 0,
    y: 0,
    depth: 0,
  });
}

/** Signed shortest rotation from `from` to `to`, in degrees, within (-180, 180]. */
export function shortestAngle(from: number, to: number): number {
  let d = (((to - from) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/* Very coarse continent outlines as [lon, lat]. Recognisable as dots; not cartography. */
export const LAND: readonly (readonly [number, number][])[] = [
  // North America (with Alaska and Central America)
  [[-168, 66], [-156, 71], [-140, 70], [-125, 70], [-95, 72], [-82, 69], [-62, 60], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 30], [-80, 25], [-84, 30], [-90, 29], [-97, 26], [-97, 20], [-90, 21], [-87, 21], [-83, 10], [-78, 8], [-80, 8], [-86, 12], [-92, 15], [-105, 20], [-110, 24], [-114, 31], [-117, 32], [-120, 34.5], [-122.6, 37.5], [-124.3, 40.5], [-124, 46], [-124, 48], [-135, 58], [-148, 60], [-155, 58], [-165, 62]],
  // Greenland
  [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-40, 83], [-65, 80], [-72, 76], [-58, 70]],
  // South America
  [[-78, 8], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-35, -6], [-39, -14], [-41, -22], [-48, -26], [-58, -35], [-62, -40], [-66, -46], [-68, -54], [-72, -52], [-74, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 2]],
  // Europe (to western Russia)
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 57], [5, 59], [5, 62], [14, 68], [25, 71], [30, 70], [40, 67], [30, 60], [30, 56], [28, 50], [30, 46], [28, 41], [24, 38], [20, 40], [15, 38], [12, 42], [8, 44], [3, 43], [-5, 36]],
  // Asia (Middle East, India, South-East Asia, Siberia)
  [[28, 41], [36, 37], [36, 32], [35, 28], [43, 13], [52, 16], [58, 22], [57, 26], [66, 25], [72, 21], [73, 16], [77, 8], [80, 13], [88, 22], [92, 21], [98, 16], [100, 8], [104, 1], [109, 11], [106, 20], [112, 22], [120, 30], [122, 39], [125, 40], [129, 35], [130, 42], [140, 48], [135, 54], [142, 59], [160, 62], [170, 66], [180, 68], [180, 71], [140, 73], [110, 77], [80, 74], [60, 70], [40, 67], [30, 60], [28, 50]],
  // Africa
  [[-17, 21], [-10, 30], [-6, 36], [10, 37], [11, 33], [20, 32], [32, 31], [34, 28], [43, 12], [51, 12], [40, -3], [40, -15], [35, -25], [32, -29], [20, -35], [18, -33], [12, -17], [14, -8], [9, -1], [9, 4], [-8, 4], [-17, 14]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [132, -32], [115, -34]],
  // British Isles, Japan, Borneo, Madagascar
  [[-6, 50], [1, 51], [2, 53], [-2, 58], [-6, 58], [-5, 54]],
  [[130, 32], [135, 34], [141, 38], [142, 44], [140, 41], [132, 35]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[44, -25], [49, -15], [50, -14], [44, -17]],
];

function inPolygon(lon: number, lat: number, poly: readonly [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isLand(latDeg: number, lonDeg: number): boolean {
  return LAND.some((poly) => inPolygon(lonDeg, latDeg, poly));
}

export interface LandDot {
  sinLat: number;
  cosLat: number;
  lon: number; // radians
}

/** Evenly spaced dots over land; longitude spacing widens toward the poles to keep density even. */
export function buildLandDots(stepDeg = 3.2): LandDot[] {
  const dots: LandDot[] = [];
  for (let lat = -58; lat <= 84; lat += stepDeg) {
    const lonStep = stepDeg / Math.max(Math.cos(lat * RAD), 0.2);
    for (let lon = -180; lon < 180; lon += lonStep) {
      if (isLand(lat, lon)) dots.push({ sinLat: Math.sin(lat * RAD), cosLat: Math.cos(lat * RAD), lon: lon * RAD });
    }
  }
  return dots;
}

/* ------------------------------------------------------------------ */
/* Pre-computed geometry                                               */
/* ------------------------------------------------------------------ */

export type GeoPt = LandDot;

function geoPt(latDeg: number, lonDeg: number): GeoPt {
  return { sinLat: Math.sin(latDeg * RAD), cosLat: Math.cos(latDeg * RAD), lon: lonDeg * RAD };
}

/** Continent outlines, edges densified so they bend with the sphere. */
export function buildCoastlines(maxStepDeg = 3): GeoPt[][] {
  return LAND.map((poly) => {
    const pts: GeoPt[] = [];
    for (let i = 0; i < poly.length; i++) {
      const [lon1, lat1] = poly[i];
      const [lon2, lat2] = poly[(i + 1) % poly.length];
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(lon2 - lon1), Math.abs(lat2 - lat1)) / maxStepDeg));
      for (let k = 0; k < n; k++) pts.push(geoPt(lat1 + ((lat2 - lat1) * k) / n, lon1 + ((lon2 - lon1) * k) / n));
    }
    pts.push(pts[0]);
    return pts;
  });
}

/** Latitude every 30° and longitude every 30°, as polylines. */
export function buildGraticule(): GeoPt[][] {
  const lines: GeoPt[][] = [];
  for (const lat of [-60, -30, 0, 30, 60]) {
    const l: GeoPt[] = [];
    for (let lon = -180; lon <= 180; lon += 5) l.push(geoPt(lat, lon));
    lines.push(l);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const l: GeoPt[] = [];
    for (let lat = -90; lat <= 90; lat += 5) l.push(geoPt(lat, lon));
    lines.push(l);
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Vectors: arcs above the surface, lighting, hit-testing              */
/* ------------------------------------------------------------------ */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Unit vector in the Earth frame (x→lon 0, y→lon 90°E, z→north pole). */
export function latLonToVec(latDeg: number, lonDeg: number): Vec3 {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD;
  return { x: Math.cos(lat) * Math.cos(lon), y: Math.cos(lat) * Math.sin(lon), z: Math.sin(lat) };
}

/** Point `t` (0..1) along the great circle from a to b. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return { ...a };
  const sa = Math.sin((1 - t) * omega) / Math.sin(omega);
  const sb = Math.sin(t * omega) / Math.sin(omega);
  return { x: sa * a.x + sb * b.x, y: sa * a.y + sb * b.y, z: sa * a.z + sb * b.z };
}

/** Projects an Earth-frame vector at radius `r` (1 = surface, >1 = floating above it). */
export function projectVec(v: Vec3, r: number, cam: Camera, out: Pt): Pt {
  const a = v.x * cam.cosLon0 + v.y * cam.sinLon0;
  out.x = r * (v.y * cam.cosLon0 - v.x * cam.sinLon0);
  out.y = r * (cam.cosLat0 * v.z - cam.sinLat0 * a);
  out.depth = r * (cam.sinLat0 * v.z + cam.cosLat0 * a);
  return out;
}

/** A raised point is visible if it faces us, or sticks out past the globe's silhouette. */
export function isVisible(p: Pt): boolean {
  return p.depth > 0 || p.x * p.x + p.y * p.y > 1;
}

export function clampLat(lat: number, min = -80, max = 80): number {
  return Math.max(min, Math.min(max, lat));
}

/** Light direction from a pointer position on the disc (-1..1, y up): the globe is lit from the cursor. */
export function pointerToLight(nx: number, ny: number): Vec3 {
  const r = Math.hypot(nx, ny);
  const k = r > 0.95 ? 0.95 / r : 1;
  const x = nx * k;
  const y = ny * k;
  return { x, y, z: Math.sqrt(Math.max(0, 1 - x * x - y * y)) };
}

/** Closest item within `radius` pixels of (x, y), or null. */
export function nearestPin<T extends { x: number; y: number }>(pins: readonly T[], x: number, y: number, radius: number): T | null {
  let best: T | null = null;
  let bestD = radius;
  for (const p of pins) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}
