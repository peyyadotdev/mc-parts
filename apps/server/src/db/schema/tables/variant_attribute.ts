import { relations, sql } from "drizzle-orm";
import {
	boolean,
	doublePrecision,
	index,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { attributeDefinition } from "./attribute_definition";
import { productVariant } from "./product_variant";

export const attributeSourceEnum = pgEnum("attribute_source", [
	"manual",
	"extracted",
	"external",
	"ai",
]);

export const variantAttribute = pgTable(
	"variant_attribute",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		variantId: uuid("variant_id")
			.notNull()
			.references(() => productVariant.id, { onDelete: "cascade" }),
		attributeDefinitionId: uuid("attribute_definition_id")
			.notNull()
			.references(() => attributeDefinition.id, { onDelete: "cascade" }),
		valueText: text("value_text"),
		valueNumber: doublePrecision("value_number"),
		valueBoolean: boolean("value_boolean"),
		valueJson: jsonb("value_json"),
		unit: text("unit"),
		confidence: numeric("confidence", { precision: 4, scale: 3 })
			.default("0")
			.notNull(),
		source: attributeSourceEnum("source").notNull().default("extracted"),
		sourceFields: jsonb("source_fields")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		extractedAt: timestamp("extracted_at", { withTimezone: true }),
		provenance: jsonb("provenance")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		variantAttributeUnique: uniqueIndex("variant_attribute_unique_idx").on(
			table.variantId,
			table.attributeDefinitionId,
			table.valueText,
			table.valueNumber,
			table.valueBoolean,
			table.unit,
			table.source,
		),
		variantIdIdx: index("variant_attribute_variant_idx").on(table.variantId),
	}),
);

export const variantAttributeRelations = relations(
	variantAttribute,
	({ one }) => ({
		variant: one(productVariant, {
			fields: [variantAttribute.variantId],
			references: [productVariant.id],
		}),
		attribute: one(attributeDefinition, {
			fields: [variantAttribute.attributeDefinitionId],
			references: [attributeDefinition.id],
		}),
	}),
);
