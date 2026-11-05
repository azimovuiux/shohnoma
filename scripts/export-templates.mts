// Shablonlar ro‘yxatini PHP uchun JSON ga eksport qiladi (narx, marosim, nom).
import { writeFileSync } from "node:fs";
import { templates } from "../src/lib/templates.ts";

const out = templates.map((t) => ({ slug: t.slug, name: t.name, ceremony: t.ceremony, style: t.style, price: t.price, priceOld: t.priceOld, number: t.number }));
writeFileSync(new URL("../php/api/lib/templates.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`templates.json: ${out.length} ta shablon`);
