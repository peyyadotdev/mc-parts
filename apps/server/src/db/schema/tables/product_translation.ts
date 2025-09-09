import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const productTranslation = pgTable(
	"product_translation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		productId: uuid("product_id").notNull(),
		languageCode: text("language_code").notNull(),
		name: text("name"),
		description: text("description"),
		seoTitle: text("seo_title"),
		seoDescription: text("seo_description"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
	(t) => ({
		productLangUnique: unique().on(t.productId, t.languageCode),
	}),
);
