import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

export const productFitment = pgTable(
	"product_fitment",
	{
		variantId: uuid("variant_id").notNull(),
		vehicleModelId: uuid("vehicle_model_id").notNull(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.variantId, t.vehicleModelId] }),
	}),
);
