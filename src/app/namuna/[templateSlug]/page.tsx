import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplate, templates } from "@/lib/templates";
import { InvitationSite } from "@/components/invitation/InvitationSite";
import { demoData } from "@/components/invitation/data";

type Props = { params: Promise<{ templateSlug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return templates.map((t) => ({ templateSlug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = getTemplate((await params).templateSlug);
  return t ? { title: `${t.name} — jonli namuna`, description: t.description, robots: { index: false } } : {};
}

export default async function DemoPage({ params }: Props) {
  const t = getTemplate((await params).templateSlug);
  if (!t) notFound();
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-bg-base/95 px-4 py-2.5 backdrop-blur">
        <span className="t-body-s text-ink-2">
          Namuna: <span className="font-medium text-ink">{t.name}</span>
        </span>
        <Link href={`/buyurtma/${t.slug}/marosim/`} className="btn btn-primary btn-sm !py-2.5">
          Shu shablonni tanlash
        </Link>
      </div>
      <InvitationSite template={t} data={demoData(t)} mode="demo" />
    </>
  );
}
