/** Filtr chiplaridagi son indikatori (nechta shablon bor) */
export function CountBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold leading-none tabular-nums transition-colors ${
        active ? "bg-white/20 text-ink-inverse" : "bg-maroon/10 text-maroon"
      }`}
    >
      {n}
    </span>
  );
}
