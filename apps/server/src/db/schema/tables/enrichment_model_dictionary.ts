import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const enrichmentModelDictionary = pgTable(
	"enrichment_model_dictionary",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		raw: text("raw").notNull(),
		canonicalModel: text("canonical_model").notNull(),
		make: text("make").notNull(),
		source: text("source").notNull(),
		externalVehicleModelSlug: text("external_vehicle_model_slug"),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		rawMakeUnique: uniqueIndex(
			"enrichment_model_dictionary_raw_make_unique",
		).on(table.raw, table.make),
		canonicalIndex: index("enrichment_model_dictionary_canonical_idx").on(
			table.canonicalModel,
		),
	}),
);
