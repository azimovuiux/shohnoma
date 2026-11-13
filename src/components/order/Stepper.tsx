"use client";

import { TickCircle } from "@/components/icons";
import { useT } from "@/lib/i18n";

const steps = ["Marosim", "Tafsilotlar", "Ko‘rib chiqish", "To‘lov"];

/**
 * Buyurtma bosqichlari (spec §5.9)
 * @param desktopClass katta ekrandagi qatorni qo‘shimcha yashirish (masalan sarlavhada ko‘rsatilganda — "xl:hidden")
 * @param only "desktop" — faqat qator (oqim sarlavhasi uchun), "mobile" — faqat chiziqli ko‘rsatkich
 * @param tight sarlavha uchun ixcham oraliqlar
 */
export function Stepper({ current, desktopClass = "", only, tight = false }: { current: 1 | 2 | 3 | 4; desktopClass?: string; only?: "desktop" | "mobile"; tight?: boolean }) {
  const t = useT();
  return (
    <>
      {only !== "mobile" && (
      <ol className={`hidden items-center lg:flex ${tight ? "gap-2" : "gap-3"} ${desktopClass}`} aria-label={t("Buyurtma bosqichlari")}>
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={s} className={`flex items-center ${tight ? "gap-2" : "gap-3"}`} aria-current={active ? "step" : undefined}>
              {i > 0 && <span className={`h-[1.5px] ${tight ? "w-6" : "w-10"} ${n <= current ? "bg-maroon" : "bg-line"}`} />}
              <span className="flex items-center gap-2">
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                    done || active ? "bg-maroon text-ink-inverse" : n === current + 1 && current === 3 ? "border border-ink text-ink" : "border border-line text-ink-2"
                  }`}
                >
                  {done ? <TickCircle size={18} /> : n}
                </span>
                <span className={`t-nav whitespace-nowrap ${done || active ? "text-ink" : "text-ink-2"}`}>{t(s)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      )}
      {only !== "desktop" && (
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="grid grid-cols-4 gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={`h-[3px] rounded-full ${i + 1 <= current ? "bg-maroon" : "bg-line"}`} />
          ))}
        </div>
        <p className="t-annotation text-maroon">
          {current} / 4 · {t(steps[current - 1])}
        </p>
      </div>
      )}
    </>
  );
}
