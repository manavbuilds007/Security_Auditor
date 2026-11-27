import { describe, expect, it } from 'vitest';
import {
  buildCoastlines,
  buildGraticule,
  buildLandDots,
  clampLat,
  isLand,
  isVisible,
  LAND,
  latLonToVec,
  makeCamera,
  nearestPin,
  pointerToLight,
  project,
  projectVec,
  shortestAngle,
  slerp,
} from './globe';
import { SCENARIOS, cameraFor } from '../data/globeScenarios';

describe('orthographic projection', () => {
  it('puts the view centre at the origin, facing the viewer', () => {
    const p = project(20, 78, 20, 78);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
    expect(p.depth).toBeCloseTo(1);
  });

  it('puts the equator 90° east of the centre on the right edge of the disc', () => {
    const p = project(0, 90, 0, 0);
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(0);
    expect(p.depth).toBeCloseTo(0);
  });

  it('hides the far hemisphere and keeps points inside the unit disc', () => {
    expect(project(0, 180, 0, 0).depth).toBeLessThan(0);
    for (const [lat, lon] of [
      [10, 20],
      [-40, 130],
      [60, -100],
      [85, 0],
    ]) {
      const p = project(lat, lon, 15, 40);
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('tilting north moves a northern point toward the centre', () => {
    expect(Math.abs(project(60, 0, 60, 0).y)).toBeLessThan(Math.abs(project(60, 0, 0, 0).y));
  });
});

describe('shortestAngle', () => {
  it('takes the short way round', () => {
    expect(shortestAngle(170, -170)).toBe(20);
    expect(shortestAngle(-170, 170)).toBe(-20);
    expect(shortestAngle(10, 40)).toBe(30);
    expect(shortestAngle(0, 180)).toBe(180);
  });
});

describe('land mask', () => {
  it('has land where expected and ocean where expected', () => {
    for (const [lat, lon] of [
      [40, -100],
      [20, 78],
      [23, 10],
      [48, 10],
      [-25, 135],
      [-10, -55],
    ]) {
      expect(isLand(lat, lon), `${lat},${lon}`).toBe(true);
    }
    for (const [lat, lon] of [
      [0, -150],
      [0, -30],
      [-30, 80],
      [10, 170],
    ]) {
      expect(isLand(lat, lon), `${lat},${lon}`).toBe(false);
    }
  });

  it('builds a sensible number of dots', () => {
    const n = buildLandDots().length;
    expect(n).toBeGreaterThan(500);
    expect(n).toBeLessThan(3000);
  });
});

describe('scenarios', () => {
  it('covers India, North America and Europe with two hotspots each, all on land', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['india', 'north-america', 'europe']);
    for (const s of SCENARIOS) {
      expect(s.cities).toHaveLength(2);
      for (const c of s.cities) expect(isLand(c.lat, c.lon), c.city).toBe(true);
    }
  });

  it('points the camera at every hotspot of its region', () => {
    for (const s of SCENARIOS) {
      const cam = cameraFor(s);
      for (const c of s.cities) expect(project(c.lat, c.lon, cam.lat, cam.lon).depth).toBeGreaterThan(0.5);
    }
  });
});

describe('vector projection (arcs above the surface)', () => {
  it('agrees with the lat/lon projection at the surface', () => {
    for (const [lat, lon, cLat, cLon] of [
      [13, 77.6, 16, 78],
      [40.7, -74, 38, -98],
      [51.5, -0.1, 30, 5],
      [-33, 151, 10, 120],
    ]) {
      const a = project(lat, lon, cLat, cLon);
      const b = projectVec(latLonToVec(lat, lon), 1, makeCamera(cLat, cLon), { x: 0, y: 0, depth: 0 });
      expect(b.x).toBeCloseTo(a.x, 9);
      expect(b.y).toBeCloseTo(a.y, 9);
      expect(b.depth).toBeCloseTo(a.depth, 9);
    }
  });

  it('scales with altitude, and raised points past the limb stay visible', () => {
    const cam = makeCamera(0, 0);
    const near = projectVec(latLonToVec(0, 89), 1, cam, { x: 0, y: 0, depth: 0 });
    const raised = projectVec(latLonToVec(0, 100), 1.3, cam, { x: 0, y: 0, depth: 0 });
    expect(near.depth).toBeGreaterThan(0);
    expect(raised.depth).toBeLessThan(0);
    expect(isVisible(raised)).toBe(true); // x ≈ 1.28 > 1: outside the disc
    expect(isVisible(projectVec(latLonToVec(0, 100), 1, cam, { x: 0, y: 0, depth: 0 }))).toBe(false);
  });
});

describe('great-circle interpolation', () => {
  const a = latLonToVec(12.97, 77.59);
  const b = latLonToVec(19.08, 72.88);
  it('hits both endpoints and stays on the unit sphere', () => {
    const start = slerp(a, b, 0);
    const end = slerp(a, b, 1);
    expect(start.x).toBeCloseTo(a.x, 9);
    expect(end.z).toBeCloseTo(b.z, 9);
    for (const t of [0.1, 0.5, 0.9]) {
      const v = slerp(a, b, t);
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 9);
    }
  });
  it('handles identical points', () => {
    expect(slerp(a, a, 0.5).x).toBeCloseTo(a.x, 9);
  });
});

describe('cursor helpers', () => {
  it('turns pointer positions into unit light vectors, clamped inside the disc', () => {
    for (const [x, y] of [
      [0, 0],
      [0.4, -0.3],
      [3, 4],
      [-0.9, 0.2],
    ]) {
      const l = pointerToLight(x, y);
      expect(Math.hypot(l.x, l.y, l.z)).toBeCloseTo(1, 9);
      expect(l.z).toBeGreaterThanOrEqual(0);
    }
    expect(pointerToLight(0, 0).z).toBe(1);
  });

  it('finds the nearest pin within the hit radius only', () => {
    const pins = [
      { x: 10, y: 10, id: 'a' },
      { x: 40, y: 10, id: 'b' },
    ];
    expect(nearestPin(pins, 12, 11, 14)?.id).toBe('a');
    expect(nearestPin(pins, 36, 8, 14)?.id).toBe('b');
    expect(nearestPin(pins, 100, 100, 14)).toBeNull();
  });

  it('clamps latitude so dragging cannot flip the globe', () => {
    expect(clampLat(120)).toBe(80);
    expect(clampLat(-120)).toBe(-80);
    expect(clampLat(12)).toBe(12);
  });
});

describe('pre-computed geometry', () => {
  it('builds closed coastlines and a full graticule', () => {
    const coast = buildCoastlines();
    expect(coast).toHaveLength(LAND.length);
    for (const c of coast) {
      expect(c.length).toBeGreaterThan(4);
      expect(c[0]).toBe(c[c.length - 1]);
    }
    expect(buildGraticule()).toHaveLength(5 + 12);
  });
});
