import { Suspense } from "react";
import { LoginPageClient } from "@/components/cabinet/LoginForm";
import { LoginAside } from "@/components/cabinet/LoginAside";

export const metadata = { title: "Kabinetga kirish", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-[1440px] items-center gap-12 px-5 py-8 lg:py-6 lg:pl-6 lg:pr-10 xl:gap-[120px] xl:pr-[120px]">
      <LoginAside />
      <Suspense>
        <LoginPageClient />
      </Suspense>
    </div>
  );
}
