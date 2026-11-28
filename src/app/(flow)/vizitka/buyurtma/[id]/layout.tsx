/**
 * Vizitka buyurtma oqimi — statik eksportda bitta "_" qobiq.
 * Apache (.htaccess) /vizitka/buyurtma/<id>/... so‘rovlarini /vizitka/buyurtma/_/... ga yo‘naltiradi, id brauzerda URL'dan o‘qiladi.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function CardOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
