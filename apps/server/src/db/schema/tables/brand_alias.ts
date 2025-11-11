import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { brand } from "./brand";

export const brandAlias = pgTable("brand_alias", {
	id: uuid("id").primaryKey().defaultRandom(),
	brandId: uuid("brand_id")
		.notNull()
		.references(() => brand.id, { onDelete: "cascade" }),
	// The alias/variant name (e.g., "BMW", "B.M.W.", "Bayerische Motoren Werke")
	alias: text("alias").notNull(),
	// Confidence level or source: 'manual' | 'auto' | 'reviewed' | 'approved'
	status: text("status").default("auto"),
	// Priority/weight for matching (higher = more preferred)
	priority: text("priority").default("0"), // numeric string
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
