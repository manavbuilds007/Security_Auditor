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
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50';

export default function ExportBar({ output, fileName }: Props) {
  const [copied, setCopied] = useState(false);
  const name = sanitizedName(fileName);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context or permission denied) */
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
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`} onClick={copy} disabled={!output}>
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? 'Copied' : 'Copy sanitized'}
      </button>
      <button type="button" className={`${btn} bg-slate-900 text-white hover:bg-slate-700`} onClick={download} disabled={!output}>
        <Download className="h-3.5 w-3.5" aria-hidden /> Download {name}
      </button>
    </div>
  );
}
