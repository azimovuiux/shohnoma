/** 149000 → "149 000 so‘m" (dizayndagi kabi oddiy bo‘sh joy bilan) */
export function formatPrice(n: number, withCurrency = true) {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return withCurrency ? `${s} so‘m` : s;
}

/** Chegirma foizi; eski narx yo‘q yoki yangisidan katta bo‘lmasa — 0 (aksiya ko‘rsatilmaydi) */
export function discountPercent(oldPrice: number, price: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
