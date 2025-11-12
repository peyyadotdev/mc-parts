import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { variantAttribute } from "./variant_attribute";

export const productVariant = pgTable(
	"product_variant",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		productId: uuid("product_id").notNull(),
		sku: text("sku").notNull(),
		gtin: text("gtin"),
		oemPartNumber: text("oem_part_number"),
		attributes: jsonb("attributes_jsonb"),
		priceCents: integer("price_cents"),
		currency: text("currency"),
		stockQty: integer("stock_qty"),
		status: boolean("status").default(true),
		weightGrams: integer("weight_grams"),
		dimensions: jsonb("dimensions"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => ({
		skuUnique: uniqueIndex("product_variant_sku_unique").on(t.sku),
		gtinUnique: uniqueIndex("product_variant_gtin_unique").on(t.gtin),
	}),
);

export const productVariantRelations = relations(productVariant, ({ many }) => ({
	attributes: many(variantAttribute),
}));
