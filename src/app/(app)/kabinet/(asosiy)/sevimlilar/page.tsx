import Link from "next/link";
import { requireUser } from "@/server/auth";
import { userFavoriteSlugs } from "@/server/cabinet";
import { ArrowRight, Heart } from "@/components/icons";
import { FavoriteCard, FavoritesMigrate } from "@/components/cabinet/FavoriteCard";
import { getTemplate } from "@/lib/templates";

export const metadata = { title: "Sevimlilar", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await requireUser("/kabinet/sevimlilar");
  const slugs = (await userFavoriteSlugs(user.id)).filter((s) => getTemplate(s));
  return (
    <>
      <FavoritesMigrate />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">Sevimlilar</h1>
          <p className="t-body-m text-ink-2">{slugs.length} ta shablon saqlangan</p>
        </div>
        <Link href="/shablonlar" className="btn btn-secondary !py-[13px]">
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
          <Link href="/shablonlar" className="btn btn-primary">
            Shablonlarni ko‘rish <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {slugs.map((s) => (
            <FavoriteCard key={s} slug={s} />
          ))}
        </div>
      )}
    </>
  );
}
