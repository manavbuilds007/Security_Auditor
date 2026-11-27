import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import UseCases from './components/UseCases';
import Reveal from './components/Reveal';
import GlobeIntro, { INTRO_STORAGE_KEY } from './components/GlobeIntro';
import InputPanel from './components/InputPanel';
import ControlsBar from './components/ControlsBar';
import CategoryFilters from './components/CategoryFilters';
import SummaryBar from './components/SummaryBar';
import DiffView from './components/DiffView';
import ExportBar from './components/ExportBar';
import HowItWorks from './components/HowItWorks';
import { PII_TYPES, sanitize, type PiiType, type RedactionMode } from './utils/piiEngine';
import { describeCsv, detectLineEnding, sameStructure } from './utils/csv';
import { SAMPLE_CSV, SAMPLE_TEXT } from './data/sampleData';

const ALL_ON = Object.fromEntries(PII_TYPES.map((t) => [t, true])) as Record<PiiType, boolean>;

function introAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [introOpen, setIntroOpen] = useState(() => !introAlreadySeen());
  const shellRef = useRef<HTMLDivElement>(null);
  const closeIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      /* storage blocked: the intro will just show again next load */
    }
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 px-4 py-4">
        <UseCases />
        <Reveal delay={0}>
          <InputPanel
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
        </Reveal>
        <Reveal delay={60}>
          <ControlsBar
            mode={mode}
            typedTags={typedTags}
            aadhaarVerhoeff={aadhaarVerhoeff}
            onMode={setMode}
            onTypedTags={setTypedTags}
            onAadhaarVerhoeff={setAadhaarVerhoeff}
          />
        </Reveal>
        <Reveal delay={100}>
          <div className="flex flex-col gap-3">
            <CategoryFilters enabled={enabled} counts={result.counts} onToggle={(t) => setEnabled((e) => ({ ...e, [t]: !e[t] }))} />
            <SummaryBar result={result} redacted={redacted} csv={csv} />
          </div>
        </Reveal>
        <Reveal>
          <DiffView source={result.sourceSegments} output={result.outputSegments} onSample={loadSample} animKey={animKey} />
        </Reveal>
        <Reveal>
          <ExportBar output={result.output} fileName={fileName} />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-slate-500">
        All processing happens in your browser. No data is uploaded, stored or logged.
      </footer>
    </div>
    {introOpen && <GlobeIntro onClose={closeIntro} />}
    </>
  );
}
