interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  /** Always-visible help text (not a hover tooltip, so it works on touch and with a keyboard). */
  description: string;
  disabled?: boolean;
}

/** Native checkbox (role=switch) with a styled track, so keyboard and screen-reader behaviour stay standard. */
export default function Switch({ checked, onChange, label, description, disabled }: Props) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className="relative mt-0.5 inline-block h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:bg-emerald-600 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-slate-800">{label}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{description}</span>
      </span>
    </label>
  );
}
