/**
 * Plesk (Phusion Passenger) uchun ishga tushirish fayli.
 * Plesk → Node.js → "Application Startup File": server.js
 *  1) .env ni yuklaydi
 *  2) ma’lumotlar bazasi migratsiyalarini bajaradi (drizzle/ papkasi)
 *  3) Next.js production serverini ishga tushiradi (avval `npm run build` bajarilgan bo‘lishi kerak)
 */
const path = require("node:path");
const { createServer } = require("node:http");
const { loadEnvConfig } = require("@next/env");

const dir = __dirname;
loadEnvConfig(dir, false);
process.env.NODE_ENV = "production";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.warn("[shohnoma] DATABASE_URL yo‘q — migratsiya o‘tkazib yuborildi");
    return;
  }
  const mysql = require("mysql2/promise");
  const { drizzle } = require("drizzle-orm/mysql2");
  const { migrate } = require("drizzle-orm/mysql2/migrator");
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true });
  try {
    await migrate(drizzle(conn), { migrationsFolder: path.join(dir, "drizzle") });
    console.info("[shohnoma] migratsiyalar bajarildi");
  } finally {
    await conn.end();
  }
}

async function main() {
  await migrate();
  const next = require("next");
  const app = next({ dev: false, dir });
  await app.prepare();
  const handle = app.getRequestHandler();
  const port = Number(process.env.PORT) || 3000;
  createServer((req, res) => handle(req, res)).listen(port, () => console.info(`[shohnoma] tayyor: ${port}`));
}

main().catch((e) => {
  console.error("[shohnoma] ishga tushmadi:", e);
  process.exit(1);
});
