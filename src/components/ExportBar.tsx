import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import StepHeading from './StepHeading';

interface Props {
  output: string;
  fileName: string;
}

/** `report.csv` → `report_sanitized.csv`; no extension → `.txt`. */
export function sanitizedName(fileName: string): string {
  const name = fileName || 'pasted.txt';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name}_sanitized.txt`;
  return `${name.slice(0, dot)}_sanitized${name.slice(dot)}`;
}

const btn =
  'press group inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function ExportBar({ output, fileName }: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = sanitizedName(fileName);
  const empty = !output;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context or permission denied).
      setFailed(true);
    }
  };

  const download = () => {
    const type = name.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    const url = URL.createObjectURL(new Blob([output], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4" aria-label="Export">
      <div className="mr-auto min-w-52">
        <StepHeading n={4} title="Copy or download" />
        <p className="mt-1 text-[13px] text-slate-600" aria-live="polite">
          {empty
            ? 'Add some text above to enable export.'
            : failed
              ? 'Copy was blocked by the browser. Use Download, or select the text in the Sanitized pane.'
              : 'Created locally in your browser. Nothing is uploaded.'}
        </p>
      </div>
      <button type="button" className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`} onClick={copy} disabled={empty}>
        {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? 'Copied!' : 'Copy sanitized text'}
      </button>
      <button type="button" className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={download} disabled={empty} title={`Save as ${name}`}>
        <Download className="h-4 w-4" aria-hidden /> Download {name}
      </button>
    </div>
  );
}
