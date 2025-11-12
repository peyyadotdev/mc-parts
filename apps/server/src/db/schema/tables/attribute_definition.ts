import { relations, sql } from "drizzle-orm";
import {
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { attributeCategory } from "./attribute_category";
import { variantAttribute } from "./variant_attribute";

export const attributeScopeEnum = pgEnum("attribute_scope", [
	"universal",
	"category",
]);

export const attributeDataTypeEnum = pgEnum("attribute_data_type", [
	"string",
	"number",
	"boolean",
	"enum",
	"multi_enum",
]);

export const attributeImportanceEnum = pgEnum("attribute_importance", [
	"critical",
	"high",
	"medium",
	"low",
]);

export const attributeDefinition = pgTable(
	"attribute_definition",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: text("slug").notNull(),
		label: text("label").notNull(),
		description: text("description"),
		scope: attributeScopeEnum("scope").notNull(),
		dataType: attributeDataTypeEnum("data_type").notNull(),
		importance: attributeImportanceEnum("importance").notNull(),
		unit: text("unit"),
		defaultConfidence: numeric("default_confidence", { precision: 4, scale: 2 }),
		sourceFields: jsonb("source_fields")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		derivedFrom: jsonb("derived_from")
			.$type<string[]>()
			.default(sql`'[]'::jsonb`),
		extractionRules: jsonb("extraction_rules")
			.$type<
				Array<{
					name: string;
					pattern: string;
					flags?: string;
					captureGroup?: string;
					unitCaptureGroup?: string;
					description?: string;
					examples?: string[];
					normalise?: "uppercase" | "lowercase" | "titlecase" | "numeric";
				}>
			>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		enumValues: jsonb("enum_values"),
		validations: jsonb("validations"),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		slugIndex: uniqueIndex("attribute_definition_slug_unique").on(table.slug),
	}),
);

export const attributeDefinitionRelations = relations(
	attributeDefinition,
	({ many }) => ({
		categories: many(attributeCategory),
		variantValues: many(variantAttribute),
	}),
);
