import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "@/components/icons";
import { Stepper } from "./Stepper";

/** Orqaga havola + bosqichlar + sarlavha */
export function FlowTop({
  back,
  step,
  title,
  sub,
  subMobile,
}: {
  back: { href: string; label: string };
  step?: 1 | 2 | 3 | 4;
  title: ReactNode;
  sub?: ReactNode;
  subMobile?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 pb-2 pt-6 lg:gap-7 lg:px-10 xl:px-[120px] lg:pt-9">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <Link href={back.href} className="inline-flex w-fit items-center gap-2 t-nav text-ink-2 hover:text-maroon">
          <ArrowLeft size={16} /> {back.label}
        </Link>
        {step && <Stepper current={step} />}
      </div>
      <div className="flex flex-col gap-2.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[52px]">{title}</h1>
        {sub && (
          <p className="t-body-m text-ink-2 lg:t-body-l">
            {subMobile ? (
              <>
                <span className="lg:hidden">{subMobile}</span>
                <span className="hidden lg:inline">{sub}</span>
              </>
            ) : (
              sub
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** Ikki ustunli kontent: forma (720) + o‘ng panel */
export function FlowColumns({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 pb-32 pt-6 lg:flex-row lg:items-start lg:gap-10 xl:gap-[72px] lg:px-10 xl:px-[120px] lg:pb-24 lg:pt-8">
      <div className="min-w-0 lg:flex-1 xl:w-[720px] xl:flex-none">{children}</div>
      <aside className="hidden min-w-0 lg:sticky lg:top-[110px] lg:block lg:w-[300px] lg:shrink-0 xl:w-auto xl:flex-1">{aside}</aside>
    </div>
  );
}
