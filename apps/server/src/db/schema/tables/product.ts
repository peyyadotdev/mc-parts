import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const product = pgTable("product", {
	id: uuid("id").primaryKey().defaultRandom(),
	brandId: uuid("brand_id"),
	name: text("name").notNull(),
	slug: text("slug"),
	description: text("description"),
	status: text("status").default("active"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
