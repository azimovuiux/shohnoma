"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchNormal1 } from "@/components/icons";
import { useT } from "@/lib/i18n";

export function GuestSearch() {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((sp.get("q") ?? "") === q.trim()) return;
      const next = new URLSearchParams(sp.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      next.delete("page");
      next.delete("ko");
      router.replace(`${path.replace(/\/?$/, "/")}${next.toString() ? `?${next}` : ""}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [q, sp, path, router]);
  return (
    <label className="relative flex w-full items-center sm:w-[260px]">
      <SearchNormal1 size={16} className="pointer-events-none absolute left-3.5 text-ink-2" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("Ism bo‘yicha qidirish")}
        aria-label={t("Ism bo‘yicha qidirish")}
        className="h-[42px] w-full rounded-full border border-line bg-bg-base pl-10 pr-4 t-body-m text-ink outline-none placeholder:text-ink-2/80 focus:border-maroon/55"
      />
    </label>
  );
}
