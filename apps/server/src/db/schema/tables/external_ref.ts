import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const externalRef = pgTable(
	"external_ref",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		provider: text("provider").notNull(),
		storeIdentifier: text("store_identifier").notNull(),
		externalType: text("external_type").notNull(),
		externalId: text("external_id").notNull(),
		internalTable: text("internal_table").notNull(),
		internalId: uuid("internal_id").notNull(),
		payloadHash: text("payload_hash"),
		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
	},
	(t) => ({
		uniqExt: uniqueIndex("uniq_ext").on(
			t.provider,
			t.storeIdentifier,
			t.externalType,
			t.externalId,
		),
		uniqInt: uniqueIndex("uniq_int").on(
			t.provider,
			t.storeIdentifier,
			t.internalTable,
			t.internalId,
			t.externalType,
		),
	}),
);
