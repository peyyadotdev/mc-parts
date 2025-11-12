import { sql } from "drizzle-orm";
import {
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const enrichmentBrandTypeEnum = pgEnum("enrichment_brand_type", [
	"oem",
	"manufacturer",
]);

export const enrichmentBrandDictionary = pgTable(
	"enrichment_brand_dictionary",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		type: enrichmentBrandTypeEnum("type").notNull(),
		canonical: text("canonical").notNull(),
		make: text("make"),
		synonyms: jsonb("synonyms")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		sources: jsonb("sources")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		notes: text("notes"),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		typeCanonicalUnique: uniqueIndex(
			"enrichment_brand_dictionary_type_canonical_unique",
		).on(table.type, table.canonical),
	}),
);
