import {
	integer,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const variantPrice = pgTable(
	"variant_price",
	{
		variantId: uuid("variant_id").notNull(),
		priceListId: uuid("price_list_id").notNull(),
		amountCents: integer("amount_cents").notNull(),
		compareAtCents: integer("compare_at_cents"),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
		taxClass: uuid("tax_class"),
	},
	(t) => ({
		pk: primaryKey({
			columns: [t.variantId, t.priceListId],
		}),
	}),
);
