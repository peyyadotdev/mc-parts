import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const importSession = pgTable("import_session", {
	id: uuid("id").primaryKey().defaultRandom(),
	fileName: text("file_name").notNull(),
	fileHash: text("file_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	status: text("status").default("pending"),
});

export const importRow = pgTable("import_row", {
	id: uuid("id").primaryKey().defaultRandom(),
	sessionId: uuid("session_id").notNull(),
	rowIndex: integer("row_index").notNull(),
	raw: jsonb("raw").notNull(),
	mapped: jsonb("mapped"),
	status: text("status").default("raw"),
	errors: jsonb("errors"),
	dedupeKey: text("dedupe_key"),
});
