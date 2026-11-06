import { Suspense } from "react";
import { Catalog } from "@/components/catalog/Catalog";

export const metadata = {
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
