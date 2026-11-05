import { redirect } from "next/navigation";
import { getUser, normalizePhone } from "@/server/auth";
import { CodeForm } from "@/components/cabinet/CodeForm";

export const metadata = { title: "Kodni kiriting", robots: { index: false } };

export default async function CodePage({ searchParams }: { searchParams: Promise<{ tel?: string; next?: string; dev?: string; wait?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/kabinet";
  if (await getUser()) redirect(next);
  const phone = normalizePhone(sp.tel ?? "");
  if (!phone) redirect(`/kirish?next=${encodeURIComponent(next)}`);
  return (
    <div className="mx-auto flex max-w-[1440px] justify-center px-5 py-12 lg:py-24">
      <CodeForm phone={phone} next={next} devCode={process.env.NODE_ENV !== "production" ? sp.dev : undefined} waitFirst={sp.wait === "1"} />
    </div>
  );
}
