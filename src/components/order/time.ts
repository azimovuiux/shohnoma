/** Toshkent vaqti: "Bugun, 14:32" / "Kecha, 09:10" / "04.11.2026, 23:41" */
export function tashkentStamp(d: Date | string | null | undefined, mode: "relative" | "full" = "relative", locale: "uz" | "ru" = "uz") {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const t = new Date(date.getTime() + 5 * 3600_000).toISOString();
  const now = new Date(Date.now() + 5 * 3600_000).toISOString();
  const hm = t.slice(11, 16);
  const full = `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}, ${hm}`;
  if (mode === "full") return full;
  if (t.slice(0, 10) === now.slice(0, 10)) return `${locale === "ru" ? "Сегодня" : "Bugun"}, ${hm}`;
  const y = new Date(Date.now() + 5 * 3600_000 - 86400_000).toISOString();
  if (t.slice(0, 10) === y.slice(0, 10)) return `${locale === "ru" ? "Вчера" : "Kecha"}, ${hm}`;
  return full;
}
