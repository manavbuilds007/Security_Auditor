import { useMemo, useRef } from 'react';
import { FileText, Table, Trash2, Upload } from 'lucide-react';
import type { LineEnding } from '../utils/csv';

interface Props {
  text: string;
  lineEnding: LineEnding;
  fileName: string;
  onChange: (text: string) => void;
  onFile: (name: string, text: string) => void;
  onSample: (kind: 'log' | 'csv') => void;
  onClear: () => void;
}

const btn =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

export default function InputPanel({ text, lineEnding, fileName, onChange, onFile, onSample, onClear }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Browsers normalise textarea values to LF, so show LF and restore the file's
  // original line endings when the user edits.
  const display = useMemo(() => text.replace(/\r\n?/g, '\n'), [text]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFile(file.name, String(reader.result ?? ''));
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white" aria-label="Input">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
        <h2 className="mr-auto text-sm font-semibold">
          Input <span className="font-normal text-slate-500">{fileName && `· ${fileName}`}</span>
        </h2>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" aria-hidden /> Upload .txt / .csv
        </button>
        <button type="button" className={btn} onClick={() => onSample('log')}>
          <FileText className="h-3.5 w-3.5" aria-hidden /> Sample log
        </button>
        <button type="button" className={btn} onClick={() => onSample('csv')}>
          <Table className="h-3.5 w-3.5" aria-hidden /> Sample CSV
        </button>
        <button type="button" className={btn} onClick={onClear} disabled={!text}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
        </button>
      </div>
      <textarea
        value={display}
        onChange={(e) => onChange(lineEnding === '\n' ? e.target.value : e.target.value.replace(/\n/g, lineEnding))}
        spellCheck={false}
        placeholder="Paste text, logs or CSV here, or upload a file. Nothing leaves your browser."
        className="min-h-48 flex-1 resize-y rounded-b-lg p-3 font-mono text-xs leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      />
    </section>
  );
}
