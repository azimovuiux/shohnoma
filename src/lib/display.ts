/** Ko‘rsatish formatlari (spec §13): sana 12.09.2026, vaqt 18:00, telefon +998 90 123 45 67 */

export const monthsUz = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
/** Ruscha oy nomlari (qaratqich kelishigida: «12 сентября») */
export const monthsRu = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** "2026-09-12T18:00" → { day: "12.09.2026", time: "18:00", long: "12 sentabr 2026", dots: "12 · 09 · 2026" } */
export const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function splitDate(local: string | null | undefined, locale: "uz" | "ru" | "en" = "uz") {
  const m = (local ?? "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, t] = m;
  const months = locale === "ru" ? monthsRu : locale === "en" ? monthsEn : monthsUz;
  return {
    iso: `${y}-${mo}-${d}`,
    day: `${d}.${mo}.${y}`,
    time: t ?? "",
    long: `${Number(d)} ${months[Number(mo) - 1]} ${y}`,
    short: `${Number(d)} ${months[Number(mo) - 1]}`,
    dots: `${d} · ${mo} · ${y}`,
  };
}

/** Toshkent vaqti bo‘yicha Date (UTC+5) */
export const tashkentDate = (local: string) => new Date(`${local.length === 10 ? `${local}T00:00` : local}:00+05:00`);

export function daysUntil(local: string | null | undefined) {
  if (!local) return null;
  const ms = tashkentDate(local).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400_000));
}

export function formatPhoneDisplay(p: string | null | undefined) {
  if (!p) return "";
  const d = p.replace(/\D/g, "").replace(/^998/, "");
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/** Nisbiy vaqt: "hozirgina", "5 daqiqa oldin", "kecha 14:20", "12.09 18:00" */
export function relativeTime(date: Date | string, locale: "uz" | "ru" | "en" = "uz") {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  const ru = locale === "ru";
  const en = locale === "en";
  if (diff < 60) return ru ? "только что" : en ? "just now" : "hozirgina";
  if (diff < 3600) return ru ? `${Math.floor(diff / 60)} мин назад` : en ? `${Math.floor(diff / 60)} min ago` : `${Math.floor(diff / 60)} daqiqa oldin`;
  if (diff < 86400) return ru ? `${Math.floor(diff / 3600)} ч назад` : en ? `${Math.floor(diff / 3600)} h ago` : `${Math.floor(diff / 3600)} soat oldin`;
  const t = new Date(d.getTime() + 5 * 3600_000).toISOString();
  return `${t.slice(8, 10)}.${t.slice(5, 7)} ${t.slice(11, 16)}`;
}

export const orderStatusView = {
  draft: { label: "Qoralama · to‘lov kutilmoqda", tone: "pending" },
  pending_payment: { label: "Qoralama · to‘lov kutilmoqda", tone: "pending" },
  payment_processing: { label: "To‘lov jarayonida", tone: "pending" },
  p2p_review: { label: "Chek tekshirilmoqda", tone: "pending" },
  p2p_rejected: { label: "Chek qabul qilinmadi", tone: "danger" },
  payment_failed: { label: "To‘lov o‘tmadi", tone: "danger" },
  paid: { label: "Faol · sayt ochiq", tone: "success" },
  active: { label: "Faol · sayt ochiq", tone: "success" },
  archived: { label: "Arxivlangan", tone: "muted" },
} as const;

export const rsvpView = {
  coming: { label: "Boraman", tone: "success" },
  maybe: { label: "Hali aniq emas", tone: "pending" },
  not_coming: { label: "Kela olmayman", tone: "muted" },
} as const;

export const initials = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "S";
