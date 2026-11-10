"use client";
import { useSyncExternalStore } from "react";
import { categories, categoriesServerSnapshot, type Category } from "./categories";

const noop = () => () => {};
/** Kategoriyalar (statik HTML bilan mos: birinchi chizishda standart ro‘yxat) */
export function useCategories(): Category[] {
  return useSyncExternalStore(noop, () => categories, categoriesServerSnapshot);
}
