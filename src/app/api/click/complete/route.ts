import { NextResponse } from "next/server";
import { clickComplete } from "@/server/payments/click";

export async function POST(req: Request) {
  const p = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  return NextResponse.json(await clickComplete(p));
}
