import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { customers } from "./customer";
import { itemTypeEnum, orderStatusEnum } from "./enums";

// Orders table
export const orders = pgTable(
	"orders",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		external_id: text("external_id"),

		// Status
		status: orderStatusEnum("status").notNull().default("open"),

		// Customer
		customer_id: integer("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "restrict" }),
		user_id: integer("user_id"), // If connected to a user account

		// Currency and locale
		currency_id: integer("currency_id").notNull(), // FK removed to avoid schema mismatch
		currency_iso: text("currency_iso").notNull(), // Store ISO code for reference
		locale: text("locale"), // e.g., "sv_SE"

		// Messages and notes
		checkout_message: text("checkout_message"),
		warehouse_note: text("warehouse_note"),
		reference: text("reference"),
		marking: text("marking"),

		// Pickup location
		pickup_location_id: integer("pickup_location_id"),

		// Dates
		delivery_date: date("delivery_date"),
		shipped_at: timestamp("shipped_at", { withTimezone: true }),
		canceled_at: timestamp("canceled_at", { withTimezone: true }),

		// Timestamps
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		api_created_at: timestamp("api_created_at", { withTimezone: true }),
		api_updated_at: timestamp("api_updated_at", { withTimezone: true }),
	},
	(table) => ({
		statusIdx: index("order_status_idx").on(table.status),
		customerIdx: index("order_customer_idx").on(table.customer_id),
		currencyIdx: index("order_currency_idx").on(table.currency_id),
		createdAtIdx: index("order_created_at_idx").on(table.created_at),
		shippedAtIdx: index("order_shipped_at_idx").on(table.shipped_at),
		deliveryDateIdx: index("order_delivery_date_idx").on(table.delivery_date),
		externalIdIdx: index("order_external_id_idx").on(table.external_id),
	}),
);

// Order Addresses table (billing and shipping)
export const order_addresses = pgTable(
	"order_addresses",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		order_id: integer("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		address_type: text("address_type").notNull(), // 'billing' or 'shipping'

		// Name info
		firstname: text("firstname"),
		lastname: text("lastname"),
		company_name: text("company_name"),

		// Address fields
		address: text("address"),
		address2: text("address2"),
		co_address: text("co_address"),
		postcode: text("postcode"),
		city: text("city"),
		state: text("state"),
		country: text("country"), // 2 letter ISO code

		// Business info
		vat_number: text("vat_number"),

		// Metadata
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orderIdx: index("order_address_order_idx").on(table.order_id),
		typeIdx: index("order_address_type_idx").on(table.address_type),
		uniqueOrderAddressType: unique("unique_order_address_type").on(
			table.order_id,
			table.address_type,
		),
	}),
);

// Order Items table
export const order_items = pgTable(
	"order_items",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		order_id: integer("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		parent_id: integer("parent_id").references(() => order_items.id, {
			onDelete: "cascade",
		}), // For sub-items

		// Product/Variant reference
		variant_id: integer("variant_id"), // FK removed to avoid schema mismatch

		// Item details
		sku: text("sku").notNull(),
		gtin: text("gtin"),
		name: text("name"),
		display_name: text("display_name"),
		type: itemTypeEnum("type").notNull().default("product"),

		// Quantity and units
		quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
		unit: text("unit").default("pcs"),

		// Pricing
		vat_rate: integer("vat_rate").notNull(),
		unit_price: integer("unit_price").notNull(), // in cents
		total_amount: integer("total_amount").notNull(), // in cents

		// Fulfillment
		is_dropship: boolean("is_dropship").default(false),
		storage_space: text("storage_space"),

		// Physical attributes
		weight: integer("weight"), // in grams
		net_weight: integer("net_weight"), // in grams

		// International trade
		hs_code: text("hs_code"),
		country_of_origin: text("country_of_origin"),

		// Supplier info
		supplier_sku: text("supplier_sku"),

		// URLs
		image_url: text("image_url"),
		variant_url: text("variant_url"),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orderIdx: index("order_item_order_idx").on(table.order_id),
		parentIdx: index("order_item_parent_idx").on(table.parent_id),
		variantIdx: index("order_item_variant_idx").on(table.variant_id),
		skuIdx: index("order_item_sku_idx").on(table.sku),
		typeIdx: index("order_item_type_idx").on(table.type),
	}),
);

