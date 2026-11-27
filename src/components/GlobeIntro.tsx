import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, FileWarning, Rocket, ShieldCheck, TriangleAlert } from 'lucide-react';
import { prefersReducedMotion } from '../hooks/motion';
import { clampLat, nearestPin, shortestAngle } from '../utils/globe';
import { SCENARIOS, cameraFor } from '../data/globeScenarios';
import { GLOBE_R, drawGlobe, type ScreenPin } from './globeRenderer';

const INTRO_STORAGE_KEY = 'pii-intro-dismissed';

/** Remembered across visits (localStorage); the header's Replay Intro button always brings it back. */
export function introAlreadySeen(): boolean {
  try {
    return localStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch {
    /* storage blocked: the intro will just show again next visit */
  }
}

const AUTO_MS = 5600;
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

interface GlobeProps {
  active: number;
  onSelect: (scenario: number) => void;
  onDragChange: (dragging: boolean) => void;
}

function Globe({ active, onSelect, onDragChange }: GlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const sceneStart = useRef(performance.now());
  const dirty = useRef(true);
  const sizeRef = useRef(0);
  const pinsRef = useRef<ScreenPin[]>([]);
  const it = useRef<Interaction>({
    px: null, py: null, down: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0, lastT: 0,
    offLon: 0, offLat: 0, velLon: 0, velLat: 0, hover: -1,
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
    <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[min(66vw,300px)] sm:max-w-[min(74vh,420px)] lg:max-w-[min(74vh,560px)]">
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

const STEPS = [
  { Icon: FileWarning, title: 'Raw Document', sample: '4111 1111 1111 1111', tone: 'text-[#fda4af]' },
  { Icon: ShieldCheck, title: 'In-Browser Scrubbing', sample: 'Luhn ✓ → masked', tone: 'text-[#6ee7b7]' },
  { Icon: CheckCircle2, title: 'Safe to Share', sample: 'XXXX-XXXX-XXXX-1111', tone: 'text-[#7dd3fc]' },
];

export default function GlobeIntro({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(() => !prefersReducedMotion());
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, prefersReducedMotion() ? 0 : 450);
  }, [onClose]);

  // Esc closes; Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (!items.length) return;
        const first = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Focus the primary action, and hand focus back to whatever opened the intro when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    launchRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Auto-advance stops for good once the user picks something, and waits while they drag.
  useEffect(() => {
    if (!auto || dragging) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % SCENARIOS.length), AUTO_MS);
    return () => window.clearInterval(id);
  }, [auto, dragging]);

  const select = useCallback((i: number) => {
    setAuto(false);
    setActive(i);
  }, []);

  const scenario = SCENARIOS[active];
  const ink = 'text-[#e2e8f0]';
  const muted = 'text-[#94a3b8]';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#050b18] ${ink} ${leaving ? 'animate-intro-out' : 'animate-fade-in'}`}
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 75% 40%, rgba(14,116,144,0.28), transparent 70%), radial-gradient(45% 40% at 10% 90%, rgba(16,185,129,0.14), transparent 70%), radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 28px 28px',
      }}
    >
      <button
        type="button"
        onClick={close}
        className="press fixed right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#94a3b8] hover:bg-white/10 hover:text-[#f8fafc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]"
      >
        Skip to Sanitizer <ArrowRight className="h-4 w-4" aria-hidden />
        <kbd className="hidden rounded border border-[#334155] px-1.5 text-[10px] font-medium text-[#94a3b8] sm:inline">Esc</kbd>
      </button>

      {/* Phones: globe first (so the main visual is above the fold), then the pitch, then the scenario card.
          Desktop: pitch on the left, globe over scenario card on the right. */}
      <div className="mx-auto grid min-h-full max-w-7xl items-center gap-x-10 gap-y-6 px-5 pb-10 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-y-3 lg:py-10">
        {/* Value proposition */}
        <div className="order-2 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-[#065f46] bg-[#022c22]/70 px-3 py-1 text-xs font-medium text-[#6ee7b7]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> 100% Client-Side • Zero Server Transmission
          </span>
          <h2
            id="intro-title"
            className="animate-fade-up mt-4 text-4xl font-bold leading-tight tracking-tight text-[#f8fafc] sm:text-5xl"
            style={{ animationDelay: '80ms' }}
          >
            Leaks happen at the paste.{' '}
            <span className="bg-linear-to-r from-[#34d399] to-[#38bdf8] bg-clip-text text-transparent">
              Sanitize before you share.
            </span>
          </h2>
          <p className={`animate-fade-up mt-4 max-w-xl text-base leading-relaxed ${muted}`} style={{ animationDelay: '160ms' }}>
            Tickets, logs and spreadsheets get pasted into AI tools and vendor portals every day. PII Sanitizer scrubs
            them in your browser first, so the raw data never leaves your machine.
          </p>

          <div className="animate-fade-up mt-6 flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
            <button
              ref={launchRef}
              type="button"
              onClick={close}
              className="press inline-flex items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 text-base font-semibold text-[#022c22] shadow-lg shadow-[#10b981]/25 hover:bg-[#34d399] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a7f3d0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050b18]"
            >
              <Rocket className="h-5 w-5" aria-hidden /> Launch Sanitizer
            </button>
            <span className={`text-xs ${muted}`}>No sign-up. No uploads. Nothing stored.</span>
          </div>

          <ol className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch" aria-label="How it works">
            {STEPS.flatMap(({ Icon, title, sample, tone }, i) => {
              const card = (
                <li
                  key={title}
                  style={{ animationDelay: `${i * 1500}ms` }}
                  className="animate-step-glow rounded-xl border border-white/10 bg-[#0b1426]/80 p-3"
                >
                  <Icon className={`h-5 w-5 ${tone}`} aria-hidden />
                  <p className="mt-2 text-sm font-semibold text-[#f1f5f9]">{title}</p>
                  <p className={`mt-1 font-mono text-[11px] ${tone}`}>{sample}</p>
                </li>
              );
              return i < STEPS.length - 1
                ? [
                    card,
                    <li key={`arrow-${i}`} aria-hidden className="hidden items-center text-[#475569] sm:flex">
                      <ArrowRight className="h-4 w-4" />
                    </li>,
                  ]
                : [card];
            })}
          </ol>
        </div>

        {/* Globe + region tabs */}
        <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:self-end">
          <Globe active={active} onSelect={select} onDragChange={setDragging} />

          <div role="tablist" aria-label="Leak scenarios" className="mt-2 flex flex-wrap justify-center gap-2">
            {SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => select(i)}
                className={`press rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399] ${
                  i === active
                    ? 'border-[#fb7185] bg-[#4c0519]/70 text-[#ffe4e6]'
                    : 'border-[#334155] text-[#94a3b8] hover:border-[#64748b]'
                }`}
              >
                {s.region}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario card */}
        <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-2 lg:self-start">
          <div key={active} role="tabpanel" className="animate-fade-up relative mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b1426]/85 p-4 backdrop-blur">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#fda4af]">
              <TriangleAlert className="h-3.5 w-3.5 animate-pulse" aria-hidden />
              Leak risk · {scenario.cities.map((c) => c.city).join(' / ')}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#e2e8f0]">{scenario.leak}</p>
            <p className="animate-fade-up mt-3 flex items-start gap-2 text-sm font-semibold text-[#6ee7b7]" style={{ animationDelay: '1100ms' }}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {scenario.outcome}
            </p>
            {auto && !dragging && <span aria-hidden className="animate-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#34d399]/70" />}
          </div>
          <p className={`mt-2 text-center text-[11px] ${muted}`}>Illustrative scenarios. No real incidents or data are shown.</p>
        </div>
      </div>
    </div>
  );
}
