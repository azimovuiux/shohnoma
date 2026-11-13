"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/LocalLink";
import { LogoMark } from "@/components/Logo";
import { LangSwitcher } from "@/components/Header";
import { openChat } from "@/components/FloatingContact";
import { CloseCircle, MessageQuestion } from "@/components/icons";
import { useT } from "@/lib/i18n";
import { Stepper } from "./Stepper";
import { useFlowGuard } from "./FlowGuard";
import { SaveDraftButton } from "./FlowTop";

/** To‘ldirish bosqichlari: marosim, tafsilotlar, ko‘rib chiqish, to‘lov tanlash (to‘lov jarayoni/natija sahifalari emas) */
const FILL_RE = /^(?:\/(?:ru|en))?\/buyurtma\/[^/]+\/(?:marosim|tafsilotlar|korib-chiqish|tolov)\/?$/;

/**
 * Oqim sahifalarining sarlavhasi: to‘ldirish bosqichlarida — ixcham FlowHeader (sayt menyusi o‘rniga),
 * qolganlarida (to‘lov jarayoni, natija, kabinetdan tahrirlash) — oddiy sayt sarlavhasi.
 */
export function FlowChrome({ appHeader }: { appHeader: ReactNode }) {
  const path = usePathname() ?? "";
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(new URLSearchParams(window.location.search).get("qaytish") === "kabinet"), [path]);
  return FILL_RE.test(path) && !editing ? <FlowHeader /> : <>{appHeader}</>;
}

/** Ixcham oqim sarlavhasi: logotip · bosqichlar · til · yordam · «Qoralamani saqlash» · «Chiqish» */
export function FlowHeader() {
  const t = useT();
  const { page, exit, reloadTo } = useFlowGuard();
  const step = page?.kind === "fill" ? page.step : null;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-base/[0.97] backdrop-blur-sm">
      <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-3 px-4 sm:px-5 lg:h-[76px] lg:gap-6 lg:px-10 xl:px-[120px]">
        <Link href="/" className="inline-flex shrink-0 items-center" aria-label={t("Shohnoma — bosh sahifa")}>
          <LogoMark className="h-7 w-auto lg:h-9" />
        </Link>
        <div className="hidden min-w-0 flex-1 justify-center xl:flex">{step && <Stepper current={step} only="desktop" tight />}</div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <LangSwitcher compact navigate={reloadTo} />
          </div>
          {/* katta ekranda o‘ng pastdagi chat tugmasi bor */}
          <button type="button" onClick={openChat} className="btn btn-secondary h-10 w-10 !px-0 lg:!hidden" aria-label={t("Yordam")} title={t("Yordam")}>
            <MessageQuestion size={18} />
          </button>
          <SaveDraftButton short className="btn btn-secondary h-10 !gap-1.5 !px-3.5 sm:!px-4" />
          <button type="button" onClick={exit} className="btn btn-secondary h-10 !gap-1.5 max-lg:!w-10 max-lg:!px-0" aria-label={t("oqim::Chiqish")} data-flow-action="exit">
            <CloseCircle size={18} />
            <span className="hidden lg:inline">{t("oqim::Chiqish")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
