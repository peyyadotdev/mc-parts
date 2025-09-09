import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

export const productCategory = pgTable(
	"product_category",
	{
		productId: uuid("product_id").notNull(),
		categoryId: uuid("category_id").notNull(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.productId, t.categoryId] }),
	}),
);
