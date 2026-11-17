import { useSyncExternalStore } from "react";
import { allTemplates, builtinHomeTemplates, builtinTemplates, homeTemplates, templates, type Template } from "./templates";

/*
 * Statik HTML asl (kodga kiritilgan) ro‘yxat bilan yig‘ilgan. Gidratatsiya paytida o‘shani,
 * keyin admin boshqaradigan jonli ro‘yxatni qaytaramiz — mos kelmaslik (hydration mismatch) bo‘lmaydi.
 */
const noop = () => () => {};

export function useTemplates(): Template[] {
  return useSyncExternalStore(noop, () => templates, () => builtinTemplates);
}

export function useTemplate(slug: string | null | undefined): Template | undefined {
  const list = useSyncExternalStore(noop, () => allTemplates, () => builtinTemplates);
  return slug ? list.find((t) => t.slug === slug) : undefined;
}

/** Bosh sahifadagi shablonlar (admin tanlagan 10 ta va tartibi) */
export function useHomeTemplates(): Template[] {
  return useSyncExternalStore(noop, () => homeTemplates, () => builtinHomeTemplates);
}
