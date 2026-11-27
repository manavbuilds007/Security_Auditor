import { useRef } from 'react';
import { TYPE_LABELS, type Segment } from '../utils/piiEngine';
import { CATEGORY_STYLES } from './categoryStyles';
import EmptyState from './EmptyState';

interface Props {
  source: Segment[];
  output: Segment[];
  onSample: (kind: 'log' | 'csv') => void;
}

function Segments({ segments, side }: { segments: Segment[]; side: 'source' | 'output' }) {
  return (
    <>
      {segments.map((s, i) => {
        if (s.kind === 'text' || !s.type) return <span key={i}>{s.text}</span>;
        if (s.kind === 'rejected') {
          const why = s.reason === 'luhn' ? 'failed the Luhn check' : 'failed the Verhoeff check';
          return (
            <span
              key={i}
              title={`Not redacted: looks like ${TYPE_LABELS[s.type].toLowerCase()} but ${why}`}
              className="rounded-sm bg-amber-50 underline decoration-amber-500 decoration-dashed underline-offset-2"
            >
              {s.text}
            </span>
          );
        }
        const title =
          side === 'source'
            ? `${TYPE_LABELS[s.type]} → ${s.applied ? s.replacement : 'left unchanged (filtered off)'}`
            : `${TYPE_LABELS[s.type]} (redacted)`;
        const style = s.applied === false ? 'bg-slate-100 text-slate-500 ring-1 ring-slate-300' : CATEGORY_STYLES[s.type].mark;
        return (
          <mark key={i} title={title} className={`rounded-sm px-0.5 ${style}`}>
            {s.text}
          </mark>
        );
      })}
    </>
  );
}

export default function DiffView({ source, output, onSample }: Props) {
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

  const pane = 'h-96 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed';
  const emptyPane = 'h-96';
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="min-w-0 rounded-lg border border-slate-200 bg-white" aria-label="Source">
        <h2 className="border-b border-slate-200 px-3 py-2 text-sm font-semibold">
          Source <span className="font-normal text-slate-500">· detected PII highlighted</span>
        </h2>
        {empty ? (
          <div className={emptyPane}>
            <EmptyState title="Nothing to review yet" onSample={onSample}>
              Your original text will appear here with every detected item highlighted by type. Hover a highlight to
              see what it becomes.
            </EmptyState>
          </div>
        ) : (
          <pre ref={left} onScroll={sync(left, right)} className={pane} tabIndex={0}>
            <Segments segments={source} side="source" />
          </pre>
        )}
      </section>
      <section className="min-w-0 rounded-lg border border-slate-200 bg-white" aria-label="Sanitized">
        <h2 className="border-b border-slate-200 px-3 py-2 text-sm font-semibold">
          Sanitized <span className="font-normal text-slate-500">· safe to copy or download</span>
        </h2>
        {empty ? (
          <div className={emptyPane}>
            <EmptyState title="Sanitized output appears here">
              Pick a redaction mode above and the result updates live. Amber dashed underlines mark numbers that
              looked like cards or Aadhaar but failed their checksum and were left unchanged.
            </EmptyState>
          </div>
        ) : (
          <pre ref={right} onScroll={sync(right, left)} className={pane} tabIndex={0}>
            <Segments segments={output} side="output" />
          </pre>
        )}
      </section>
    </div>
  );
}
