import { describe, expect, it } from 'vitest';
import { PROTECT_MS, drawGlobe, type Frame } from './globeRenderer';
import { SCENARIOS } from '../data/globeScenarios';

/**
 * A recording stand-in for CanvasRenderingContext2D. Real canvases throw (or silently drop the call)
 * when handed NaN/Infinity, so any non-finite number reaching a drawing call is a bug.
 */
function fakeContext() {
  const calls: { name: string; args: unknown[] }[] = [];
  const gradient = { addColorStop: (...a: unknown[]) => calls.push({ name: 'addColorStop', args: a }) };
  const ctx = new Proxy(
    {},
    {
      get(_t, name: string) {
        if (name === 'measureText') return () => ({ width: 60 });
        return (...args: unknown[]) => {
          calls.push({ name, args });
          return /^create.*Gradient$/.test(name) ? gradient : undefined;
        };
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const base: Frame = {
  size: 520,
  view: { lat: 20, lon: 78 },
  t: 12345,
  animate: true,
  active: 0,
  elapsed: 300,
  spot: null,
  light: { x: -0.45, y: 0.5 },
  parallax: { x: 0, y: 0 },
  hover: -1,
  dragging: false,
};

function nonFinite(calls: { name: string; args: unknown[] }[]) {
  return calls.filter((c) => c.args.some((a) => typeof a === 'number' && !Number.isFinite(a)));
}

describe('globe renderer', () => {
  it('only ever passes finite numbers to the canvas, across scenarios, states and camera angles', () => {
    for (let active = 0; active < SCENARIOS.length; active++) {
      for (const elapsed of [0, 500, PROTECT_MS - 1, PROTECT_MS + 200, 5000, Infinity]) {
        for (const view of [{ lat: 20, lon: 78 }, { lat: 80, lon: -180 }, { lat: -60, lon: 179.9 }, { lat: 0, lon: 0 }]) {
          for (const extra of [
            {},
            { spot: { x: 0.3, y: -0.2 }, light: { x: 0.3, y: -0.2 }, hover: 1 },
            { spot: { x: 1.1, y: 0.9 }, light: { x: 3, y: 4 }, dragging: true, hover: 0 },
            { animate: false },
          ]) {
            const { ctx, calls } = fakeContext();
            drawGlobe(ctx, { ...base, active, elapsed, view, ...extra });
            expect(nonFinite(calls).map((c) => c.name)).toEqual([]);
            expect(calls.length).toBeGreaterThan(100);
          }
        }
      }
    }
  });

  it('returns one screen pin per hotspot, in scenario order, with positions inside the canvas', () => {
    const { ctx } = fakeContext();
    const pins = drawGlobe(ctx, base);
    expect(pins.map((p) => p.city)).toEqual(SCENARIOS.flatMap((s) => s.cities.map((c) => c.city)));
    expect(pins.map((p) => p.scenario)).toEqual([0, 0, 1, 1, 2, 2]);
    // Camera is on India: its pins face the viewer, North America's are on the far side.
    expect(pins[0].depth).toBeGreaterThan(0.5);
    expect(pins[2].depth).toBeLessThan(0);
    for (const p of pins.slice(0, 2)) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(base.size);
    }
  });

  it('draws the leak in red before PROTECT_MS and in green after, and shows a tooltip only for hovered visible pins', () => {
    const colours = (elapsed: number, hover = -1) => {
      const { ctx, calls } = fakeContext();
      // Record strokeStyle assignments by wrapping the proxy's setter.
      const seen: string[] = [];
      const wrapped = new Proxy(ctx, {
        set(_t, k, v) {
          if (k === 'strokeStyle' && typeof v === 'string') seen.push(v);
          return true;
        },
        get: (t, k) => (t as never)[k],
      });
      drawGlobe(wrapped, { ...base, elapsed, hover });
      return { seen, texts: calls.filter((c) => c.name === 'fillText').map((c) => c.args[0]) };
    };
    const live = colours(200);
    const blocked = colours(PROTECT_MS + 50);
    expect(live.seen.some((s) => s.includes('251,113,133'))).toBe(true);
    expect(blocked.seen.some((s) => s.includes('52,211,153'))).toBe(true);
    expect(colours(200, 0).texts.some((t) => String(t).includes('Bengaluru · India'))).toBe(true);
    // Pin 2 (San Francisco) is on the far side of the globe: no tooltip.
    expect(colours(200, 2).texts.some((t) => String(t).includes('San Francisco · North America'))).toBe(false);
  });
});
