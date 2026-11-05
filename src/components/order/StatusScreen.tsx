import type { ReactNode } from "react";
import { CloseCircle, TickCircle, Timer1 } from "@/components/icons";
import { star8Path } from "@/lib/ornament";

type Kind = "progress" | "success" | "error" | "waiting";

/** 20/21/14/13/22 — markazlashgan holat ekrani */
export function StatusIcon({ kind, icon }: { kind: Kind; icon?: ReactNode }) {
  if (kind === "success")
    return (
      <span className="relative flex size-[132px] items-center justify-center">
        <svg viewBox="0 0 132 132" className="absolute inset-0 size-full" aria-hidden>
          <path d={star8Path(66, 66, 64, 0.74)} fill="#fbf3e6" stroke="var(--color-gold)" strokeOpacity="0.45" />
        </svg>
        <span className="relative flex size-16 items-center justify-center rounded-full bg-success text-white shadow-[0_6px_14px_rgba(47,107,79,0.3)]">
          <TickCircle size={30} />
        </span>
      </span>
    );
  if (kind === "error")
    return (
      <span className="flex size-[116px] items-center justify-center rounded-full bg-[var(--danger-bg)]">
        <span className="flex size-[92px] items-center justify-center rounded-full border border-danger/25 bg-bg-base text-danger">
          <CloseCircle size={30} />
        </span>
      </span>
    );
  if (kind === "waiting")
    return (
      <span className="relative flex size-[116px] items-center justify-center rounded-full bg-bg-soft">
        <svg viewBox="0 0 92 92" className="absolute size-[92px] animate-[spin_6s_linear_infinite]" aria-hidden>
          <circle cx="46" cy="46" r="44" fill="var(--color-bg-base)" stroke="var(--color-gold)" strokeOpacity="0.55" strokeDasharray="4 5" />
          <path d="M46 2 A44 44 0 0 1 86 64" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="relative text-gold">
          <Timer1 size={30} />
        </span>
      </span>
    );
  return (
    <span className="relative flex size-[132px] items-center justify-center rounded-full bg-bg-soft">
      <svg viewBox="0 0 108 108" className="absolute size-[108px] animate-spin" aria-hidden>
        <circle cx="54" cy="54" r="52" fill="var(--color-bg-base)" stroke="var(--color-line)" />
        <path d="M54 2 A52 52 0 0 1 96 84" fill="none" stroke="var(--color-maroon)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="relative text-maroon">{icon}</span>
    </span>
  );
}

export function StatusScreen({
  kind,
  icon,
  title,
  text,
  children,
}: {
  kind: Kind;
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto flex max-w-[600px] flex-col items-center px-5 pb-20 pt-14 text-center lg:pb-24 lg:pt-[100px]">
      <StatusIcon kind={kind} icon={icon} />
      <h1 className="mt-6 font-serif text-[34px] font-light leading-[1.08] text-ink lg:text-[44px]">{title}</h1>
      {text && <p className="t-body-m mt-3 max-w-[520px] text-ink-2 lg:t-body-l">{text}</p>}
      <div className="mt-6 flex w-full flex-col items-center gap-5">{children}</div>
    </section>
  );
}

/** Kulrang kartadagi "kalit — qiymat" qatorlari */
export function InfoCard({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="w-full max-w-[520px] divide-y divide-line rounded-panel bg-bg-soft px-4 text-left">
      {rows.map(([l, v], i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-3.5">
          <dt className="t-body-s text-ink-2">{l}</dt>
          <dd className="text-right text-[13px] font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Jarayon qadamlari (13/22) */
export function Timeline({ items }: { items: { title: string; sub: string; state: "done" | "active" | "todo" }[] }) {
  return (
    <ol className="flex w-full max-w-[520px] flex-col gap-4 rounded-panel bg-bg-soft p-5 text-left">
      {items.map((it) => (
        <li key={it.title} className="flex items-center gap-3">
          <span
            className={`flex size-[30px] shrink-0 items-center justify-center rounded-full ${
              it.state === "done" ? "bg-success text-white" : it.state === "active" ? "bg-gold-soft text-gold" : "border border-line bg-bg-base text-ink-2"
            }`}
          >
            {it.state === "done" ? <TickCircle size={17} /> : it.state === "active" ? <Timer1 size={15} /> : <span className="size-1.5 rounded-full bg-current" />}
          </span>
          <span className="flex flex-col">
            <span className={`t-title ${it.state === "todo" ? "text-ink-2" : "text-ink"}`}>{it.title}</span>
            <span className="t-body-s text-ink-2">{it.sub}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function OrderLine({ left, amount }: { left: ReactNode; amount: ReactNode }) {
  return (
    <div className="flex w-full max-w-[520px] items-center justify-between gap-4 px-1">
      <span className="t-body-s text-ink-2">{left}</span>
      <span className="font-serif text-[22px] font-medium text-maroon">{amount}</span>
    </div>
  );
}
