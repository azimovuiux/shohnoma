"use client";

import Link from "next/link";
import { ArrowRight, Heart } from "@/components/icons";
import { PageLoading, useApi, useMe } from "@/lib/client";
import { getTemplate } from "@/lib/templates";
import { FavoriteCard, FavoritesMigrate } from "../FavoriteCard";

/** 23 — Sevimlilar */
export function FavoritesPage() {
  const { data, loading, reload } = useApi<{ ok: boolean; slugs: string[] | null }>("/api/me/favorites");
  const { reload: reloadMe } = useMe();
  const refresh = () => {
    reload(true);
    reloadMe();
  };
  if (loading && !data) return <PageLoading />;
  const slugs = (data?.slugs ?? []).filter((s) => getTemplate(s));
  return (
    <>
      <FavoritesMigrate onDone={refresh} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">Sevimlilar</h1>
          <p className="t-body-m text-ink-2">{slugs.length} ta shablon saqlangan</p>
        </div>
        <Link href="/shablonlar/" className="btn btn-secondary !py-[13px]">
          Katalogga o‘tish <ArrowRight size={16} />
        </Link>
      </div>
      {slugs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-line px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-maroon">
            <Heart size={24} />
          </span>
          <p className="font-serif text-[30px] font-light text-ink">Hali sevimli shablon yo‘q</p>
          <p className="t-body-m max-w-[380px] text-ink-2">Katalogdagi kartalarda yurakchani bosing — yoqqan dizaynlar shu yerda saqlanadi.</p>
          <Link href="/shablonlar/" className="btn btn-primary">
            Shablonlarni ko‘rish <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {slugs.map((s) => (
            <FavoriteCard key={s} slug={s} onChange={refresh} />
          ))}
        </div>
      )}
    </>
  );
}
