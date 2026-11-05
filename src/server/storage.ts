import "server-only";
import { mkdir, writeFile, readFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { newId } from "./ids";
import { env } from "./env";

const MAX = 8 * 1024 * 1024; // 8 MB
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export const uploadRoot = () => path.resolve(process.cwd(), env.uploadDir);

/** Faylni saqlash → "/files/<dir>/<name>" */
export async function saveUpload(file: File, dir: "photos" | "receipts" | "briefs") {
  if (!(file instanceof File) || file.size === 0) throw new Error("Fayl tanlanmagan");
  if (file.size > MAX) throw new Error("Fayl hajmi 8 MB dan oshmasin");
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Faqat rasm (JPG, PNG, WEBP) yoki PDF yuklang");
  const name = `${newId(20)}.${ext}`;
  const folder = path.join(uploadRoot(), dir);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
  return `/files/${dir}/${name}`;
}

export async function readUpload(rel: string[]) {
  const safe = rel.filter((s) => /^[a-z0-9._-]+$/i.test(s) && s !== ".." && s !== ".");
  if (safe.length !== rel.length || safe.length !== 2) return null;
  const full = path.join(uploadRoot(), ...safe);
  if (!full.startsWith(uploadRoot())) return null;
  try {
    const st = await stat(full);
    return { data: await readFile(full), size: st.size, ext: path.extname(full).slice(1) };
  } catch {
    return null;
  }
}

export async function deleteUpload(url: string) {
  const m = url.match(/^\/files\/(photos|receipts|briefs)\/([a-z0-9]+\.[a-z]+)$/);
  if (!m) return;
  await unlink(path.join(uploadRoot(), m[1], m[2])).catch(() => undefined);
}
