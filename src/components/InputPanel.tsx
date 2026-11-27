import { useMemo, useRef } from 'react';
import { ClipboardPaste, FileText, Table, Trash2, Upload } from 'lucide-react';
import type { LineEnding } from '../utils/csv';
import EmptyState from './EmptyState';
import StepHeading from './StepHeading';

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
  'press inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50';

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
    <section className="rounded-xl border border-slate-300 bg-white shadow-sm" aria-label="Input">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <div className="mr-auto">
          <StepHeading n={1} title="Add your text" hint={fileName || undefined} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button type="button" className={btn} onClick={() => fileRef.current?.click()} title="Open a .txt or .csv file. It is read locally and never uploaded.">
          <Upload className="h-4 w-4" aria-hidden /> Upload .txt / .csv
        </button>
        <button type="button" className={btn} onClick={() => onSample('log')}>
          <FileText className="h-4 w-4" aria-hidden /> Sample log
        </button>
        <button type="button" className={btn} onClick={() => onSample('csv')}>
          <Table className="h-4 w-4" aria-hidden /> Sample CSV
        </button>
        <button type="button" className={btn} onClick={onClear} disabled={!text}>
          <Trash2 className="h-4 w-4" aria-hidden /> Clear
        </button>
      </div>
      <div className="relative">
        <textarea
          value={display}
          onChange={(e) => onChange(lineEnding === '\n' ? e.target.value : e.target.value.replace(/\n/g, lineEnding))}
          spellCheck={false}
          aria-label="Text to sanitize"
          className="block h-60 w-full resize-y rounded-b-xl bg-white p-4 font-mono text-[13px] leading-6 text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
        />
        {!text && (
          // The overlay lets clicks fall through to the textarea, except on its buttons.
          <div className="pointer-events-none absolute inset-0 [&_button]:pointer-events-auto">
            <EmptyState Icon={ClipboardPaste} title="Paste text here, drop in a file, or start with a sample" onSample={onSample}>
              Works on support tickets, logs and CSV exports. Emails, phones, cards, Aadhaar, PAN and IP addresses are
              redacted as you type, and everything stays in this browser tab.
            </EmptyState>
          </div>
        )}
      </div>
    </section>
  );
}
