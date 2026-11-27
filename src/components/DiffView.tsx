import { useRef } from 'react';
import { ScanSearch, ShieldCheck } from 'lucide-react';
import { TYPE_LABELS, type Segment } from '../utils/piiEngine';
import { CATEGORY_STYLES } from './categoryStyles';
import EmptyState from './EmptyState';

interface Props {
  source: Segment[];
  output: Segment[];
  onSample: (kind: 'log' | 'csv') => void;
  /** Changes whenever the redaction settings change, replaying the highlight animation. */
  animKey: string;
  /** Print the type on each highlight in the Sanitized pane. */
  typeLabels: boolean;
}

interface SegmentsProps {
  segments: Segment[];
  side: 'source' | 'output';
  animKey: string;
  typeLabels: boolean;
}

function Segments({ segments, side, animKey, typeLabels }: SegmentsProps) {
  let n = 0;
  return (
    <>
      {segments.map((s, i) => {
        if (s.kind === 'text' || !s.type) return <span key={i}>{s.text}</span>;
        if (s.kind === 'rejected') {
          const why = s.reason === 'luhn' ? 'failed the Luhn check' : 'failed the Verhoeff check';
          return (
            <span
              key={i}
              title={`Left as is: looks like ${TYPE_LABELS[s.type].toLowerCase()} but ${why}, so it is probably not one`}
              className="rounded-sm bg-slate-200/70 underline decoration-slate-500 decoration-dotted underline-offset-4"
            >
              {s.text}
            </span>
          );
        }
        const style = CATEGORY_STYLES[s.type];
        const title =
          side === 'source'
            ? `${TYPE_LABELS[s.type]} → ${s.applied ? s.replacement : 'left unchanged (type turned off)'}`
            : `${TYPE_LABELS[s.type]} (redacted)`;
        const off = s.applied === false;
        // The label is a CSS ::after, so it is not selected or copied with the text.
        const label = side === 'output' && typeLabels && !off;
        return (
          <mark
            key={`${i}-${side === 'output' ? animKey : ''}`}
            title={title}
            data-label={label ? style.tag : undefined}
            style={{ animationDelay: `${Math.min(n++ * 30, 450)}ms` }}
            className={`animate-mark-in rounded-sm px-0.5 ${off ? 'bg-slate-200 text-slate-600 ring-1 ring-slate-400' : style.mark} ${
              label ? 'after:ml-1.5 after:align-middle after:text-[10px] after:font-bold after:tracking-wider after:opacity-70 after:content-[attr(data-label)]' : ''
            }`}
          >
            {s.text}
          </mark>
        );
      })}
    </>
  );
}

export default function DiffView({ source, output, onSample, animKey, typeLabels }: Props) {
  const left = useRef<HTMLPreElement>(null);
  const right = useRef<HTMLPreElement>(null);
  const syncing = useRef(false);
  const empty = source.length === 0;

  const sync = (from: React.RefObject<HTMLPreElement | null>, to: React.RefObject<HTMLPreElement | null>) => () => {
    if (syncing.current || !from.current || !to.current) return;
    syncing.current = true;
    to.current.scrollTop = from.current.scrollTop;
    to.current.scrollLeft = from.current.scrollLeft;
    requestAnimationFrame(() => (syncing.current = false));
  };

  // Panes grow with their content between a floor and a ceiling; the grid keeps the two the same height.
  const pane =
    'min-h-40 max-h-[32rem] flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-6';
  const card = 'flex min-w-0 flex-col rounded-lg border border-slate-200 bg-slate-50';
  const title = 'border-b border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-800';
  const sub = 'font-normal text-slate-600';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={card} aria-label="Source">
        <h3 className={title}>
          Source <span className={sub}>· detected PII highlighted</span>
        </h3>
        {empty ? (
          <div className="min-h-64 flex-1">
            <EmptyState Icon={ScanSearch} title="Nothing to review yet" onSample={onSample}>
              Your original text appears here with every detected item highlighted by type.
            </EmptyState>
          </div>
        ) : (
          <pre ref={left} onScroll={sync(left, right)} className={pane} tabIndex={0}>
            <Segments segments={source} side="source" animKey={animKey} typeLabels={typeLabels} />
          </pre>
        )}
      </section>
      <section className={card} aria-label="Sanitized">
        <h3 className={title}>
          Sanitized <span className={sub}>· safe to copy or download</span>
        </h3>
        {empty ? (
          <div className="min-h-64 flex-1">
            <EmptyState Icon={ShieldCheck} title="Sanitized output appears here">
              Pick a redaction mode above and the result updates live. Dotted underlines mark look-alike numbers that
              failed their checksum and were correctly left alone.
            </EmptyState>
          </div>
        ) : (
          <pre ref={right} onScroll={sync(right, left)} className={pane} tabIndex={0}>
            <Segments segments={output} side="output" animKey={animKey} typeLabels={typeLabels} />
          </pre>
        )}
      </section>
    </div>
  );
}