// Order Item Metas table (for additional item metadata)
export const order_item_metas = pgTable(
	"order_item_metas",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		order_item_id: integer("order_item_id")
			.notNull()
			.references(() => order_items.id, { onDelete: "cascade" }),
		key: text("key").notNull(),
		value: text("value"),
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orderItemIdx: index("order_item_meta_item_idx").on(table.order_item_id),
		keyIdx: index("order_item_meta_key_idx").on(table.key),
	}),
);

// Order Shipping table
export const order_shipping = pgTable(
	"order_shipping",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		order_id: integer("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		// Method info
		shipping_method_id: integer("shipping_method_id"),
		name: text("name").notNull(),
		identifier: text("identifier"),

		// Pricing
		vat_rate: integer("vat_rate").notNull(),
		total_amount: integer("total_amount").notNull(), // in cents
		price_ex_vat: integer("price_ex_vat"), // in cents
		price_inc_vat: integer("price_inc_vat"), // in cents

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orderIdx: unique("unique_order_shipping").on(table.order_id),
	}),
);

// Order Payment table
export const order_payment = pgTable(
	"order_payment",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		order_id: integer("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		// Method info
		payment_method_id: integer("payment_method_id"),
		name: text("name").notNull(),

		// Pricing
		vat_rate: integer("vat_rate").notNull(),
		total_amount: integer("total_amount").notNull(), // in cents
		price_ex_vat: integer("price_ex_vat"), // in cents
		price_inc_vat: integer("price_inc_vat"), // in cents

		// Transaction info
		transaction_id: text("transaction_id"),
		payment_status: text("payment_status"),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orderIdx: unique("unique_order_payment").on(table.order_id),
		transactionIdx: index("order_payment_transaction_idx").on(
			table.transaction_id,
		),
	}),
);

// Order Parcels table (for tracking shipments)
export const order_parcels = pgTable(
	"order_parcels",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		order_id: integer("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		tracking_id: text("tracking_id").notNull(),
		tracking_url: text("tracking_url"),

		// Delivery status
		is_delivered: boolean("is_delivered").default(false),
		delivered_at: timestamp("delivered_at", { withTimezone: true }),

		// PDF documents
		pdf_path: text("pdf_path"),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orderIdx: index("order_parcel_order_idx").on(table.order_id),
		trackingIdx: index("order_parcel_tracking_idx").on(table.tracking_id),
	}),
);

// Delivery Notes table
export const delivery_notes = pgTable(
	"delivery_notes",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		order_id: integer("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		note_number: text("note_number"),
		pdf_path: text("pdf_path"),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		orderIdx: index("delivery_note_order_idx").on(table.order_id),
		noteNumberIdx: index("delivery_note_number_idx").on(table.note_number),
	}),
);

// Shipping Methods table
export const shipping_methods = pgTable(
	"shipping_methods",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		identifier: text("identifier"),
		name: text("name").notNull(),
		description: text("description"),

		// Default pricing
		default_price: integer("default_price"),
		default_vat_rate: integer("default_vat_rate"),

		// Configuration
		is_active: boolean("is_active").default(true),
		requires_address: boolean("requires_address").default(true),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		identifierIdx: index("shipping_method_identifier_idx").on(table.identifier),
	}),
);

// Payment Methods table
export const payment_methods = pgTable(
	"payment_methods",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		identifier: text("identifier"),
		name: text("name").notNull(),
		description: text("description"),

		// Default pricing
		default_price: integer("default_price"),
		default_vat_rate: integer("default_vat_rate"),

		// Configuration
		is_active: boolean("is_active").default(true),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		identifierIdx: index("payment_method_identifier_idx").on(table.identifier),
	}),
);
