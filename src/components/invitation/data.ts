import type { Template } from "@/lib/templates";
import type { Locale } from "@/lib/i18n";
import type { InvitationData } from "./types";

/**
 * Taklifnoma tili — sayt manzilidan emas, buyurtmadan: mijoz formada tanlagan `extra.lang` ("uz" | "ru").
 * Tanlanmagan bo‘lsa (namuna, eski buyurtmalar) — joriy sahifa tili (/ru/namuna/... → ruscha).
 */
export function inviteLang(extra: unknown, fallback: Locale): Locale {
  const l = (extra as { lang?: unknown } | null | undefined)?.lang;
  return l === "ru" || l === "uz" ? l : fallback;
}

type Row = {
  slug: string;
  ceremony: string;
  personA: string;
  personB: string | null;
  date: string;
  venueName: string;
  address: string;
  mapUrl: string | null;
  message: string | null;
  program: { time: string; title: string }[] | null;
  photos: string[] | null;
  rsvpEnabled: boolean;
  rsvpDeadline: string | null;
  musicEnabled: boolean;
  musicTrack?: string | null;
  extra?: Record<string, unknown>;
};

/**
 * Sanoq birliklari. Ruschada son bilan kelishmaydigan, lekin sanoqlarda odatiy shakl («дней/часов/минут/секунд»);
 * lug‘atga qo‘yilmagan — "kun"/"soat" kalitlari saytning boshqa joylarida qisqa shaklda tarjima qilingan.
 */
export const timerUnits = (lang: Locale) => (lang === "ru" ? ["дней", "часов", "минут", "секунд"] : ["kun", "soat", "daqiqa", "soniya"]);

const CEREMONIES = ["nikoh", "fotiha", "sunnat", "tugilgan-kun"] as const;

/** DB'dagi invitation qatori → InvitationData */
export function toInvitationData(r: Row): InvitationData {
  return {
    slug: r.slug,
    ceremony: (CEREMONIES as readonly string[]).includes(r.ceremony) ? (r.ceremony as InvitationData["ceremony"]) : "nikoh",
    personA: r.personA,
    personB: r.personB,
    date: r.date,
    venueName: r.venueName,
    address: r.address,
    mapUrl: r.mapUrl,
    message: r.message,
    program: r.program ?? [],
    photos: r.photos ?? [],
    rsvpEnabled: r.rsvpEnabled,
    rsvpDeadline: r.rsvpDeadline,
    musicEnabled: r.musicEnabled,
    musicTrack: r.musicTrack ?? null,
    extra: r.extra ?? {},
  };
}

const DEMO_PROGRAM: Record<InvitationData["ceremony"], { time: string; title: string }[]> = {
  nikoh: [
    { time: "17:00", title: "Mehmonlarni kutib olish" },
    { time: "18:00", title: "Nikoh marosimi" },
    { time: "19:30", title: "Bazm va tabriklar" },
    { time: "22:00", title: "Kelin-kuyov raqsi" },
  ],
  fotiha: [
    { time: "16:00", title: "Mehmonlarni kutib olish" },
    { time: "16:30", title: "Fotiha marosimi" },
    { time: "18:00", title: "Dasturxon va tabriklar" },
  ],
  sunnat: [
    { time: "10:00", title: "Mehmonlarni kutib olish" },
    { time: "11:00", title: "Osh va tabriklar" },
    { time: "13:00", title: "Bazm" },
  ],
  "tugilgan-kun": [
    { time: "19:00", title: "Mehmonlarni kutib olish" },
    { time: "19:30", title: "Tabriklar va tort" },
    { time: "21:00", title: "Bazm" },
  ],
};

/** Shablon namunasi (Jonli demo): sana o‘tib ketgan bo‘lsa — keyingi yil */
export function demoData(t: Template): InvitationData {
  const [d, m, y] = t.sample.date.split("·").map((x) => x.trim());
  let year = Number(y);
  const mk = (yy: number) => `${yy}-${m}-${d}T${t.sample.time}`;
  while (new Date(`${mk(year)}:00+05:00`).getTime() < Date.now()) year++;
  const rsvp = new Date(`${mk(year)}:00+05:00`);
  rsvp.setDate(rsvp.getDate() - 10);
  const ceremony = t.ceremony as InvitationData["ceremony"];
  return {
    slug: `namuna-${t.slug}`,
    ceremony,
    personA: t.sample.a,
    personB: t.sample.b ?? null,
    date: mk(year),
    venueName: t.sample.venue,
    address: "Toshkent shahri",
    mapUrl: null,
    message: "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.",
    program: DEMO_PROGRAM[ceremony],
    photos: [],
    rsvpEnabled: true,
    rsvpDeadline: rsvp.toISOString().slice(0, 10),
    musicEnabled: true,
  };
}
