// Asl shablonlarni PHP uchun JSON ga eksport qiladi — baza bo‘sh bo‘lsa, shu ro‘yxat bilan to‘ldiriladi.
import { writeFileSync } from "node:fs";
import { builtinTemplates } from "../src/lib/templates.ts";

writeFileSync(new URL("../php/api/lib/templates.json", import.meta.url), JSON.stringify(builtinTemplates, null, 2) + "\n");
console.log(`templates.json: ${builtinTemplates.length} ta shablon`);
