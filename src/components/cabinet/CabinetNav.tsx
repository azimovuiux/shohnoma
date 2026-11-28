"use client";

import Link from "@/components/LocalLink";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageLoading, useMe, useRequireUser } from "@/lib/client";
import { LogoutCurve, MessageQuestion } from "@/components/icons";
import { site } from "@/lib/site";
import { ACCOUNT_SECTIONS, AccountAvatar, accountSubtitle, accountTitle, sectionActive, useLogout } from "@/components/Account";
import { useLpath, useT } from "@/lib/i18n";

type Props = { name: string | null; phone: string | null; telegramUser: string | null; active: number; orders: number; favorites: number; cards: number };

// Bo‘limlar va ikonkalar — sarlavhadagi hisob menyusi bilan bir xil (Account.tsx)
const items = ACCOUNT_SECTIONS;

export { useLogout };

/** Kabinet darajasidagi sahifalar qobig‘i: kirishni tekshiradi, chap panel + kontent */
export function CabinetShell({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireUser();
  const { me } = useMe();
  if (loading || !user) return <PageLoading />;
  const counts = { active: 0, orders: 0, favorites: 0, cards: 0, ...me?.counts };
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pb-20 pt-6 lg:flex-row lg:gap-10 lg:px-10 xl:px-[120px] lg:pb-[100px] lg:pt-10">
      <CabinetNav name={user.name} phone={user.phone} telegramUser={user.telegramUser} active={counts.active} orders={counts.orders} favorites={counts.favorites} cards={counts.cards ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col gap-5">{children}</div>
    </div>
  );
}

/** Kabinet darajasidagi chap panel (desktop 264px) va mobil segment tablar — spec §5.11 (1) */
export function CabinetNav(p: Props) {
  const t = useT();
  const lp = useLpath();
  const path = usePathname();
  const logout = useLogout();
  const row = "flex w-full items-center gap-3 rounded-xl px-3 py-[11px] text-[13px] font-medium leading-none transition-colors";

  return (
    <>
      <aside className="hidden w-[264px] shrink-0 flex-col gap-1.5 self-start rounded-card bg-bg-soft px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 pb-3.5 pl-2">
          <AccountAvatar name={p.name} size={44} serif />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate t-title text-ink">{accountTitle(p, t)}</span>
            <span className="truncate t-body-s text-ink-2">{accountSubtitle(p, t)}</span>
          </div>
        </div>
        {items.map((it) => {
          const active = sectionActive(path, it.href, lp);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`${row} ${active ? "bg-bg-base text-maroon shadow-soft" : "text-ink hover:bg-bg-base/60"}`}
            >
              <Icon size={18} />
              <span className="flex-1">{t(it.label)}</span>
              {it.count && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-normal leading-[1.5] ${active ? "bg-maroon/10 text-maroon" : "bg-bg-base text-ink-2"}`}
                >
                  {p[it.count]}
                </span>
              )}
            </Link>
          );
        })}
        <span className="my-1 h-px bg-line-dark/10" />
        <a href={site.telegram} target="_blank" rel="noopener noreferrer" className={`${row} text-ink hover:bg-bg-base/60`}>
          <MessageQuestion size={18} /> {t("Yordam")}
        </a>
        <button type="button" onClick={logout} className={`${row} text-decline hover:bg-[var(--decline-bg)]`}>
          <LogoutCurve size={18} /> {t("Chiqish")}
        </button>
      </aside>

      {/* Mobil: 6 ta bo‘lim — telefonda 3×2 (nomlar qisqarmasin, 320px da ham o‘qiladi), planshetda bitta qator; son ikonka burchagida */}
      <nav className="grid grid-cols-3 gap-0.5 rounded-[20px] bg-bg-soft p-1 sm:grid-cols-6 lg:hidden" aria-label={t("Kabinet")}>
        {items.map((it) => {
          const active = sectionActive(path, it.href, lp);
          const Icon = it.icon;
          const n = it.count ? p[it.count] : 0;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11.5px] tracking-[-0.01em] sm:min-h-[58px] sm:py-2 font-medium leading-[1.15] transition-colors ${active ? "bg-bg-base text-maroon shadow-soft" : "text-ink-2 active:bg-bg-base/60"}`}
            >
              <span className="relative">
                <Icon size={21} variant={active ? "Bold" : "Linear"} />
                {n > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[10px] font-semibold leading-none text-ink-inverse">
                    {n}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{t(it.short)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
