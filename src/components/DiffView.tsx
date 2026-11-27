import { useMemo, useState } from 'react';
import { ScanSearch, ShieldCheck } from 'lucide-react';
import { TYPE_LABELS, type Segment } from '../utils/piiEngine';
import { pairLines } from '../utils/lines';
import { CATEGORY_STYLES, REJECTED_MARK_CLASS, REJECTED_MARK_DESCRIPTION } from './categoryStyles';
import EmptyState from './EmptyState';

/** Rendering thousands of lines twice would make typing laggy. The copied/downloaded output is never truncated. */
const MAX_LINES = 3000;

interface Props {
  source: Segment[];
  output: Segment[];
  onSample: (kind: 'log' | 'csv') => void;
  /** Changes whenever the redaction settings change, replaying the highlight animation. */
  animKey: string;
  /** Print the type on each highlight (both panes). */
  typeLabels: boolean;
}

interface SegmentsProps {
  segments: Segment[];
  side: 'source' | 'output';
  animKey: string;
  typeLabels: boolean;
  nextDelay: () => number;
}

const LABEL_CLASSES =
  'after:ml-1.5 after:align-middle after:text-[10px] after:font-bold after:tracking-wider after:opacity-70 after:content-[attr(data-label)]';

function Segments({ segments, side, animKey, typeLabels, nextDelay }: SegmentsProps) {
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
              className={REJECTED_MARK_CLASS}
            >
              {s.text}
            </span>
          );
        }
        const style = CATEGORY_STYLES[s.type];
        const off = s.applied === false;
        const title =
          side === 'source'
            ? `${TYPE_LABELS[s.type]} → ${off ? 'left unchanged (type turned off)' : s.replacement}`
            : `${TYPE_LABELS[s.type]} (redacted)`;
        // The label is a CSS ::after, so it is not selected or copied with the text.
        const label = typeLabels && !off;
        return (
          <mark
            key={`${i}-${side === 'output' ? animKey : ''}`}
            title={title}
            data-label={label ? style.tag : undefined}
            style={{ animationDelay: `${nextDelay()}ms` }}
            className={`animate-mark-in rounded-sm px-0.5 ${off ? 'bg-slate-200 text-slate-600 ring-1 ring-slate-400' : style.mark} ${
              label ? LABEL_CLASSES : ''
            }`}
          >
            {s.text}
          </mark>
        );
      })}
    </>
  );
}

type View = 'sanitized' | 'source';

export default function DiffView({ source, output, onSample, animKey, typeLabels }: Props) {
  // On phones only one column fits; on wide screens both are always shown.
  const [view, setView] = useState<View>('sanitized');
  const empty = source.length === 0;
  const pairs = useMemo(() => (empty ? [] : pairLines(source, output)), [empty, source, output]);
  const shown = pairs.length > MAX_LINES ? pairs.slice(0, MAX_LINES) : pairs;

  let marks = 0;
  const nextDelay = () => Math.min(marks++ * 30, 450);

  const srcCell = view === 'sanitized' ? 'hidden lg:block' : '';
  const outCell = view === 'source' ? 'hidden lg:block' : '';
  const cell = 'min-w-0 whitespace-pre-wrap break-words px-4 min-h-6';

  const tab = (id: View, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === id}
      onClick={() => setView(id)}
      className={`press rounded-full px-3 py-1 text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        view === id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <div
        role="tablist"
        aria-label="Pane to show"
        className="flex gap-1 border-b border-slate-200 px-3 py-2 lg:hidden"
      >
        {tab('sanitized', 'Sanitized')}
        {tab('source', 'Source')}
      </div>

      {/* One scroll container for both sides: rows are source|sanitized pairs, so lines never drift apart. */}
      <div
        className="max-h-[32rem] min-h-40 overflow-auto"
        tabIndex={0}
        role="region"
        aria-label="Source and sanitized text, line by line"
      >
        <div className="sticky top-0 z-10 grid grid-cols-1 border-b border-slate-200 bg-slate-50 text-[13px] font-semibold text-slate-800 lg:grid-cols-2">
          <h3 className={`px-4 py-2.5 ${srcCell}`}>
            Source <span className="font-normal text-slate-600">· detected PII highlighted</span>
          </h3>
          <h3 className={`px-4 py-2.5 lg:border-l lg:border-slate-200 ${outCell}`}>
            Sanitized <span className="font-normal text-slate-600">· safe to copy or download</span>
          </h3>
        </div>

        {empty ? (
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className={srcCell}>
              <EmptyState className="min-h-64" Icon={ScanSearch} title="Nothing to review yet" onSample={onSample}>
                Your original text appears here with every detected item highlighted by type.
              </EmptyState>
            </div>
            <div className={`lg:border-l lg:border-slate-200 ${outCell}`}>
              <EmptyState className="min-h-64" Icon={ShieldCheck} title="Sanitized output appears here">
                Pick a redaction mode and the result updates live. Look-alike numbers that failed their checksum get a{' '}
                {REJECTED_MARK_DESCRIPTION} and are correctly left alone.
              </EmptyState>
            </div>
          </div>
        ) : (
          <div className="py-2 font-mono text-[13px] leading-6">
            {shown.map((pair, li) => (
              <div key={li} className="grid grid-cols-1 lg:grid-cols-2">
                <div className={`${cell} ${srcCell}`}>
                  <Segments
                    segments={pair.source}
                    side="source"
                    animKey={animKey}
                    typeLabels={typeLabels}
                    nextDelay={nextDelay}
                  />
                </div>
                <div className={`${cell} lg:border-l lg:border-slate-200 ${outCell}`}>
                  <Segments
                    segments={pair.output}
                    side="output"
                    animKey={animKey}
                    typeLabels={typeLabels}
                    nextDelay={nextDelay}
                  />
                </div>
              </div>
            ))}
            {pairs.length > MAX_LINES && (
              <p className="px-4 pt-3 font-sans text-[13px] text-slate-600">
                Showing the first {MAX_LINES.toLocaleString()} of {pairs.length.toLocaleString()} lines. Copy and
                Download include everything.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
