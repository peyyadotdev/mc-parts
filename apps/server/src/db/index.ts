import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
});

// 👇 Här aktiverar du snake_case i DB, camelCase i TS
export const db = drizzle(pool, { schema, casing: "snake_case" });
