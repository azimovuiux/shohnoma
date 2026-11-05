import { Suspense } from "react";
import { Photo } from "@/components/home/Photo";
import { LoginPageClient } from "@/components/cabinet/LoginForm";

export const metadata = { title: "Kabinetga kirish", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-[1440px] items-center gap-[120px] px-5 py-8 lg:py-6 lg:pl-6 lg:pr-[120px]">
      <div className="relative hidden h-[760px] w-[640px] shrink-0 overflow-hidden rounded-[28px] lg:block">
        <Photo alt="Krem taklifnoma kartalari, oltin muhr va pero" src="/images/custom-design.webp" tone="cream" className="absolute inset-0" />
        <div className="absolute bottom-[34px] left-7 flex flex-col gap-1.5 rounded-[18px] bg-bg-base/92 px-5 py-4">
          <p className="t-title text-ink">Hammasi bir joyda</p>
          <p className="t-body-s text-ink-2">Buyurtma, havola, QR kod va mehmonlar javobi</p>
        </div>
      </div>
      <Suspense>
        <LoginPageClient />
      </Suspense>
    </div>
  );
}
