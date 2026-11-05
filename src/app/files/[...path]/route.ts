import { readUpload } from "@/server/storage";

const mime: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", pdf: "application/pdf" };

/** Yuklangan fayllar (UPLOAD_DIR). Cheklar ham shu yerda — nomi tasodifiy 20 belgili. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const f = await readUpload((await params).path);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": mime[f.ext] ?? "application/octet-stream",
      "Content-Length": String(f.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
