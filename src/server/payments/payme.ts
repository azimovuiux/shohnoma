import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, payments, orders, type Payment } from "../db";
import { newId } from "../ids";
import { env } from "../env";
import { markOrderPaid, isPaidStatus } from "../orders";

/** Payme Merchant API (JSON-RPC 2.0) — https://developer.help.paycom.uz */

const TIMEOUT = 43_200_000; // 12 soat
type Rpc = { id: number | string; method: string; params: Record<string, any> };
type Meta = { state: number; create_time: number; perform_time: number; cancel_time: number; reason: number | null };

const msg = (uz: string, ru = uz, en = uz) => ({ uz, ru, en });
const err = (id: Rpc["id"], code: number, message: ReturnType<typeof msg>, data?: string) => ({ jsonrpc: "2.0", id, error: { code, message, data } });
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });

export function paymeAuthorized(header: string | null) {
  if (!env.paymeKey || !header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString();
  const [login, key] = decoded.split(":");
  return login === "Paycom" && key === env.paymeKey;
}

async function findOrder(account: Record<string, string> | undefined) {
  const code = account?.order_id;
  if (!code) return null;
  const [o] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  return o ?? null;
}

async function findTx(paymeId: string) {
  const [p] = await db.select().from(payments).where(and(eq(payments.provider, "payme"), eq(payments.externalId, paymeId))).limit(1);
  return p ?? null;
}

const metaOf = (p: Payment) => (p.meta ?? {}) as Meta;

function checkOrder(id: Rpc["id"], o: Awaited<ReturnType<typeof findOrder>>, amountTiyin: number) {
  if (!o) return err(id, -31050, msg("Buyurtma topilmadi", "Заказ не найден", "Order not found"), "order_id");
  if (isPaidStatus(o.status) || o.status === "archived")
    return err(id, -31051, msg("Buyurtma allaqachon to‘langan", "Заказ уже оплачен", "Order already paid"), "order_id");
  if (o.amount * 100 !== Number(amountTiyin)) return err(id, -31001, msg("Summa noto‘g‘ri", "Неверная сумма", "Wrong amount"));
  return null;
}

export async function handlePayme(body: Rpc) {
  const { id, method, params } = body;
  switch (method) {
    case "CheckPerformTransaction": {
      const o = await findOrder(params.account);
      const e = checkOrder(id, o, params.amount);
      if (e) return e;
      return ok(id, { allow: true });
    }
    case "CreateTransaction": {
      const existing = await findTx(params.id);
      if (existing) {
        const m = metaOf(existing);
        if (m.state !== 1) return err(id, -31008, msg("Tranzaksiyani bajarib bo‘lmaydi", "Невозможно выполнить операцию", "Unable to perform"));
        if (Date.now() - m.create_time > TIMEOUT) {
          await db.update(payments).set({ status: "cancelled", meta: { ...m, state: -1, cancel_time: Date.now(), reason: 4 } }).where(eq(payments.id, existing.id));
          return err(id, -31008, msg("Tranzaksiya muddati o‘tgan", "Истёк срок", "Expired"));
        }
        return ok(id, { create_time: m.create_time, transaction: existing.id, state: 1 });
      }
      const o = await findOrder(params.account);
      const e = checkOrder(id, o, params.amount);
      if (e) return e;
      // Bitta buyurtmaga bitta faol tranzaksiya
      const active = await db
        .select()
        .from(payments)
        .where(and(eq(payments.orderId, o!.id), eq(payments.provider, "payme"), eq(payments.status, "processing")));
      if (active.some((p) => metaOf(p).state === 1))
        return err(id, -31050, msg("Buyurtma uchun boshqa to‘lov kutilmoqda", "Ожидается другая оплата", "Another payment pending"), "order_id");
      const pid = newId();
      const meta: Meta = { state: 1, create_time: Number(params.time) || Date.now(), perform_time: 0, cancel_time: 0, reason: null };
      await db.insert(payments).values({ id: pid, orderId: o!.id, provider: "payme", amount: o!.amount, status: "processing", externalId: params.id, meta });
      await db.update(orders).set({ status: "payment_processing" }).where(eq(orders.id, o!.id));
      return ok(id, { create_time: meta.create_time, transaction: pid, state: 1 });
    }
    case "PerformTransaction": {
      const tx = await findTx(params.id);
      if (!tx) return err(id, -31003, msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found"));
      const m = metaOf(tx);
      if (m.state === 2) return ok(id, { transaction: tx.id, perform_time: m.perform_time, state: 2 });
      if (m.state !== 1) return err(id, -31008, msg("Tranzaksiyani bajarib bo‘lmaydi", "Невозможно выполнить операцию", "Unable to perform"));
      if (Date.now() - m.create_time > TIMEOUT) {
        await db.update(payments).set({ status: "cancelled", meta: { ...m, state: -1, cancel_time: Date.now(), reason: 4 } }).where(eq(payments.id, tx.id));
        return err(id, -31008, msg("Tranzaksiya muddati o‘tgan", "Истёк срок", "Expired"));
      }
      const perform_time = Date.now();
      await db.update(payments).set({ meta: { ...m, state: 2, perform_time } }).where(eq(payments.id, tx.id));
      await markOrderPaid(tx.orderId, "payme", tx.id);
      return ok(id, { transaction: tx.id, perform_time, state: 2 });
    }
    case "CancelTransaction": {
      const tx = await findTx(params.id);
      if (!tx) return err(id, -31003, msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found"));
      const m = metaOf(tx);
      if (m.state === 1) {
        const cancel_time = Date.now();
        await db.update(payments).set({ status: "cancelled", meta: { ...m, state: -1, cancel_time, reason: params.reason } }).where(eq(payments.id, tx.id));
        await db.update(orders).set({ status: "payment_failed" }).where(eq(orders.id, tx.orderId));
        return ok(id, { transaction: tx.id, cancel_time, state: -1 });
      }
      if (m.state === 2) {
        // Xizmat ko‘rsatilgan (sayt ochilgan) — bekor qilib bo‘lmaydi
        return err(id, -31007, msg("Buyurtma bajarilgan, bekor qilib bo‘lmaydi", "Заказ выполнен", "Order completed"));
      }
      return ok(id, { transaction: tx.id, cancel_time: m.cancel_time, state: m.state });
    }
    case "CheckTransaction": {
      const tx = await findTx(params.id);
      if (!tx) return err(id, -31003, msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found"));
      const m = metaOf(tx);
      return ok(id, { create_time: m.create_time, perform_time: m.perform_time, cancel_time: m.cancel_time, transaction: tx.id, state: m.state, reason: m.reason });
    }
    case "GetStatement": {
      const from = new Date(Number(params.from));
      const to = new Date(Number(params.to));
      const rows = await db
        .select({ p: payments, o: orders })
        .from(payments)
        .innerJoin(orders, eq(orders.id, payments.orderId))
        .where(and(eq(payments.provider, "payme"), gte(payments.createdAt, from), lte(payments.createdAt, to)));
      return ok(id, {
        transactions: rows.map(({ p, o }) => {
          const m = metaOf(p);
          return {
            id: p.externalId,
            time: m.create_time,
            amount: p.amount * 100,
            account: { order_id: o.code },
            create_time: m.create_time,
            perform_time: m.perform_time,
            cancel_time: m.cancel_time,
            transaction: p.id,
            state: m.state,
            reason: m.reason,
          };
        }),
      });
    }
    default:
      return err(id, -32601, msg("Metod topilmadi", "Метод не найден", "Method not found"));
  }
}

export const paymeAuthError = (id: Rpc["id"] = 0) => err(id, -32504, msg("Ruxsat yo‘q", "Недостаточно привилегий", "Insufficient privileges"));
