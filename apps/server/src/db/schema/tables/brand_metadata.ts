import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { brand } from "./brand";

export const brandMetadata = pgTable("brand_metadata", {
	id: uuid("id").primaryKey().defaultRandom(),
	brandId: uuid("brand_id")
		.notNull()
		.references(() => brand.id, { onDelete: "cascade" })
		.unique(),
	// Logo URL
	logoUrl: text("logo_url"),
	// Description
	description: text("description"),
	// Website URL
	websiteUrl: text("website_url"),
	// Additional metadata as JSONB
	metadata: jsonb("metadata_jsonb"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
