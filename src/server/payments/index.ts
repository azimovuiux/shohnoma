import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, payments, orders, type PayProvider } from "../db";
import { newId } from "../ids";
import { env } from "../env";

export const providerLabel: Record<PayProvider, string> = {
  payme: "Payme",
  click: "Click",
  google_pay: "Google Pay",
  p2p: "P2P o‘tkazma",
};

export function enabledProviders(): PayProvider[] {
  const list: PayProvider[] = [];
  if ((env.paymeMerchantId && env.paymeKey) || env.paymentsSandbox) list.push("payme");
  if ((env.clickServiceId && env.clickMerchantId && env.clickSecretKey) || env.paymentsSandbox) list.push("click");
  if (env.googlePayEnabled) list.push("google_pay");
  list.push("p2p");
  return list;
}

export async function latestPayment(orderId: string) {
  const [p] = await db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt)).limit(1);
  return p ?? null;
}

/** Provayder sahifasiga yo‘naltirish havolasi */
export async function startPayment(orderId: string, provider: PayProvider) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Buyurtma topilmadi");
  const returnUrl = `${env.siteUrl}/buyurtma/${order.id}/tolov/jarayonda?usul=${provider}`;

  if (provider === "p2p") {
    await db.update(orders).set({ status: "pending_payment" }).where(eq(orders.id, orderId));
    return { url: `/buyurtma/${order.id}/tolov/p2p` };
  }

  await db.update(orders).set({ status: "payment_processing" }).where(eq(orders.id, orderId));

  if (env.paymentsSandbox && !(provider === "payme" ? env.paymeMerchantId : env.clickServiceId)) {
    // Test rejimi: provayder o‘rniga ichki test sahifasi
    return { url: `/buyurtma/${order.id}/tolov/sandbox?usul=${provider}` };
  }

  if (provider === "payme") {
    const params = `m=${env.paymeMerchantId};ac.order_id=${order.code};a=${order.amount * 100};c=${returnUrl};l=uz`;
    const host = env.paymeTest ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
    return { url: `${host}/${Buffer.from(params).toString("base64")}` };
  }
  if (provider === "click") {
    const q = new URLSearchParams({
      service_id: env.clickServiceId!,
      merchant_id: env.clickMerchantId!,
      amount: String(order.amount),
      transaction_param: order.code,
      return_url: returnUrl,
    });
    if (env.clickMerchantUserId) q.set("merchant_user_id", env.clickMerchantUserId);
    return { url: `https://my.click.uz/services/pay?${q}` };
  }
  throw new Error("Bu to‘lov usuli hozircha mavjud emas");
}

export async function createP2pPayment(orderId: string, amount: number, receiptUrl: string) {
  const id = newId();
  await db.insert(payments).values({ id, orderId, provider: "p2p", amount, status: "review", receiptUrl });
  await db.update(orders).set({ status: "p2p_review" }).where(eq(orders.id, orderId));
  return id;
}

export async function pendingP2p() {
  return db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(eq(payments.provider, "p2p"), eq(payments.status, "review")))
    .orderBy(desc(payments.createdAt));
}
