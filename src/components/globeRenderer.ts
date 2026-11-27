import {
  buildCoastlines,
  buildGraticule,
  buildLandDots,
  isVisible,
  latLonToVec,
  makeCamera,
  pointerToLight,
  projectTrig,
  projectVec,
  slerp,
  type Camera,
  type GeoPt,
  type Pt,
  type Vec3,
} from '../utils/globe';
import { SCENARIOS, type LabelSide } from '../data/globeScenarios';

/** Globe radius as a fraction of the canvas: leaves room for the halo, ring and stars. */
export const GLOBE_R = 0.36;
/** After this long in a scenario the leak is "blocked" (matches the outcome text fading in). */
export const PROTECT_MS = 1100;

const TAU = Math.PI * 2;
const FONT_LABEL = '600 11px "Inter Variable", ui-sans-serif, system-ui, sans-serif';
const FONT_TIP = '600 11px "Inter Variable", ui-sans-serif, system-ui, sans-serif';
const FONT_TIP_SUB = '500 10px "Inter Variable", ui-sans-serif, system-ui, sans-serif';

/** Label offsets by side: north labels sit above-left/right of the pin, south ones below. */
const LABEL_OFFSET: Record<LabelSide, { dx: number; dy: number; align: CanvasTextAlign }> = {
  ne: { dx: 10, dy: -10, align: 'left' },
  nw: { dx: -10, dy: -10, align: 'right' },
  se: { dx: 10, dy: 17, align: 'left' },
  sw: { dx: -10, dy: 17, align: 'right' },
};
const ROSE = '251,113,133';
const EMERALD = '52,211,153';
const SKY = '125,211,252';

const LAND_DOTS = buildLandDots(2.6);
const COAST = buildCoastlines();
const GRATICULE = buildGraticule();

/** Leak arc per scenario: a great circle between its two hotspots, lifted off the surface. */
const ARCS = SCENARIOS.map((s) => {
  const a = latLonToVec(s.cities[0].lat, s.cities[0].lon);
  const b = latLonToVec(s.cities[1].lat, s.cities[1].lon);
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return { v: slerp(a, b, t) as Vec3, r: 1 + 0.2 * Math.sin(Math.PI * t) };
  });
});

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(7);
const STARS = Array.from({ length: 110 }, () => ({
  x: rand(),
  y: rand(),
  r: 0.6 + rand() * 1.4,
  a: 0.3 + rand() * 0.7,
  layer: 0.3 + rand() * 1.2,
  phase: rand() * TAU,
}));

export interface ScreenPin {
  x: number;
  y: number;
  depth: number;
  scenario: number;
  city: string;
  region: string;
}

export interface Frame {
  size: number;
  view: { lat: number; lon: number };
  /** Milliseconds clock for pulses, twinkle and packets. */
  t: number;
  animate: boolean;
  active: number;
  /** Milliseconds since the active scenario began; Infinity = show the "blocked" end state. */
  elapsed: number;
  /** Pointer position on the globe disc (-1..1, y up), or null when the cursor is away. */
  spot: { x: number; y: number } | null;
  /** Where the light comes from (same coordinates), already smoothed. */
  light: { x: number; y: number };
  /** Parallax offset for the starfield (-1..1). */
  parallax: { x: number; y: number };
  /** Index into the returned pin list that the cursor is over, or -1. */
  hover: number;
  dragging: boolean;
}

