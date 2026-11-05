import { TickCircle } from "@/components/icons";

const steps = ["Marosim", "Tafsilotlar", "Ko‘rib chiqish", "To‘lov"];

/** Buyurtma bosqichlari (spec §5.9) */
export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <>
      <ol className="hidden items-center gap-3 lg:flex" aria-label="Buyurtma bosqichlari">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={s} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
              {i > 0 && <span className={`h-[1.5px] w-10 ${n <= current ? "bg-maroon" : "bg-line"}`} />}
              <span className="flex items-center gap-2">
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                    done || active ? "bg-maroon text-ink-inverse" : n === current + 1 && current === 3 ? "border border-ink text-ink" : "border border-line text-ink-2"
                  }`}
                >
                  {done ? <TickCircle size={18} /> : n}
                </span>
                <span className={`t-nav ${done || active ? "text-ink" : "text-ink-2"}`}>{s}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="grid grid-cols-4 gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={`h-[3px] rounded-full ${i + 1 <= current ? "bg-maroon" : "bg-line"}`} />
          ))}
        </div>
        <p className="t-annotation text-maroon">
          {current} / 4 · {steps[current - 1]}
        </p>
      </div>
    </>
  );
}
