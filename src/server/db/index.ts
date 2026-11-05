import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __shohnomaDb: MySql2Database<typeof schema> | undefined;
  // eslint-disable-next-line no-var
  var __shohnomaPool: mysql.Pool | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL sozlanmagan (.env)");
  const pool = mysql.createPool({ uri: url, connectionLimit: 8, charset: "utf8mb4", timezone: "Z", dateStrings: false });
  globalThis.__shohnomaPool = pool;
  return drizzle(pool, { schema, mode: "default" });
}

/** Yagona ulanish (dev'da HMR paytida ham) */
export const db: MySql2Database<typeof schema> = new Proxy({} as MySql2Database<typeof schema>, {
  get(_t, prop) {
    globalThis.__shohnomaDb ??= create();
    return Reflect.get(globalThis.__shohnomaDb, prop);
  },
});

export * from "./schema";
