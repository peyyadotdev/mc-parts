import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const brand = pgTable("brand", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	slug: text("slug").unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
