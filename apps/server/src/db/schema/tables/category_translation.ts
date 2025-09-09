import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const categoryTranslation = pgTable(
	"category_translation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		categoryId: uuid("category_id").notNull(),
		languageCode: text("language_code").notNull(),
		name: text("name"),
		description: text("description"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
	(t) => ({
		categoryLangUnique: unique().on(t.categoryId, t.languageCode),
	}),
);
