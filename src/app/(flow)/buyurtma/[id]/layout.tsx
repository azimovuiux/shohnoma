/**
 * Statik eksport: barcha buyurtmalar uchun bitta "_" qobiq yaratiladi.
 * Apache (.htaccess) /buyurtma/<id>/... so‘rovlarini /buyurtma/_/... ga yo‘naltiradi, haqiqiy id brauzerda URL'dan o‘qiladi.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
