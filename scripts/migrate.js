const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(path.join(__dirname, ".."), false);
(async () => {
  const mysql = require("mysql2/promise");
  const { drizzle } = require("drizzle-orm/mysql2");
  const { migrate } = require("drizzle-orm/mysql2/migrator");
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true });
  await migrate(drizzle(conn), { migrationsFolder: path.join(__dirname, "..", "drizzle") });
  await conn.end();
  console.log("OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
