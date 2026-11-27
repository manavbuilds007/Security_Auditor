import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/motion';
import { clampLat, nearestPin, shortestAngle } from '../utils/globe';
import { SCENARIOS, cameraFor } from '../data/globeScenarios';
import { GLOBE_R, drawGlobe, type ScreenPin } from './globeRenderer';

const CAMERAS = SCENARIOS.map(cameraFor);
const DEFAULT_LIGHT = { x: -0.45, y: 0.5 };
const HIT_RADIUS = 16;

/** Cursor state shared between React event handlers and the animation loop. */
interface Interaction {
  /** Pointer in canvas CSS pixels; null when it is away from the globe. */
  px: number | null;
  py: number | null;
  down: boolean;
  moved: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastT: number;
  /** User rotation on top of the scenario camera, in degrees. It eases back to zero after release. */
  offLon: number;
  offLat: number;
  velLon: number;
  velLat: number;
  hover: number;
}

interface InteractiveGlobeProps {
  active: number;
  onSelect: (scenario: number) => void;
  onDragChange: (dragging: boolean) => void;
}

export default function InteractiveGlobe({ active, onSelect, onDragChange }: InteractiveGlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const sceneStart = useRef(0);
  const dirty = useRef(true);
  const sizeRef = useRef(0);
  const pinsRef = useRef<ScreenPin[]>([]);
  const it = useRef<Interaction>({
    px: null,
    py: null,
    down: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    offLon: 0,
    offLat: 0,
    velLon: 0,
    velLat: 0,
    hover: -1,
  });

  useEffect(() => {
    activeRef.current = active;
    sceneStart.current = performance.now();
    dirty.current = true;
  }, [active]);

  const local = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = local(e);
    const s = it.current;
    s.down = true;
    s.moved = false;
    s.startX = s.lastX = x;
    s.startY = s.lastY = y;
    s.lastT = performance.now();
    s.velLon = s.velLat = 0;
    s.px = x;
    s.py = y;
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragChange(true);
    dirty.current = true;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = local(e);
    const s = it.current;
    s.px = e.pointerType === 'touch' && !s.down ? null : x;
    s.py = e.pointerType === 'touch' && !s.down ? null : y;
    dirty.current = true;
    if (!s.down) return;
    if (Math.hypot(x - s.startX, y - s.startY) > 5) s.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - s.lastT);
    // One pixel is 1/R of a radian near the centre of an orthographic globe.
    const k = 57.2958 / (sizeRef.current * GLOBE_R);
    const dLon = -(x - s.lastX) * k;
    const dLat = (y - s.lastY) * k;
    s.offLon += dLon;
    s.offLat = clampLat(s.offLat + dLat, -60, 60);
    s.velLon = 0.7 * s.velLon + 0.3 * (dLon / dt);
    s.velLat = 0.7 * s.velLat + 0.3 * (dLat / dt);
    s.lastX = x;
    s.lastY = y;
    s.lastT = now;
  };

  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = it.current;
    if (!s.down) return;
    s.down = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    // A release that was not a drag, on a pin, selects that pin's scenario.
    if (e.type === 'pointerup' && !s.moved && s.hover >= 0) {
      const pin = pinsRef.current[s.hover];
      if (pin) onSelect(pin.scenario);
    }
    // A pause before release means no fling.
    if (performance.now() - s.lastT > 90) s.velLon = s.velLat = 0;
    if (e.pointerType === 'touch') {
      s.px = s.py = null;
    }
    onDragChange(false);
    dirty.current = true;
  };

  const onPointerLeave = () => {
    if (it.current.down) return;
    it.current.px = it.current.py = null;
    dirty.current = true;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !wrap || !ctx) return;

    const reduced = prefersReducedMotion();
    const st = it.current;
    const view = { ...CAMERAS[activeRef.current] };
    const tilt = { lon: 0, lat: 0 };
    const light = { ...DEFAULT_LIGHT };
    let lastActive = activeRef.current;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const w = Math.floor(wrap.getBoundingClientRect().width);
      if (w < 80) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = w;
      canvas.width = w * dpr;
      canvas.height = w * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${w}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty.current = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(now - last, 100);
      last = now;
      const size = sizeRef.current;
      if (!size) return;
      const R = size * GLOBE_R;
      const target = CAMERAS[activeRef.current];
      const inside = st.px !== null && st.py !== null;
      const nx = inside ? (st.px! - size / 2) / R : 0;
      const ny = inside ? (size / 2 - st.py!) / R : 0;
      const onDisc = inside && Math.hypot(nx, ny) <= 1.15;

      if (reduced) {
        // Static unless the user acts: snap to the scenario, follow the cursor directly, no inertia.
        if (lastActive !== activeRef.current) {
          st.offLon = st.offLat = 0;
          lastActive = activeRef.current;
        }
        if (!dirty.current) return;
        dirty.current = false;
        view.lat = target.lat;
        view.lon = target.lon;
        light.x = onDisc ? nx : DEFAULT_LIGHT.x;
        light.y = onDisc ? ny : DEFAULT_LIGHT.y;
      } else {
        const k = 1 - Math.exp(-dt / 380);
        view.lon += shortestAngle(view.lon, target.lon) * k;
        view.lat += (target.lat - view.lat) * k;

        if (!st.down) {
          // Fling, then drift back to the scenario's framing.
          st.offLon += st.velLon * dt;
          st.offLat = clampLat(st.offLat + st.velLat * dt, -60, 60);
          const damp = Math.exp(-dt / 450);
          st.velLon *= damp;
          st.velLat *= damp;
          const back = Math.exp(-dt / 2400);
          st.offLon *= back;
          st.offLat *= back;
        }
        // Lean toward the cursor and light the globe from it.
        const tk = 1 - Math.exp(-dt / 220);
        const wantLon = onDisc && !st.down ? nx * 6 : 0;
        const wantLat = onDisc && !st.down ? ny * 5 : 0;
        tilt.lon += (wantLon - tilt.lon) * tk;
        tilt.lat += (wantLat - tilt.lat) * tk;
        const lk = 1 - Math.exp(-dt / 140);
        light.x += ((onDisc ? nx : DEFAULT_LIGHT.x) - light.x) * lk;
        light.y += ((onDisc ? ny : DEFAULT_LIGHT.y) - light.y) * lk;
      }

      const sway = reduced ? { lat: 0, lon: 0 } : { lat: 3 * Math.sin(now / 4200), lon: 7 * Math.sin(now / 3100) };
      const frameView = {
        lat: clampLat(view.lat + st.offLat + tilt.lat + sway.lat),
        lon: view.lon + st.offLon + tilt.lon + sway.lon,
      };

      // Which pin is under the cursor (using last frame's positions).
      let hover = -1;
      if (inside && !st.down) {
        const hit = nearestPin(
          pinsRef.current.filter((p) => p.depth > 0.05),
          st.px!,
          st.py!,
          HIT_RADIUS,
        );
        hover = hit ? pinsRef.current.indexOf(hit) : -1;
      } else if (st.down) {
        hover = st.hover; // keep so a click (no drag) still resolves to the pin it started on
      }
      st.hover = hover;
      canvas.style.cursor = st.down && st.moved ? 'grabbing' : hover >= 0 ? 'pointer' : 'grab';

      pinsRef.current = drawGlobe(ctx, {
        size,
        view: frameView,
        t: now,
        animate: !reduced,
        active: activeRef.current,
        elapsed: reduced ? Infinity : now - sceneStart.current,
        spot: onDisc ? { x: nx, y: ny } : null,
        light: { x: light.x, y: light.y },
        parallax: { x: (tilt.lon + st.offLon * 0.1) / 6, y: -tilt.lat / 5 },
        hover: st.hover,
        dragging: st.down && st.moved,
      });
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto aspect-square w-full max-w-[min(66vw,300px)] sm:max-w-[min(74vh,420px)] lg:max-w-[min(74vh,560px)]"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Interactive wireframe globe with pulsing alert pins in India, North America and Europe. Drag to rotate; select a region with the tabs below."
        className="absolute inset-0 m-auto cursor-grab select-none"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onPointerLeave}
      />
    </div>
  );
}
