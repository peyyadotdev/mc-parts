import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const vehicleModel = pgTable("vehicle_model", {
	id: uuid("id").primaryKey().defaultRandom(),
	make: text("make"),
	model: text("model"),
	type: text("type"),
	yearFrom: integer("year_from"),
	yearTo: integer("year_to"),
	cc: integer("cc"),
	engine: text("engine"),
});
