import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { customerTypeEnum } from "./enums";

// Customers table
export const customers = pgTable(
	"customers",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		external_id: text("external_id"),
		customer_type: customerTypeEnum("customer_type").notNull(),

		// Personal/Business info
		firstname: text("firstname"),
		lastname: text("lastname"),
		email: text("email").notNull().unique(),
		invoice_email: text("invoice_email"),
		phone: text("phone"),
		ssn: text("ssn"), // Social Security Number
		organization_number: text("organization_number"),

		// Authentication
		password_hash: text("password_hash"),

		// Metadata
		is_active: boolean("is_active").default(true),
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
		emailIdx: index("customer_email_idx").on(table.email),
		typeIdx: index("customer_type_idx").on(table.customer_type),
		organizationNumberIdx: index("customer_org_number_idx").on(
			table.organization_number,
		),
		externalIdIdx: index("customer_external_id_idx").on(table.external_id),
	}),
);

// Customer Addresses table (normalized for billing and shipping)
export const customer_addresses = pgTable(
	"customer_addresses",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		customer_id: integer("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "cascade" }),
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
		is_default: boolean("is_default").default(false),
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		customerIdx: index("customer_address_customer_idx").on(table.customer_id),
		typeIdx: index("customer_address_type_idx").on(table.address_type),
		countryIdx: index("customer_address_country_idx").on(table.country),
		postcodeIdx: index("customer_address_postcode_idx").on(table.postcode),
	}),
);

// Customer Groups table (for pricing tiers)
export const customer_groups = pgTable("customer_groups", {
	id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
	name: text("name").notNull(),
	description: text("description"),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

// Customer to Customer Group mapping
export const customer_group_members = pgTable(
	"customer_group_members",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		customer_id: integer("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "cascade" }),
		customer_group_id: integer("customer_group_id")
			.notNull()
			.references(() => customer_groups.id, { onDelete: "cascade" }),
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		customerIdx: index("cgm_customer_idx").on(table.customer_id),
		groupIdx: index("cgm_group_idx").on(table.customer_group_id),
		uniqueCustomerGroup: unique("unique_customer_group").on(
			table.customer_id,
			table.customer_group_id,
		),
	}),
);
