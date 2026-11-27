import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';

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
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

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
    <section className="rounded-lg border border-slate-200 bg-white px-3 py-3" aria-label="Export">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto min-w-48">
          <h2 className="text-sm font-semibold">3. Copy or download the sanitized text</h2>
          <p className="text-xs text-slate-500" aria-live="polite">
            {empty
              ? 'Add some text above to enable export.'
              : failed
                ? 'Copy was blocked by the browser. Use Download, or select the text in the Sanitized pane.'
                : 'Created locally in your browser. Nothing is uploaded.'}
          </p>
        </div>
        <button
          type="button"
          className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`}
          onClick={copy}
          disabled={empty}
          title="Copy the sanitized text to your clipboard"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied!' : 'Copy sanitized text'}
        </button>
        <button
          type="button"
          className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          onClick={download}
          disabled={empty}
          title={`Save as ${name}`}
        >
          <Download className="h-4 w-4" aria-hidden /> Download {name}
        </button>
      </div>
    </section>
  );
}
