import { Suspense } from "react";
import { CodePageClient } from "@/components/cabinet/CodeForm";

export const metadata = { title: "Kodni kiriting", robots: { index: false } };

export default function CodePage() {
  return (
    <div className="mx-auto flex max-w-[1440px] justify-center px-5 py-12 lg:py-24">
      <Suspense>
        <CodePageClient />
      </Suspense>
    </div>
  );
}
