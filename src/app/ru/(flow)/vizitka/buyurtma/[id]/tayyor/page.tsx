// Ruscha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /ru/layout.tsx da
import { langAlternates } from "@/lib/i18n/meta";
import Page from "@/app/(flow)/vizitka/buyurtma/[id]/tayyor/page";

export const metadata = { title: "Визитка готова", robots: { index: false, follow: false }, alternates: langAlternates("/vizitka/buyurtma/_/tayyor/", "ru") };
export default Page;
