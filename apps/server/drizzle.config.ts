import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/db/schema/tables/*.ts", // CLI läser modeller härifrån
	out: "./drizzle",
	dbCredentials: { url: process.env.DATABASE_URL! },
	strict: true,
	verbose: true,
});
