"use client";

import Link from "@/components/LocalLink";
import type { MouseEvent, ReactNode } from "react";
import { ArrowLeft, Import } from "@/components/icons";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useT } from "@/lib/i18n";
import { Stepper } from "./Stepper";
import { useFlowGuard } from "./FlowGuard";

/**
 * «Orqaga» havolasi. Shu buyurtmaning oldingi bosqichiga — avval kiritilganlar saqlanadi, keyin o‘tiladi
 * (aks holda yangi sahifa eski ma’lumotni yuklab olishi mumkin). Oqimdan tashqariga (1-bosqichda shablonga) —
 * FlowGuard tasdiqlash oynasini ko‘rsatadi.
 */
export function BackLink({ href, className, children, label }: { href: string; className?: string; children: ReactNode; label?: string }) {
  const router = useLocalRouter();
  const { page, flushThen } = useFlowGuard();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!page || !href.startsWith(`/buyurtma/${page.orderId}/`) || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    flushThen(() => router.push(href));
  };
  return (
    <Link href={href} onClick={onClick} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

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
        <BackLink href={back.href} className="inline-flex w-fit items-center gap-2 t-nav text-ink-2 hover:text-maroon">
          <ArrowLeft size={16} /> {back.label}
        </BackLink>
        {/* katta ekranda (xl) bosqichlar oqim sarlavhasida ko‘rinadi */}
        {step && <Stepper current={step} desktopClass="xl:hidden" />}
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

/** «Qoralamani saqlash» tugmasi — faqat buyurtma to‘ldirilayotganda (kabinetdan tahrirlashda emas) */
export function SaveDraftButton({ className = "btn btn-secondary", short = false }: { className?: string; short?: boolean }) {
  const t = useT();
  const { page, saving, saveDraft } = useFlowGuard();
  if (page?.kind !== "fill") return null;
  return (
    <button type="button" onClick={() => void saveDraft()} disabled={saving} className={className} data-flow-action="save-draft">
      <Import size={16} />
      {short ? (
        <>
          <span className="sm:hidden">{t("Saqlash")}</span>
          <span className="hidden sm:inline">{t("Qoralamani saqlash")}</span>
        </>
      ) : (
        t("Qoralamani saqlash")
      )}
    </button>
  );
}

/** Bosqich oxiridagi navigatsiya (katta ekran): ← Orqaga · Qoralamani saqlash · Davom etish */
export function StepNav({ back, children }: { back: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="mt-10 hidden items-center gap-3 border-t border-line pt-6 lg:flex">
      <BackLink href={back} className="btn btn-secondary">
        <ArrowLeft size={16} /> {t("Orqaga")}
      </BackLink>
      <div className="ml-auto flex items-center gap-3">
        <SaveDraftButton />
        <div className="w-[260px]">{children}</div>
      </div>
    </div>
  );
}

/** Mobil pastki panel: ← (orqaga) + asosiy tugma */
export function MobileActions({ back, children }: { back: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2.5">
      <BackLink href={back} label={t("Orqaga")} className="btn btn-secondary !h-[50px] !w-[50px] shrink-0 !px-0">
        <ArrowLeft size={18} />
      </BackLink>
      <div className="min-w-0 flex-1">{children}</div>
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
