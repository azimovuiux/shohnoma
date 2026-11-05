import { NextResponse } from "next/server";
import { handlePayme, paymeAuthError, paymeAuthorized } from "@/server/payments/payme";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!paymeAuthorized(req.headers.get("authorization"))) return NextResponse.json(paymeAuthError(body?.id));
  if (!body?.method) return NextResponse.json({ jsonrpc: "2.0", id: body?.id ?? 0, error: { code: -32600, message: "Invalid request" } });
  return NextResponse.json(await handlePayme(body));
}
