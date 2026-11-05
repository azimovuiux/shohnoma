"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ counts }: { counts: { p2p: number; briefs: number; leads: number; chats: number } }) {
  const path = usePathname();
  const tabs = [
    { href: "/admin/", label: "Umumiy", n: 0 },
    { href: "/admin/buyurtmalar/", label: "Buyurtmalar", n: 0 },
    { href: "/admin/shablonlar/", label: "Shablonlar", n: 0 },
    { href: "/admin/tolovlar/", label: "P2P cheklar", n: counts.p2p },
    { href: "/admin/briflar/", label: "Briflar", n: counts.briefs },
    { href: "/admin/chatlar/", label: "Chatlar", n: counts.chats },
    { href: "/admin/xabarlar/", label: "Xabarlar", n: counts.leads },
    { href: "/admin/sozlamalar/", label: "Sozlamalar", n: 0 },
  ];
  return (
    <nav aria-label="Admin" className="-mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      {tabs.map((t) => {
        const p = path.replace(/\/?$/, "/");
        const active = t.href === "/admin/" ? p === "/admin/" : p.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 t-nav transition-colors ${
              active ? "border-maroon text-maroon" : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
            {t.n > 0 && <span className="rounded-full bg-maroon px-1.5 py-0.5 text-[11px] font-semibold leading-none text-ink-inverse">{t.n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
