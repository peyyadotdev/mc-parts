import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const attributeDefinition = pgTable("attribute_definition", {
	id: uuid("id").primaryKey().defaultRandom(),
	// Unique key for the attribute (e.g., "weight", "color", "material")
	key: text("key").notNull().unique(),
	// Display name
	name: text("name").notNull(),
	// Data type: 'string' | 'number' | 'boolean' | 'date' | 'enum'
	dataType: text("data_type").notNull(),
	// Unit of measurement (optional, e.g., "kg", "cm", "mm")
	unit: text("unit"),
	// Default value (optional)
	defaultValue: text("default_value"),
	// Enum values (JSON array, if dataType is 'enum')
	enumValues: text("enum_values"), // JSON string array
	// Description/help text
	description: text("description"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
