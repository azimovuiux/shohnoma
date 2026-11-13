// Kartadagi mokap rasmlari uchun versiya (fayl xeshi) — rasm o‘zgarsa manzil ham o‘zgaradi,
// shuning uchun uzoq keshlangan eski rasm brauzerda qolib ketmaydi.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = new URL("../public/templates/", import.meta.url);
const out: Record<string, string> = {};
for (const f of readdirSync(dir).sort()) {
  if (!/^[a-z0-9-]+-(phone|laptop)(-long)?\.webp$/.test(f)) continue;
  const p = new URL(f, dir);
  if (existsSync(p)) out[f] = createHash("md5").update(readFileSync(p)).digest("hex").slice(0, 8);
}
// Ulashish kartasi fonlari (public/templates/<slug>/share-bg.webp) — src/lib/shareCard
for (const d of readdirSync(dir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const p = new URL(`${d.name}/share-bg.webp`, dir);
  if (existsSync(p)) out[`${d.name}/share-bg.webp`] = createHash("md5").update(readFileSync(p)).digest("hex").slice(0, 8);
}
writeFileSync(
  new URL("../src/lib/tplImgVersions.ts", import.meta.url),
  `// Avtomatik yaratiladi: scripts/img-versions.mts (npm run build) — qo‘lda tahrirlamang\nexport const tplImgVersions: Record<string, string> = ${JSON.stringify(out, null, 2)};\n`,
);
console.log(`tplImgVersions.ts: ${Object.keys(out).length} ta rasm`);
