import { useDeferredValue, useMemo, useState } from 'react';
import Header from './components/Header';
import UseCaseBanner from './components/UseCaseBanner';
import InputPanel from './components/InputPanel';
import ControlsBar from './components/ControlsBar';
import CategoryFilters from './components/CategoryFilters';
import SummaryBar from './components/SummaryBar';
import DiffView from './components/DiffView';
import ExportBar from './components/ExportBar';
import { PII_TYPES, sanitize, type PiiType, type RedactionMode } from './utils/piiEngine';
import { describeCsv, detectLineEnding, sameStructure } from './utils/csv';
import { SAMPLE_CSV, SAMPLE_TEXT } from './data/sampleData';

const ALL_ON = Object.fromEntries(PII_TYPES.map((t) => [t, true])) as Record<PiiType, boolean>;

export default function App() {
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

  const loadSample = (kind: 'log' | 'csv') => {
    setText(kind === 'csv' ? SAMPLE_CSV : SAMPLE_TEXT);
    setFileName(kind === 'csv' ? 'sample.csv' : 'sample.txt');
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 px-4 py-4">
        <UseCaseBanner />
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
        <ControlsBar
          mode={mode}
          typedTags={typedTags}
          aadhaarVerhoeff={aadhaarVerhoeff}
          onMode={setMode}
          onTypedTags={setTypedTags}
          onAadhaarVerhoeff={setAadhaarVerhoeff}
        />
        <CategoryFilters enabled={enabled} counts={result.counts} onToggle={(t) => setEnabled((e) => ({ ...e, [t]: !e[t] }))} />
        <SummaryBar result={result} redacted={redacted} csv={csv} />
        <DiffView source={result.sourceSegments} output={result.outputSegments} />
        <ExportBar output={result.output} fileName={fileName} />
      </main>
      <footer className="px-4 py-4 text-center text-xs text-slate-500">
        All processing happens in your browser. No data is uploaded, stored or logged.
      </footer>
    </div>
  );
}
