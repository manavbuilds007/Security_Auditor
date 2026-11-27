import { describe, expect, it } from 'vitest';
import { buildLandDots, isLand, project, shortestAngle } from './globe';
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
    for (const [lat, lon] of [[10, 20], [-40, 130], [60, -100], [85, 0]]) {
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
    for (const [lat, lon] of [[40, -100], [20, 78], [23, 10], [48, 10], [-25, 135], [-10, -55]]) {
      expect(isLand(lat, lon), `${lat},${lon}`).toBe(true);
    }
    for (const [lat, lon] of [[0, -150], [0, -30], [-30, 80], [10, 170]]) {
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