function strokeLines(ctx: CanvasRenderingContext2D, lines: GeoPt[][], cam: Camera, c: number, R: number) {
  const pt: Pt = { x: 0, y: 0, depth: 0 };
  ctx.beginPath();
  for (const line of lines) {
    let pen = false;
    for (const g of line) {
      projectTrig(g.sinLat, g.cosLat, g.lon, cam, pt);
      if (pt.depth <= 0) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(c + R * pt.x, c - R * pt.y);
      else ctx.moveTo(c + R * pt.x, c - R * pt.y);
      pen = true;
    }
  }
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tooltip(ctx: CanvasRenderingContext2D, size: number, x: number, y: number, title: string, sub: string) {
  ctx.font = FONT_TIP;
  const w = Math.max(ctx.measureText(title).width, ctx.measureText(sub).width) + 18;
  const h = 36;
  let tx = x + 14;
  let ty = y - h - 12;
  if (tx + w > size - 4) tx = x - w - 14;
  if (ty < 4) ty = y + 16;
  roundRect(ctx, tx, ty, w, h, 8);
  ctx.fillStyle = 'rgba(5,11,24,0.92)';
  ctx.fill();
  ctx.strokeStyle = `rgba(${SKY},0.45)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(title, tx + 9, ty + 15);
  ctx.font = FONT_TIP_SUB;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(sub, tx + 9, ty + 28);
}

/**
 * Draws one frame and returns where the pins landed on screen (for cursor hit-testing).
 * Pure 2D canvas: no textures, tiles or network.
 */
export function drawGlobe(ctx: CanvasRenderingContext2D, f: Frame): ScreenPin[] {
  const { size, t, animate } = f;
  const R = size * GLOBE_R;
  const c = size / 2;
  const cam = makeCamera(f.view.lat, f.view.lon);
  const pt: Pt = { x: 0, y: 0, depth: 0 };
  const L = pointerToLight(f.light.x, f.light.y);

  ctx.clearRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = 'source-over';

  // Stars, shifted by the cursor for a hint of depth.
  ctx.fillStyle = '#cbd5e1';
  for (const s of STARS) {
    const twinkle = animate ? 0.65 + 0.35 * Math.sin(t / 900 + s.phase) : 0.8;
    ctx.globalAlpha = s.a * twinkle * 0.8;
    ctx.fillRect(s.x * size + f.parallax.x * s.layer * 16, s.y * size + f.parallax.y * s.layer * 16, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // Orbit ring with a satellite: the back half is drawn before the globe, the front half after.
  const rx = R * 1.34;
  const ry = R * 0.36;
  const sat = animate ? t / 4200 : 1.2;
  const drawRing = (front: boolean) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-0.32);
    ctx.strokeStyle = `rgba(${SKY},${front ? 0.3 : 0.14})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
    ctx.stroke();
    if (Math.sin(sat) >= 0 === front) {
      const sx = rx * Math.cos(sat);
      const sy = ry * Math.sin(sat);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 9);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.3, `rgba(${SKY},0.5)`);
      g.addColorStop(1, `rgba(${SKY},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, 9, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };
  drawRing(false);

  // Outer halo.
  let g = ctx.createRadialGradient(c, c, R * 0.98, c, c, R * 1.38);
  g.addColorStop(0, `rgba(${SKY},0.30)`);
  g.addColorStop(0.45, 'rgba(56,189,248,0.08)');
  g.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, R * 1.38, 0, TAU);
  ctx.fill();

  // Everything on the sphere is clipped to its disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.clip();

  g = ctx.createRadialGradient(c + L.x * R * 0.5, c - L.y * R * 0.5, R * 0.05, c, c, R);
  g.addColorStop(0, '#16406e');
  g.addColorStop(0.6, '#0a1d38');
  g.addColorStop(1, '#040a16');
  ctx.fillStyle = g;
  ctx.fillRect(c - R, c - R, R * 2, R * 2);

  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${SKY},0.12)`;
  strokeLines(ctx, GRATICULE, cam, c, R);

  // Coastlines: a soft wide pass under a crisp thin one.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(${SKY},0.10)`;
  ctx.lineWidth = 4;
  strokeLines(ctx, COAST, cam, c, R);
  ctx.strokeStyle = `rgba(${SKY},0.55)`;
  ctx.lineWidth = 1;
  strokeLines(ctx, COAST, cam, c, R);

  // Land dots, fading toward the limb.
  ctx.fillStyle = '#bae6fd';
  for (const d of LAND_DOTS) {
    projectTrig(d.sinLat, d.cosLat, d.lon, cam, pt);
    if (pt.depth <= 0.03) continue;
    ctx.globalAlpha = 0.16 + 0.72 * Math.pow(pt.depth, 0.75);
    ctx.fillRect(c + R * pt.x - 0.9, c - R * pt.y - 0.9, 1.8, 1.8);
  }
  ctx.globalAlpha = 1;

  // Lighting: lit side toward the light, a soft terminator on the far side.
  const lg = ctx.createLinearGradient(c + L.x * R, c - L.y * R, c - L.x * R, c + L.y * R);
  lg.addColorStop(0, 'rgba(186,230,253,0.14)');
  lg.addColorStop(0.5, 'rgba(0,0,0,0)');
  lg.addColorStop(1, 'rgba(2,6,16,0.55)');
  ctx.fillStyle = lg;
  ctx.fillRect(c - R, c - R, R * 2, R * 2);

  // Atmosphere rim (Fresnel-style brightening at the edge).
  g = ctx.createRadialGradient(c, c, R * 0.74, c, c, R);
  g.addColorStop(0, 'rgba(56,189,248,0)');
  g.addColorStop(1, 'rgba(56,189,248,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(c - R, c - R, R * 2, R * 2);

  // Cursor spotlight.
  if (f.spot) {
    const sx = c + f.spot.x * R;
    const sy = c - f.spot.y * R;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.6);
    sg.addColorStop(0, 'rgba(186,230,253,0.30)');
    sg.addColorStop(1, 'rgba(186,230,253,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = sg;
    ctx.fillRect(c - R, c - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // Rim line, then the front half of the orbit ring.
  ctx.strokeStyle = `rgba(${SKY},0.45)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.stroke();
  drawRing(true);

  // Leak arc for the active scenario: red while the leak is live, green once it is blocked.
  const blocked = f.elapsed >= PROTECT_MS;
  const arc = ARCS[f.active];
  const path: { x: number; y: number }[] = [];
  ctx.beginPath();
  let pen = false;
  for (const p of arc) {
    projectVec(p.v, p.r, cam, pt);
    if (!isVisible(pt)) {
      pen = false;
      continue;
    }
    const X = c + R * pt.x;
    const Y = c - R * pt.y;
    path.push({ x: X, y: Y });
    if (pen) ctx.lineTo(X, Y);
    else ctx.moveTo(X, Y);
    pen = true;
  }
  const tone = blocked ? EMERALD : ROSE;
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(${tone},${blocked ? 0.1 : 0.18})`;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = `rgba(${tone},${blocked ? 0.45 : 0.9})`;
  ctx.lineWidth = 1.4;
  ctx.setLineDash(blocked ? [2, 6] : [6, 5]);
  ctx.lineDashOffset = animate ? -t / 45 : 0;
  ctx.stroke();
  ctx.setLineDash([]);

  // Data packets travelling along the live leak.
  if (!blocked) {
    for (const k of [0, 0.5]) {
      const u = animate ? (t / 1700 + k) % 1 : 0.35 + k * 0.3;
      const p = arc[Math.round(u * (arc.length - 1))];
      projectVec(p.v, p.r, cam, pt);
      if (!isVisible(pt)) continue;
      const X = c + R * pt.x;
      const Y = c - R * pt.y;
      const pg = ctx.createRadialGradient(X, Y, 0, X, Y, 9);
      pg.addColorStop(0, 'rgba(255,241,242,1)');
      pg.addColorStop(0.35, `rgba(${ROSE},0.7)`);
      pg.addColorStop(1, `rgba(${ROSE},0)`);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(X, Y, 9, 0, TAU);
      ctx.fill();
    }
  }

  // Pins.
  const pins: ScreenPin[] = [];
  SCENARIOS.forEach((s, si) => {
    const on = si === f.active;
    s.cities.forEach((city, ci) => {
      const v = latLonToVec(city.lat, city.lon);
      projectVec(v, 1, cam, pt);
      const X = c + R * pt.x;
      const Y = c - R * pt.y;
      const idx = pins.length;
      pins.push({ x: X, y: Y, depth: pt.depth, scenario: si, city: city.city, region: s.region });
      if (pt.depth <= 0.05) return;

      const fade = Math.min(1, pt.depth * 3);
      const hovered = idx === f.hover;
      const col = on && blocked ? EMERALD : ROSE;
      const phase = animate ? (t / 1600 + ci * 0.37) % 1 : 0.3;
      for (const k of [0, 0.5]) {
        const ph = (phase + k) % 1;
        ctx.globalAlpha = fade * (1 - ph) * (on ? 0.8 : 0.28);
        ctx.strokeStyle = `rgb(${col})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(X, Y, (on ? 5 : 3) + ph * (on ? 26 : 12), 0, TAU);
        ctx.stroke();
      }
      // One-off green burst the moment the leak is blocked.
      const burst = f.elapsed - PROTECT_MS;
      if (on && animate && burst >= 0 && burst < 800) {
        const b = burst / 800;
        ctx.globalAlpha = fade * (1 - b);
        ctx.strokeStyle = `rgb(${EMERALD})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(X, Y, 6 + b * 40, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = fade * (on || hovered ? 1 : 0.6);
      ctx.fillStyle = `rgb(${col})`;
      ctx.beginPath();
      ctx.arc(X, Y, hovered ? 5.5 : on ? 4.2 : 2.8, 0, TAU);
      ctx.fill();
      if (on || hovered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = hovered ? 1.8 : 1.2;
        ctx.stroke();
      }
      if (on && pt.depth > 0.25) {
        ctx.globalAlpha = fade;
        ctx.font = FONT_LABEL;
        ctx.fillStyle = blocked ? '#d1fae5' : '#ffe4e6';
        const o = LABEL_OFFSET[city.label];
        ctx.textAlign = o.align;
        ctx.fillText(city.city, X + o.dx, Y + o.dy);
        ctx.textAlign = 'left';
      }
    });
  });
  ctx.globalAlpha = 1;

  const h = pins[f.hover];
  if (h && h.depth > 0.05 && !f.dragging) {
    tooltip(ctx, size, h.x, h.y, `${h.city} · ${h.region}`, h.scenario === f.active ? 'Showing this scenario' : 'Click to view this scenario');
  }
  return pins;
}
