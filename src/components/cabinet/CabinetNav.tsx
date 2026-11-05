"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DocumentText, Heart, LogoutCurve, Messages, UserTick } from "@/components/icons";
import { site } from "@/lib/site";
import { formatPhoneDisplay, initials } from "@/lib/display";

type Props = { name: string | null; phone: string | null; telegramUser: string | null; orders: number; favorites: number };

const items = [
  { href: "/kabinet", label: "Buyurtmalarim", icon: DocumentText, count: "orders" as const },
  { href: "/kabinet/sevimlilar", label: "Sevimlilar", icon: Heart, count: "favorites" as const },
  { href: "/kabinet/profil", label: "Profil", icon: UserTick, count: null },
];

export function useLogout() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
}

/** Kabinet darajasidagi chap panel (desktop 264px) va mobil segment tablar — spec §5.11 (1) */
export function CabinetNav(p: Props) {
  const path = usePathname();
  const logout = useLogout();
  const row = "flex w-full items-center gap-3 rounded-xl px-3 py-[11px] text-[13px] font-medium leading-none transition-colors";

  return (
    <>
      <aside className="hidden w-[264px] shrink-0 flex-col gap-1.5 self-start rounded-card bg-bg-soft px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 pb-3.5 pl-2">
          <span className="flex size-11 items-center justify-center rounded-full bg-maroon font-serif text-[20px] font-medium text-ink-inverse">
            {initials(p.name ?? "S")}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate t-title text-ink">{p.name || "Mening kabinetim"}</span>
            <span className="t-body-s text-ink-2">{p.phone ? formatPhoneDisplay(p.phone) : p.telegramUser}</span>
          </div>
        </div>
        {items.map((it) => {
          const active = path === it.href;
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`${row} ${active ? "bg-bg-base text-maroon shadow-soft" : "text-ink hover:bg-bg-base/60"}`}
            >
              <Icon size={18} />
              <span className="flex-1">{it.label}</span>
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
          <Messages size={18} /> Yordam
        </a>
        <button type="button" onClick={logout} className={`${row} text-ink-2 hover:bg-bg-base/60`}>
          <LogoutCurve size={18} /> Chiqish
        </button>
      </aside>

      <nav className="flex rounded-full bg-bg-soft p-1 lg:hidden" aria-label="Kabinet">
        {items.map((it) => {
          const active = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full t-nav ${active ? "bg-bg-base text-maroon shadow-soft" : "text-ink-2"}`}
            >
              {it.label === "Buyurtmalarim" ? "Buyurtmalar" : it.label}
              {it.count && <span className="text-[11px] opacity-70">{p[it.count]}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
