import type { Ceremony } from "@/lib/templates";

/** Marosim turiga qarab maydon nomlari (spec §6.4 tavsiya) */
export function personLabels(c: Ceremony): { a: string; b: string | null; bOptional?: boolean } {
  switch (c) {
    case "sunnat":
      return { a: "O‘g‘lingizning ismi", b: "Ota-ona ismi", bOptional: true };
    case "tugilgan-kun":
      return { a: "Kimning tug‘ilgan kuni", b: null };
    case "korporativ":
      return { a: "Tadbir nomi", b: "Kompaniya / tashkilotchi" };
    default:
      return { a: "Kuyovning ismi", b: "Kelinning ismi" };
  }
}

/** Ikkinchi maydon majburiymi: nikoh/fotiha — kelin ismi, korporativ — kompaniya nomi */
export const needsPersonB = (c: Ceremony) => c === "nikoh" || c === "fotiha" || c === "korporativ";
/** Ismlar juftligi («Jasur & Madina») — faqat nikoh va fotiha */
const isPair = (c: Ceremony) => c === "nikoh" || c === "fotiha";

/** Xulosa qatoridagi yorliq: tug‘ilgan kunda bitta ism — «Ism», korporativda — «Tadbir», qolganlarida «Ismlar» */
export const namesLabel = (c: Ceremony) => (c === "tugilgan-kun" ? "Ism" : c === "korporativ" ? "Tadbir" : "Ismlar");

export function namesOf(o: { personA: string; personB: string; ceremony: Ceremony }) {
  if (!o.personA) return "";
  if (o.personB && isPair(o.ceremony)) return `${o.personA} & ${o.personB}`;
  if (o.personB && (o.ceremony === "sunnat" || o.ceremony === "korporativ")) return `${o.personA} (${o.personB})`;
  return o.personA;
}
