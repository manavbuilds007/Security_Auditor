interface Props {
  n: number;
  title: string;
  /** Short secondary text shown beside the title. */
  hint?: string;
  children?: React.ReactNode;
}

/** Numbered section title: the page's main hierarchy level. */
export default function StepHeading({ n, title, hint, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span
        aria-hidden
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
      >
        {n}
      </span>
      <h2 className="text-base font-semibold tracking-tight text-slate-900">
        <span className="sr-only">Step {n}: </span>
        {title}
      </h2>
      {hint && <span className="text-[13px] text-slate-600">{hint}</span>}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
