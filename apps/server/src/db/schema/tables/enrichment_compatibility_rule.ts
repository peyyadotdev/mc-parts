import { sql } from "drizzle-orm";
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const enrichmentCompatibilityRule = pgTable(
	"enrichment_compatibility_rule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		brandSlug: text("brand_slug").notNull(),
		modelSlugs: jsonb("model_slugs")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		makeColumn: text("make_column").notNull().default("make"),
		modelColumn: text("model_column").notNull().default("model"),
		conditions: jsonb("conditions")
			.$type<
				Array<{
					column: string;
					operator: "=" | ">=" | "<=" | "BETWEEN";
					value: string | number | [number, number];
				}>
			>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		brandSlugUnique: uniqueIndex(
			"enrichment_compatibility_rule_brand_unique",
		).on(table.brandSlug),
	}),
);
