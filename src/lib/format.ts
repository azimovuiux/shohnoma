/** 149000 → "149 000 so‘m" (dizayndagi kabi oddiy bo‘sh joy bilan); ruscha — "149 000 сум" */
export function formatPrice(n: number, withCurrency = true, locale: "uz" | "ru" | "en" = "uz") {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return withCurrency ? `${s} ${locale === "ru" ? "сум" : locale === "en" ? "UZS" : "so‘m"}` : s;
}

/** Chegirma foizi; eski narx yo‘q yoki yangisidan katta bo‘lmasa — 0 (aksiya ko‘rsatilmaydi) */
export function discountPercent(oldPrice: number, price: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
