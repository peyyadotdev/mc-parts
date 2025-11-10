import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set. Please set it in apps/server/.env.local");
}

const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
	console.error("Unexpected error on idle client", err);
});

// 👇 Här aktiverar du snake_case i DB, camelCase i TS
export const db = drizzle(pool, { schema, casing: "snake_case" });
