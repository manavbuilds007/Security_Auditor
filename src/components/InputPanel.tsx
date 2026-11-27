import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, FileText, Table, Trash2, TriangleAlert, Upload } from 'lucide-react';
import type { LineEnding } from '../utils/csv';
import { UNSUPPORTED_FILE_MESSAGE, isSupportedTextFile } from '../utils/files';
import EmptyState from './EmptyState';
import StepHeading from './StepHeading';

interface Props {
  text: string;
  lineEnding: LineEnding;
  fileName: string;
  /** False while a modal (the intro) is open: drops are then ignored instead of loading behind it. */
  acceptDrops: boolean;
  onChange: (text: string) => void;
  onFile: (name: string, text: string) => void;
  onSample: (kind: 'log' | 'csv') => void;
  onClear: () => void;
}

const btn =
  'press inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50';

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

export default function InputPanel({
  text,
  lineEnding,
  fileName,
  acceptDrops,
  onChange,
  onFile,
  onSample,
  onClear,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  // Browsers normalise textarea values to LF, so show LF and restore the file's
  // original line endings when the user edits.
  const display = useMemo(() => text.replace(/\r\n?/g, '\n'), [text]);

  const loadFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!isSupportedTextFile(file.name, file.type)) {
        setError(`${UNSUPPORTED_FILE_MESSAGE} “${file.name}” was not loaded.`);
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onload = () => onFile(file.name, String(reader.result ?? ''));
      reader.onerror = () => setError(`Could not read “${file.name}”.`);
      reader.readAsText(file);
    },
    [onFile],
  );

  // Files can be dropped anywhere on the page. We always cancel the browser's default (which would navigate
  // away to the file and lose your work), but only load while this panel is the active surface.
  useEffect(() => {
    let depth = 0;
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = acceptDrops ? 'copy' : 'none';
    };
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      if (acceptDrops) setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (acceptDrops) loadFile(e.dataTransfer?.files[0]);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [acceptDrops, loadFile]);

  const empty = !text;

  return (
    <section
      className={`relative rounded-xl border bg-white shadow-sm transition-colors ${
        dragging ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-300'
      }`}
      aria-label="Input"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <div className="mr-auto">
          <StepHeading n={1} title="Add your text" hint={fileName || 'Upload a file or write your own text'} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={(e) => {
            loadFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className={btn}
          onClick={() => fileRef.current?.click()}
          title="Open a .txt or .csv file. It is read locally and never uploaded."
        >
          <Upload className="h-4 w-4" aria-hidden /> Upload .txt / .csv
        </button>
        <button type="button" className={btn} onClick={() => onSample('log')}>
          <FileText className="h-4 w-4" aria-hidden /> Sample log
        </button>
        <button type="button" className={btn} onClick={() => onSample('csv')}>
          <Table className="h-4 w-4" aria-hidden /> Sample CSV
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setError('');
            onClear();
          }}
          disabled={!text}
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Clear
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-800"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <div className="relative">
        {/* Empty: the textarea fills the box and the guide sits in normal flow, so the box grows to fit the guide
            instead of squashing it. With text: an ordinary fixed-height, resizable textarea. */}
        <textarea
          value={display}
          onChange={(e) => onChange(lineEnding === '\n' ? e.target.value : e.target.value.replace(/\n/g, lineEnding))}
          spellCheck={false}
          aria-label="Text to sanitize"
          className={`block w-full rounded-b-xl bg-white p-4 font-mono text-[13px] leading-6 text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
            empty ? 'absolute inset-0 h-full resize-none' : 'h-60 resize-y'
          }`}
        />
        {empty && (
          // Clicks fall through to the textarea, except on the sample buttons.
          <div className="pointer-events-none relative [&_button]:pointer-events-auto">
            <EmptyState
              className="min-h-60"
              Icon={ClipboardPaste}
              title="Upload a file, or write your own text here"
              primary={{ label: 'Upload a .txt or .csv file', onClick: () => fileRef.current?.click() }}
              onSample={onSample}
            >
              Choose a file (or drop one anywhere on this page), or click in this window and type or paste. Emails,
              phones, cards, Aadhaar, PAN and IP addresses are redacted as you go. Everything stays in this browser tab.
            </EmptyState>
          </div>
        )}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-b-xl bg-emerald-50/90 text-base font-semibold text-emerald-800">
            Drop to load the file
          </div>
        )}
      </div>
    </section>
  );
}
