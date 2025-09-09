import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const priceList = pgTable("price_list", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	currency: text("currency").notNull(),
	includeVat: boolean("include_vat").default(true),
	externalRef: text("external_ref"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
