// Vizitka dizaynlari reestri va forma sxemasini PHP uchun JSON ga eksport qiladi (php/api/lib/cards.json — gitignore).
import { writeFileSync } from "node:fs";
import { cardsExport } from "../src/lib/cards.ts";

writeFileSync(new URL("../php/api/lib/cards.json", import.meta.url), JSON.stringify(cardsExport, null, 2) + "\n");
console.log(`cards.json: ${cardsExport.designs.length} ta vizitka dizayni`);
