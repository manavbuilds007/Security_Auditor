import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, FileWarning, Rocket, ShieldCheck, TriangleAlert } from 'lucide-react';
import { prefersReducedMotion } from '../hooks/motion';
import { buildLandDots, makeCamera, project, projectTrig, shortestAngle, type Pt } from '../utils/globe';
import { SCENARIOS, cameraFor } from '../data/globeScenarios';

export const INTRO_STORAGE_KEY = 'pii-intro-dismissed';

const TAU = Math.PI * 2;
const AUTO_MS = 5600;
const LAND_DOTS = buildLandDots();
const CAMERAS = SCENARIOS.map(cameraFor);

interface View {
  lat: number;
  lon: number;
}

/** Draws the whole globe with 2D-canvas orthographic projection. No textures, no network. */
function drawGlobe(ctx: CanvasRenderingContext2D, size: number, view: View, t: number, active: number, animate: boolean) {
  const R = size * 0.4;
  const c = size / 2;
  const cam = makeCamera(view.lat, view.lon);
  const pt: Pt = { x: 0, y: 0, depth: 0 };
  ctx.clearRect(0, 0, size, size);
  ctx.globalAlpha = 1;

  // Atmosphere glow, then the sphere.
  let g = ctx.createRadialGradient(c, c, R * 0.95, c, c, R * 1.3);
  g.addColorStop(0, 'rgba(56,189,248,0.28)');
  g.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, R * 1.3, 0, TAU);
  ctx.fill();

  g = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
  g.addColorStop(0, '#12345c');
  g.addColorStop(1, '#050b18');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(125,211,252,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Graticule: one path for all lines, breaking wherever a line passes behind the globe.
  ctx.strokeStyle = 'rgba(125,211,252,0.13)';
  ctx.beginPath();
  const line = (at: (i: number) => [number, number], n: number) => {
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const [lat, lon] = at(i);
      const p = project(lat, lon, view.lat, view.lon);
      if (p.depth <= 0) {
        pen = false;
        continue;
      }
      const X = c + R * p.x;
      const Y = c - R * p.y;
      if (pen) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
      pen = true;
    }
  };
  for (const lat of [-60, -30, 0, 30, 60]) line((i) => [lat, -180 + i * 5], 72);
  for (let lon = -180; lon < 180; lon += 30) line((i) => [-90 + i * 5, lon], 36);
  ctx.stroke();

  // Land as dots, fading toward the limb.
  ctx.fillStyle = '#7dd3fc';
  for (const d of LAND_DOTS) {
    projectTrig(d.sinLat, d.cosLat, d.lon, cam, pt);
    if (pt.depth <= 0.03) continue;
    ctx.globalAlpha = 0.18 + 0.82 * Math.pow(pt.depth, 0.7);
    ctx.fillRect(c + R * pt.x - 0.9, c - R * pt.y - 0.9, 1.8, 1.8);
  }

  // Alert pins: pulsing rings on every hotspot, bright + labelled for the active scenario.
  SCENARIOS.forEach((s, si) => {
    const on = si === active;
    s.cities.forEach((city, ci) => {
      const p = project(city.lat, city.lon, view.lat, view.lon);
      if (p.depth <= 0.05) return;
      const X = c + R * p.x;
      const Y = c - R * p.y;
      const fade = Math.min(1, p.depth * 3);
      const phase = animate ? (t / 1600 + ci * 0.37) % 1 : 0.3;
      for (const k of [0, 0.5]) {
        const ph = (phase + k) % 1;
        ctx.globalAlpha = fade * (1 - ph) * (on ? 0.75 : 0.25);
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(X, Y, (on ? 5 : 3) + ph * (on ? 26 : 12), 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = fade * (on ? 1 : 0.55);
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(X, Y, on ? 4.2 : 2.6, 0, TAU);
      ctx.fill();
      if (on) {
        ctx.strokeStyle = '#fff1f2';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        if (p.depth > 0.25) {
          ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
          ctx.fillStyle = '#ffe4e6';
          ctx.fillText(city.city, X + 9, Y - 9);
        }
      }
    });
  });
  ctx.globalAlpha = 1;
}

function Globe({ active }: { active: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const dirty = useRef(true);

  useEffect(() => {
    activeRef.current = active;
    dirty.current = true;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !wrap || !ctx) return;

    const reduced = prefersReducedMotion();
    const view: View = { ...CAMERAS[activeRef.current] };
    let size = 0;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const w = Math.floor(wrap.getBoundingClientRect().width);
      if (w < 80) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = w;
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
      if (!size) return;
      const target = CAMERAS[activeRef.current];
      if (reduced) {
        // Static globe: snap to the region and only redraw when something changed.
        if (!dirty.current) return;
        view.lat = target.lat;
        view.lon = target.lon;
        dirty.current = false;
        drawGlobe(ctx, size, view, 0, activeRef.current, false);
        return;
      }
      // Ease toward the active region (sweeping the long way round if needed), plus a slow sway.
      const k = 1 - Math.exp(-dt / 380);
      view.lon += shortestAngle(view.lon, target.lon) * k;
      view.lat += (target.lat - view.lat) * k;
      const sway = { lat: view.lat + 3 * Math.sin(now / 4200), lon: view.lon + 7 * Math.sin(now / 3100) };
      drawGlobe(ctx, size, sway, now, activeRef.current, true);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[min(74vh,520px)]">
      <canvas ref={canvasRef} className="absolute inset-0 m-auto" role="img" aria-label="Rotating wireframe globe with pulsing alert pins in India, North America and Europe" />
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

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % SCENARIOS.length), AUTO_MS);
    return () => window.clearInterval(id);
  }, [auto]);

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
        className="press fixed right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[#475569] bg-[#0f172a]/80 px-4 py-2 text-sm font-semibold text-[#f8fafc] backdrop-blur hover:border-[#34d399] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]"
      >
        Skip to Sanitizer <ArrowRight className="h-4 w-4" aria-hidden />
        <kbd className="hidden rounded border border-[#475569] px-1.5 text-[10px] font-medium text-[#94a3b8] sm:inline">Esc</kbd>
      </button>

      <div className="mx-auto grid min-h-full max-w-7xl items-center gap-8 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-10">
        {/* Value proposition */}
        <div>
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

        {/* Globe + scenario */}
        <div>
          <Globe active={active} />

          <div role="tablist" aria-label="Leak scenarios" className="mt-2 flex flex-wrap justify-center gap-2">
            {SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => {
                  setAuto(false);
                  setActive(i);
                }}
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
            {auto && <span aria-hidden className="animate-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#34d399]/70" />}
          </div>
          <p className={`mt-2 text-center text-[11px] ${muted}`}>Illustrative scenarios. No real incidents or data are shown.</p>
        </div>
      </div>
    </div>
  );
}
