import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, payments, orders } from "../db";
import { newId } from "../ids";
import { env } from "../env";
import { markOrderPaid, isPaidStatus } from "../orders";

/** Click SHOP API — Prepare / Complete (https://docs.click.uz) */

type P = Record<string, string>;
const md5 = (s: string) => createHash("md5").update(s).digest("hex");

function reply(p: P, error: number, error_note: string, extra: Record<string, unknown> = {}) {
  return { click_trans_id: p.click_trans_id, merchant_trans_id: p.merchant_trans_id, error, error_note, ...extra };
}

async function orderByCode(code: string) {
  const [o] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  return o ?? null;
}

export async function clickPrepare(p: P) {
  const sign = md5(`${p.click_trans_id}${p.service_id}${env.clickSecretKey}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`);
  if (sign !== p.sign_string) return reply(p, -1, "SIGN CHECK FAILED!");
  if (p.action !== "0") return reply(p, -3, "Action not found");
  const o = await orderByCode(p.merchant_trans_id);
  if (!o) return reply(p, -5, "User does not exist");
  if (isPaidStatus(o.status)) return reply(p, -4, "Already paid");
  if (Math.abs(Number(p.amount) - o.amount) > 0.01) return reply(p, -2, "Incorrect parameter amount");
  const id = newId();
  await db.insert(payments).values({
    id,
    orderId: o.id,
    provider: "click",
    amount: o.amount,
    status: "processing",
    externalId: String(p.click_trans_id),
    meta: { click_paydoc_id: p.click_paydoc_id },
  });
  await db.update(orders).set({ status: "payment_processing" }).where(eq(orders.id, o.id));
  return reply(p, 0, "Success", { merchant_prepare_id: id });
}

export async function clickComplete(p: P) {
  const sign = md5(
    `${p.click_trans_id}${p.service_id}${env.clickSecretKey}${p.merchant_trans_id}${p.merchant_prepare_id}${p.amount}${p.action}${p.sign_time}`,
  );
  if (sign !== p.sign_string) return reply(p, -1, "SIGN CHECK FAILED!");
  if (p.action !== "1") return reply(p, -3, "Action not found");
  const [pay] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, p.merchant_prepare_id), eq(payments.provider, "click")))
    .limit(1);
  if (!pay) return reply(p, -6, "Transaction does not exist");
  const [o] = await db.select().from(orders).where(eq(orders.id, pay.orderId)).limit(1);
  if (!o || o.code !== p.merchant_trans_id) return reply(p, -5, "User does not exist");
  if (pay.status === "paid" || isPaidStatus(o.status)) return reply(p, -4, "Already paid", { merchant_confirm_id: pay.id });
  if (pay.status === "cancelled") return reply(p, -9, "Transaction cancelled");
  if (Math.abs(Number(p.amount) - o.amount) > 0.01) return reply(p, -2, "Incorrect parameter amount");
  if (Number(p.error) < 0) {
    await db.update(payments).set({ status: "cancelled" }).where(eq(payments.id, pay.id));
    await db.update(orders).set({ status: "payment_failed" }).where(eq(orders.id, o.id));
    return reply(p, -9, "Transaction cancelled");
  }
  await markOrderPaid(o.id, "click", pay.id);
  return reply(p, 0, "Success", { merchant_confirm_id: pay.id });
}
