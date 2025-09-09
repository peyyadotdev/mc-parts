import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const category = pgTable("category", {
	id: uuid("id").primaryKey().defaultRandom(),
	parentId: uuid("parent_id"),
	name: text("name").notNull(),
	slug: text("slug"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
