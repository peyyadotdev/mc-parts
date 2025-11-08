import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { purchaseStatusEnum } from "./enums";

// Purchases table (for purchase orders to suppliers)
export const purchases = pgTable(
	"purchases",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		external_id: text("external_id"),

		// Status
		status: purchaseStatusEnum("status").notNull().default("pending"),

		// Supplier
		supplier_id: integer("supplier_id").notNull(),

		// Currency
		currency_id: integer("currency_id").notNull(),
		currency_iso: text("currency_iso").notNull(),

		// Reference numbers
		purchase_order_number: text("purchase_order_number"),
		supplier_reference: text("supplier_reference"),

		// Notes
		internal_note: text("internal_note"),
		supplier_note: text("supplier_note"),

		// Dates
		delivery_date: date("delivery_date"),
		ordered_at: timestamp("ordered_at", { withTimezone: true }),
		confirmed_at: timestamp("confirmed_at", { withTimezone: true }),
		delivered_at: timestamp("delivered_at", { withTimezone: true }),
		canceled_at: timestamp("canceled_at", { withTimezone: true }),

		// Totals
		total_amount: integer("total_amount"), // in cents
		total_amount_ex_vat: integer("total_amount_ex_vat"), // in cents

		// Timestamps
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		statusIdx: index("purchase_status_idx").on(table.status),
		supplierIdx: index("purchase_supplier_idx").on(table.supplier_id),
		orderNumberIdx: index("purchase_order_number_idx").on(
			table.purchase_order_number,
		),
		deliveryDateIdx: index("purchase_delivery_date_idx").on(
			table.delivery_date,
		),
		createdAtIdx: index("purchase_created_at_idx").on(table.created_at),
		orderedAtIdx: index("purchase_ordered_at_idx").on(table.ordered_at),
		deliveredAtIdx: index("purchase_delivered_at_idx").on(table.delivered_at),
	}),
);

// Purchase Items table
export const purchase_items = pgTable(
	"purchase_items",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		purchase_id: integer("purchase_id").notNull(),

		// Product/Variant reference
		variant_id: integer("variant_id"),

		// Item details
		sku: text("sku").notNull(),
		supplier_sku: text("supplier_sku"),
		name: text("name"),
		description: text("description"),

		// Quantity
		quantity_ordered: numeric("quantity_ordered", {
			precision: 10,
			scale: 2,
		}).notNull(),
		quantity_received: numeric("quantity_received", {
			precision: 10,
			scale: 2,
		}).default("0"),
		unit: text("unit").default("pcs"),

		// Pricing
		unit_price: integer("unit_price").notNull(), // in cents
		total_amount: integer("total_amount").notNull(), // in cents
		vat_rate: integer("vat_rate"),

		// Status
		is_received: boolean("is_received").default(false),
		received_at: timestamp("received_at", { withTimezone: true }),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		purchaseIdx: index("purchase_item_purchase_idx").on(table.purchase_id),
		variantIdx: index("purchase_item_variant_idx").on(table.variant_id),
		skuIdx: index("purchase_item_sku_idx").on(table.sku),
		receivedIdx: index("purchase_item_received_idx").on(table.is_received),
	}),
);

// Purchase Receipts table (for tracking received shipments)
export const purchase_receipts = pgTable(
	"purchase_receipts",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		purchase_id: integer("purchase_id").notNull(),

		receipt_number: text("receipt_number"),
		tracking_number: text("tracking_number"),

		// Receipt details
		received_by: text("received_by"),
		notes: text("notes"),

		// Documents
		document_path: text("document_path"),

		received_at: timestamp("received_at", { withTimezone: true }).notNull(),
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		purchaseIdx: index("purchase_receipt_purchase_idx").on(table.purchase_id),
		receiptNumberIdx: index("purchase_receipt_number_idx").on(
			table.receipt_number,
		),
	}),
);

// Purchase Receipt Items table
export const purchase_receipt_items = pgTable(
	"purchase_receipt_items",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		receipt_id: integer("receipt_id").notNull(),
		purchase_item_id: integer("purchase_item_id").notNull(),

		quantity_received: numeric("quantity_received", {
			precision: 10,
			scale: 2,
		}).notNull(),

		// Quality control
		quantity_accepted: numeric("quantity_accepted", {
			precision: 10,
			scale: 2,
		}),
		quantity_rejected: numeric("quantity_rejected", {
			precision: 10,
			scale: 2,
		}),
		rejection_reason: text("rejection_reason"),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		receiptIdx: index("receipt_item_receipt_idx").on(table.receipt_id),
		purchaseItemIdx: index("receipt_item_purchase_item_idx").on(
			table.purchase_item_id,
		),
	}),
);
