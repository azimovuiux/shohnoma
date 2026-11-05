import { json } from "@/server/http";
import { destroySession } from "@/server/auth";

export async function POST() {
  await destroySession();
  return json({ ok: true });
}
