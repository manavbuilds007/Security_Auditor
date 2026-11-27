import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import ControlsBar from './components/ControlsBar';
import SummaryBar from './components/SummaryBar';
import DiffView from './components/DiffView';
import ExportBar from './components/ExportBar';
import StepHeading from './components/StepHeading';
import UseCases from './components/UseCases';
import HowItWorks from './components/HowItWorks';
import Reveal from './components/Reveal';
import GlobeIntro, { introAlreadySeen, markIntroSeen } from './components/GlobeIntro';
import { PII_TYPES, sanitize, type PiiType, type RedactionMode } from './utils/piiEngine';
import { describeCsv, detectLineEnding, sameStructure } from './utils/csv';
import { SAMPLE_CSV, SAMPLE_TEXT } from './data/sampleData';

const ALL_ON = Object.fromEntries(PII_TYPES.map((t) => [t, true])) as Record<PiiType, boolean>;

export default function App() {
  const [introOpen, setIntroOpen] = useState(() => !introAlreadySeen());
  const shellRef = useRef<HTMLDivElement>(null);
  const closeIntro = useCallback(() => {
    markIntroSeen();
    setIntroOpen(false);
  }, []);

  // The workspace is unreachable (mouse, keyboard, screen reader) while the intro dialog is open.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    if (introOpen) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [introOpen]);

  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<RedactionMode>('full');
  const [typedTags, setTypedTags] = useState(false);
  const [aadhaarVerhoeff, setAadhaarVerhoeff] = useState(false);
  const [typeLabels, setTypeLabels] = useState(true);
  const [enabled, setEnabled] = useState(ALL_ON);

  const deferred = useDeferredValue(text);
  const lineEnding = useMemo(() => detectLineEnding(text), [text]);

  const result = useMemo(
    () => sanitize(deferred, { mode, typedTags, aadhaarVerhoeff, enabled }),
    [deferred, mode, typedTags, aadhaarVerhoeff, enabled],
  );
  const redacted = useMemo(() => result.matches.filter((m) => enabled[m.type]).length, [result, enabled]);

  const isCsv = fileName.toLowerCase().endsWith('.csv');
  const csv = useMemo(() => {
    if (!isCsv || !deferred) return null;
    const info = describeCsv(deferred);
    return { ...info, preserved: sameStructure(deferred, result.output, info.delimiter) };
  }, [isCsv, deferred, result.output]);

  const animKey = `${mode}-${typedTags}-${aadhaarVerhoeff}`;

  const loadSample = (kind: 'log' | 'csv') => {
    setText(kind === 'csv' ? SAMPLE_CSV : SAMPLE_TEXT);
    setFileName(kind === 'csv' ? 'sample.csv' : 'sample.txt');
  };

  return (
    <>
      <div ref={shellRef} className="flex min-h-full flex-col">
        <Header onReplayIntro={() => setIntroOpen(true)} />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">
          {/* The working surface: visible immediately, no scroll-reveal. On wide screens the settings sit in a
              sticky right column, so the input and the live result are always on screen together. */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-x-6">
            <div className="xl:col-start-1 xl:row-start-1">
              <InputPanel
                acceptDrops={!introOpen}
                text={text}
                lineEnding={lineEnding}
                fileName={fileName}
                onChange={setText}
                onFile={(name, content) => {
                  setFileName(name);
                  setText(content);
                }}
                onSample={loadSample}
                onClear={() => {
                  setText('');
                  setFileName('');
                }}
              />
            </div>
            <div className="xl:sticky xl:top-4 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
              <ControlsBar
                mode={mode}
                typedTags={typedTags}
                aadhaarVerhoeff={aadhaarVerhoeff}
                typeLabels={typeLabels}
                enabled={enabled}
                counts={result.counts}
                onMode={setMode}
                onTypedTags={setTypedTags}
                onAadhaarVerhoeff={setAadhaarVerhoeff}
                onTypeLabels={setTypeLabels}
                onToggleType={(t) => setEnabled((e) => ({ ...e, [t]: !e[t] }))}
              />
            </div>
            <section
              className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm xl:col-start-1 xl:row-start-2"
              aria-label="Review and export"
            >
              <StepHeading n={3} title="Review what was found" hint="Highlights show what changes" />
              <div className="mt-4">
                <SummaryBar result={result} redacted={redacted} hasText={text.length > 0} csv={csv} />
              </div>
              <div className="mt-4">
                <DiffView
                  source={result.sourceSegments}
                  output={result.outputSegments}
                  onSample={loadSample}
                  animKey={animKey}
                  typeLabels={typeLabels}
                />
              </div>
              <div className="mt-5">
                <ExportBar output={result.output} fileName={fileName} />
              </div>
            </section>
          </div>

          {/* Supporting content lives below the tool, so returning users reach the input immediately. */}
          <div className="mt-6 flex flex-col gap-12 border-t border-slate-200 pt-10">
            <Reveal>
              <UseCases />
            </Reveal>
            <Reveal>
              <HowItWorks />
            </Reveal>
          </div>
        </main>
        <footer className="px-4 py-6 text-center text-xs text-slate-600">
          All processing happens in your browser. No data is uploaded, stored or logged.
        </footer>
      </div>
      {introOpen && <GlobeIntro onClose={closeIntro} />}
    </>
  );
}
