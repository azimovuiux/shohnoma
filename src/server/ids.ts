import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const ALPHA = "0123456789abcdefghijklmnopqrstuvwxyz";
export function newId(len = 24) {
  const b = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHA[b[i] % 36];
  return s;
}
export const newToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomCode = (digits = 6) => String(randomInt(0, 10 ** digits)).padStart(digits, "0");
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
