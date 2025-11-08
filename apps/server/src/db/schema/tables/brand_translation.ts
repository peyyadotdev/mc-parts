import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const brandTranslation = pgTable(
	"brand_translation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		brandId: uuid("brand_id").notNull(),
		languageCode: text("language_code").notNull(),
		name: text("name"),
		description: text("description"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
	(t) => ({
		brandLangUnique: unique().on(t.brandId, t.languageCode),
	}),
);
