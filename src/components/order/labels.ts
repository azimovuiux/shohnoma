import type { Ceremony } from "@/lib/templates";

/** Marosim turiga qarab maydon nomlari (spec §6.4 tavsiya) */
export function personLabels(c: Ceremony): { a: string; b: string | null; bOptional?: boolean } {
  switch (c) {
    case "sunnat":
      return { a: "O‘g‘lingizning ismi", b: "Ota-ona ismi", bOptional: true };
    case "tugilgan-kun":
      return { a: "Kimning tug‘ilgan kuni", b: null };
    default:
      return { a: "Kuyovning ismi", b: "Kelinning ismi" };
  }
}

export const needsPersonB = (c: Ceremony) => c === "nikoh" || c === "fotiha";

export function namesOf(o: { personA: string; personB: string; ceremony: Ceremony }) {
  if (!o.personA) return "";
  return o.personB && needsPersonB(o.ceremony) ? `${o.personA} & ${o.personB}` : o.personB ? `${o.personA} (${o.personB})` : o.personA;
}
