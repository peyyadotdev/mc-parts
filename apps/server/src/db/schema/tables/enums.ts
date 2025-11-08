import { pgEnum } from "drizzle-orm/pg-core";

// Order Status Enum
export const orderStatusEnum = pgEnum("order_status", [
	"open",
	"approved",
	"deliverable",
	"shipped",
	"partially-delivered",
	"canceled",
	"awaiting-delivery",
	"awaiting-payment",
	"backlisted",
	"external",
]);

// Customer Type Enum
export const customerTypeEnum = pgEnum("customer_type", [
	"person",
	"organization",
]);

// Product Status Enum
export const productStatusEnum = pgEnum("product_status", [
	"draft",
	"published",
	"inactive",
	"pending_retirement",
	"retired",
]);

// Product Type Enum
export const productTypeEnum = pgEnum("product_type", [
	"standard",
	"inventory_item",
	"pre_order_item",
]);

// Item Type Enum (for order items)
export const itemTypeEnum = pgEnum("item_type", [
	"product",
	"discount",
	"physical",
]);

// VAT Rate Enum
export const vatRateEnum = pgEnum("vat_rate", ["2500", "1200", "600", "0"]);

// Purchase Status Enum
export const purchaseStatusEnum = pgEnum("purchase_status", [
	"pending",
	"ordered",
	"confirmed",
	"delivered",
	"canceled",
]);

// Unit Type Enum
export const unitTypeEnum = pgEnum("unit_type", [
	"pcs",
	"kg",
	"l",
	"m",
	"m2",
	"m3",
]);
