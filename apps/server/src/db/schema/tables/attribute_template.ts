import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { category } from "./category";

export const attributeTemplate = pgTable("attribute_template", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	// Category ID (optional - templates can be assigned to categories)
	categoryId: uuid("category_id").references(() => category.id, {
		onDelete: "set null",
	}),
	// Array of attribute definition IDs that are required
	requiredAttributeIds: jsonb("required_attribute_ids"), // JSON array of UUIDs
	// Array of attribute definition IDs that are optional
	optionalAttributeIds: jsonb("optional_attribute_ids"), // JSON array of UUIDs
	// Is this template active?
	isActive: text("is_active").default("true"), // 'true' | 'false'
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
