import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

// Pages table for CMS content
export const pages = pgTable(
	"pages",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		// Basic info
		title: text("title").notNull(),
		slug: text("slug").notNull().unique(),

		// Content
		content: text("content"),
		excerpt: text("excerpt"),

		// Page type
		page_type: text("page_type").default("page"), // 'page', 'startpage', 'landing', 'article', etc.
		template: text("template"),

		// SEO
		meta_title: text("meta_title"),
		meta_description: text("meta_description"),
		meta_keywords: text("meta_keywords"),
		og_title: text("og_title"),
		og_description: text("og_description"),
		og_image: text("og_image"),

		// Status
		status: text("status").default("draft"), // 'draft', 'published', 'archived'
		is_homepage: boolean("is_homepage").default(false),

		// Navigation
		show_in_menu: boolean("show_in_menu").default(false),
		menu_order: integer("menu_order").default(0),
		parent_id: integer("parent_id").references(() => pages.id, {
			onDelete: "set null",
		}),

		// Permissions
		is_public: boolean("is_public").default(true),
		requires_auth: boolean("requires_auth").default(false),

		// Publishing
		published_at: timestamp("published_at", { withTimezone: true }),
		published_by: integer("published_by"),

		// Metadata
		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		created_by: integer("created_by"),
		updated_by: integer("updated_by"),
	},
	(table) => ({
		slugIdx: unique("page_slug_unique").on(table.slug),
		statusIdx: index("page_status_idx").on(table.status),
		pageTypeIdx: index("page_type_idx").on(table.page_type),
		parentIdx: index("page_parent_idx").on(table.parent_id),
		menuOrderIdx: index("page_menu_order_idx").on(table.menu_order),
		publishedAtIdx: index("page_published_at_idx").on(table.published_at),
	}),
);

// Page Blocks table for modular content
export const page_blocks = pgTable(
	"page_blocks",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		page_id: integer("page_id")
			.notNull()
			.references(() => pages.id, { onDelete: "cascade" }),

		// Block info
		block_type: text("block_type").notNull(), // 'hero', 'text', 'image', 'gallery', 'products', etc.
		title: text("title"),

		// Content
		content: jsonb("content"), // Flexible JSON content based on block type

		// Display
		position: integer("position").default(0),
		is_visible: boolean("is_visible").default(true),

		// Styling
		css_class: text("css_class"),
		custom_css: text("custom_css"),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		pageIdx: index("block_page_idx").on(table.page_id),
		typeIdx: index("block_type_idx").on(table.block_type),
		positionIdx: index("block_position_idx").on(table.position),
	}),
);

// Menus table
export const menus = pgTable(
	"menus",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		description: text("description"),
		location: text("location"), // 'header', 'footer', 'sidebar', etc.

		is_active: boolean("is_active").default(true),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		slugIdx: unique("menu_slug_unique").on(table.slug),
		locationIdx: index("menu_location_idx").on(table.location),
	}),
);

// Menu Items table
export const menu_items = pgTable(
	"menu_items",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		menu_id: integer("menu_id")
			.notNull()
			.references(() => menus.id, { onDelete: "cascade" }),
		parent_id: integer("parent_id").references(() => menu_items.id, {
			onDelete: "cascade",
		}),

		// Link details
		title: text("title").notNull(),
		url: text("url"),

		// Link type
		link_type: text("link_type").default("custom"), // 'custom', 'page', 'category', 'product'
		linked_id: integer("linked_id"), // ID of linked entity (page_id, category_id, etc.)

		// Display
		position: integer("position").default(0),
		is_visible: boolean("is_visible").default(true),
		open_in_new_tab: boolean("open_in_new_tab").default(false),

		// Styling
		css_class: text("css_class"),
		icon: text("icon"),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		menuIdx: index("menu_item_menu_idx").on(table.menu_id),
		parentIdx: index("menu_item_parent_idx").on(table.parent_id),
		positionIdx: index("menu_item_position_idx").on(table.position),
	}),
);

// Banners/Sliders table
export const banners = pgTable(
	"banners",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		// Basic info
		name: text("name").notNull(),
		banner_type: text("banner_type").default("banner"), // 'banner', 'slider', 'popup', 'notification'

		// Content
		title: text("title"),
		subtitle: text("subtitle"),
		content: text("content"),

		// Images
		image_url: text("image_url"),
		mobile_image_url: text("mobile_image_url"),

		// Link
		link_url: text("link_url"),
		link_text: text("link_text"),
		open_in_new_tab: boolean("open_in_new_tab").default(false),

		// Display settings
		position: text("position"), // 'top', 'bottom', 'popup', specific page positions
		display_on: text("display_on"), // 'all', 'homepage', 'specific_pages'
		display_pages: text("display_pages").array(), // Array of page slugs

		// Scheduling
		is_active: boolean("is_active").default(true),
		start_date: timestamp("start_date", { withTimezone: true }),
		end_date: timestamp("end_date", { withTimezone: true }),

		// Styling
		css_class: text("css_class"),
		custom_css: text("custom_css"),

		// Tracking
		impressions: integer("impressions").default(0),
		clicks: integer("clicks").default(0),

		created_at: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		typeIdx: index("banner_type_idx").on(table.banner_type),
		positionIdx: index("banner_position_idx").on(table.position),
		activeIdx: index("banner_active_idx").on(table.is_active),
		startDateIdx: index("banner_start_date_idx").on(table.start_date),
		endDateIdx: index("banner_end_date_idx").on(table.end_date),
	}),
);

// System Configuration for headless/system endpoint
export const system_config = pgTable("system_config", {
	id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

	// Store info
	store_name: text("store_name"),
	store_url: text("store_url"),
	store_email: text("store_email"),
	store_phone: text("store_phone"),

	// Company info
	company_name: text("company_name"),
	company_address: text("company_address"),
	company_postcode: text("company_postcode"),
	company_city: text("company_city"),
	company_country: text("company_country"),
	company_vat_number: text("company_vat_number"),
	company_registration_number: text("company_registration_number"),

	// Default settings
	default_currency_id: integer("default_currency_id"),
	default_locale: text("default_locale"),
	default_timezone: text("default_timezone"),

	// Feature flags
	features: jsonb("features"),

	// Social media
	social_facebook: text("social_facebook"),
	social_instagram: text("social_instagram"),
	social_twitter: text("social_twitter"),
	social_youtube: text("social_youtube"),
	social_linkedin: text("social_linkedin"),

	// Analytics
	google_analytics_id: text("google_analytics_id"),
	facebook_pixel_id: text("facebook_pixel_id"),

	// Email settings
	email_from_name: text("email_from_name"),
	email_from_address: text("email_from_address"),

	// API settings
	api_rate_limit: integer("api_rate_limit"),
	webhook_secret: text("webhook_secret"),

	created_at: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
