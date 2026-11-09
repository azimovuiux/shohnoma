import { tr, type Locale } from "@/lib/i18n";
import type { FlowOrder } from "./types";

/** Server yaratgan standart matnlar (php/api/lib/orders.php: DEFAULT_MESSAGE, DEFAULT_PROGRAM) */
const DEFAULT_MESSAGE = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const DEFAULT_TITLES = [
  "Mehmonlarni kutib olish",
  "Nikoh marosimi",
  "Bazm va tabriklar",
  "Kelin-kuyov raqsi",
  "Fotiha marosimi",
  "Dasturxon va tabriklar",
  "Osh va tabriklar",
  "Tabriklar va tort",
  "Bazm",
];
const LANGS: Locale[] = ["uz", "ru", "en"];

/** Matn qaysidir tildagi standart matnmi — bo‘lsa, uning o‘zbekcha kaliti */
const baseOf = (s: string, keys: string[]) => keys.find((k) => LANGS.some((l) => tr(l, k) === s.trim()));

type Item = { time: string; title: string; note?: string };
const localizeProgram = <T extends Item>(p: T[], lang: Locale): { list: T[]; changed: boolean } => {
  let changed = false;
  const list = p.map((i) => {
    const k = baseOf(i.title, DEFAULT_TITLES);
    const title = k ? tr(lang, k) : i.title;
    if (title !== i.title) changed = true;
    return title === i.title ? i : { ...i, title };
  });
  return { list, changed };
};

/**
 * Taklifnoma tili almashganda standart (mijoz o‘zgartirmagan) taklif matni va dastur bandlarini shu tilga o‘giradi.
 * Mijoz o‘zi yozgan matnga tegilmaydi. Natija — saqlash uchun patch (o‘zgarish bo‘lmasa bo‘sh).
 */
export function localizeDefaults(o: FlowOrder, lang: Locale): Partial<Pick<FlowOrder, "message" | "program" | "extra">> {
  const patch: Partial<Pick<FlowOrder, "message" | "program" | "extra">> = {};
  if (o.message && baseOf(o.message, [DEFAULT_MESSAGE])) {
    const m = tr(lang, DEFAULT_MESSAGE);
    if (m !== o.message) patch.message = m;
  }
  const prog = localizeProgram(o.program ?? [], lang);
  if (prog.changed) patch.program = prog.list;
  const ex = o.extra as Record<string, unknown> | undefined;
  if (ex && Array.isArray(ex.program)) {
    const ep = localizeProgram(ex.program as Item[], lang);
    if (ep.changed) patch.extra = { ...ex, program: ep.list };
  }
  return patch;
}
