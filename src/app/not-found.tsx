import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { Header } from "@/components/Header";
import { FooterCompact } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";
import { star8Path } from "@/lib/ornament";

export const metadata = { title: "Sahifa topilmadi" };

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-[640px] flex-col items-center justify-center px-5 py-20 text-center">
        <div className="relative flex size-[220px] items-center justify-center lg:size-[280px]">
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
            <path d={star8Path(100, 100, 96)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.45" />
            <path d={star8Path(100, 100, 84)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.25" />
          </svg>
          <span className="font-serif text-[88px] font-light italic leading-none text-maroon lg:text-[112px]">404</span>
        </div>
        <h1 className="mt-8 font-serif text-[34px] font-light leading-[1.05] text-ink lg:text-[52px]">Bu sahifa topilmadi</h1>
        <p className="t-body-l mt-4 text-ink-2">
          Havola eskirgan yoki xato yozilgan bo‘lishi mumkin. Taklifnoma qidirayotgan bo‘lsangiz — havolani yuborgan
          odamdan qayta so‘rang.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shablonlar" className="btn btn-primary">
            Shablonlarni ko‘rish <ArrowRight size={16} />
          </Link>
          <Link href="/" className="btn btn-secondary">
            Bosh sahifa
          </Link>
        </div>
      </main>
      <FooterCompact />
      <FloatingContact />
    </>
  );
}
