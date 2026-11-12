import { Suspense } from "react";
import { langAlternates } from "@/lib/i18n/meta";
import { Catalog } from "@/components/catalog/Catalog";

export const metadata = {
  alternates: langAlternates("/shablonlar/"),
  title: "Barcha shablonlar",
  description: "Tayyor taklifnoma dizaynlari — nikoh, fotiha, sunnat to‘yi va tug‘ilgan kun uchun. Telefon va laptopda birdek chiroyli.",
};

export default function CatalogPage() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
