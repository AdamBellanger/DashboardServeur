import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function connect(url: string) {
  return drizzle({ client: postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 5 }), schema });
}

type Db = ReturnType<typeof connect>;

// One pool per process, reused across dev hot reloads.
const globalForDb = globalThis as unknown as { statusDb?: Db };

/** null when DATABASE_URL isn't set (e.g. a local run without a database). */
export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  globalForDb.statusDb ??= connect(url);
  return globalForDb.statusDb;
}
