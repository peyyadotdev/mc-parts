import { sql } from "drizzle-orm";
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { attributeDefinition } from "./attribute_definition";

export const attributeCategory = pgTable(
	"attribute_category",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		attributeDefinitionId: uuid("attribute_definition_id")
			.notNull()
			.references(() => attributeDefinition.id, { onDelete: "cascade" }),
		categoryKey: text("category_key").notNull(),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		uniqueAttributeCategory: uniqueIndex(
			"attribute_category_unique_idx",
		).on(table.attributeDefinitionId, table.categoryKey),
	}),
);
