import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { product } from "./product";

export const productEnrichment = pgTable("product_enrichment", {
	id: uuid("id").primaryKey().defaultRandom(),
	productId: uuid("product_id")
		.notNull()
		.references(() => product.id, { onDelete: "cascade" }),
	// Markdown content with front-matter stored as JSONB
	// Structure: { frontMatter: {...}, markdown: "...", renderedHtml: "..." }
	content: jsonb("content_jsonb").notNull(),
	// Validation state: 'draft' | 'valid' | 'invalid' | 'published'
	status: text("status").default("draft"),
	// Language code (ISO 639-1)
	language: text("language").default("en"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
