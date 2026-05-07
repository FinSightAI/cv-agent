import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Don't throw at import time — allows local UI dev without a DB.
  console.warn("[db] DATABASE_URL not set — DB queries will fail at runtime.");
}

const pool = connectionString ? new Pool({ connectionString }) : null;

export const db = pool
  ? drizzle(pool, { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

export const sql = connectionString ? neon(connectionString) : null;

export { schema };
