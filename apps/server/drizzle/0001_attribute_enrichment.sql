CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attribute_scope') THEN
		CREATE TYPE "attribute_scope" AS ENUM ('universal', 'category');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attribute_data_type') THEN
		CREATE TYPE "attribute_data_type" AS ENUM ('string', 'number', 'boolean', 'enum', 'multi_enum');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attribute_importance') THEN
		CREATE TYPE "attribute_importance" AS ENUM ('critical', 'high', 'medium', 'low');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attribute_source') THEN
		CREATE TYPE "attribute_source" AS ENUM ('manual', 'extracted', 'external', 'ai');
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrichment_brand_type') THEN
		CREATE TYPE "enrichment_brand_type" AS ENUM ('oem', 'manufacturer');
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS "attribute_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"scope" "attribute_scope" NOT NULL,
	"data_type" "attribute_data_type" NOT NULL,
	"importance" "attribute_importance" NOT NULL,
	"unit" text,
	"default_confidence" numeric(4, 2),
	"source_fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"derived_from" jsonb DEFAULT '[]'::jsonb,
	"extraction_rules" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"enum_values" jsonb,
	"validations" jsonb,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definition_slug_unique" ON "attribute_definition" ("slug");

CREATE TABLE IF NOT EXISTS "attribute_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"attribute_definition_id" uuid NOT NULL REFERENCES "attribute_definition"("id") ON DELETE CASCADE,
	"category_key" text NOT NULL,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "attribute_category_unique_idx"
	ON "attribute_category" ("attribute_definition_id", "category_key");

CREATE TABLE IF NOT EXISTS "variant_attribute" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"variant_id" uuid NOT NULL REFERENCES "product_variant"("id") ON DELETE CASCADE,
	"attribute_definition_id" uuid NOT NULL REFERENCES "attribute_definition"("id") ON DELETE CASCADE,
	"value_text" text,
	"value_number" double precision,
	"value_boolean" boolean,
	"value_json" jsonb,
	"unit" text,
	"confidence" numeric(4, 3) NOT NULL DEFAULT 0,
	"source" "attribute_source" NOT NULL DEFAULT 'extracted',
	"source_fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"extracted_at" timestamptz,
	"provenance" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "variant_attribute_unique_idx"
	ON "variant_attribute" (
		"variant_id",
		"attribute_definition_id",
		"value_text",
		"value_number",
		"value_boolean",
		"unit",
		"source"
	);

CREATE INDEX IF NOT EXISTS "variant_attribute_variant_idx"
	ON "variant_attribute" ("variant_id");

CREATE TABLE IF NOT EXISTS "enrichment_brand_dictionary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" "enrichment_brand_type" NOT NULL,
	"canonical" text NOT NULL,
	"make" text,
	"synonyms" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"sources" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"notes" text,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "enrichment_brand_dictionary_type_canonical_unique"
	ON "enrichment_brand_dictionary" ("type", "canonical");

CREATE TABLE IF NOT EXISTS "enrichment_model_dictionary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"raw" text NOT NULL,
	"canonical_model" text NOT NULL,
	"make" text NOT NULL,
	"source" text NOT NULL,
	"external_vehicle_model_slug" text,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "enrichment_model_dictionary_raw_make_unique"
	ON "enrichment_model_dictionary" ("raw", "make");

CREATE INDEX IF NOT EXISTS "enrichment_model_dictionary_canonical_idx"
	ON "enrichment_model_dictionary" ("canonical_model");

CREATE TABLE IF NOT EXISTS "enrichment_compatibility_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"brand_slug" text NOT NULL,
	"model_slugs" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"make_column" text NOT NULL DEFAULT 'make',
	"model_column" text NOT NULL DEFAULT 'model',
	"conditions" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "enrichment_compatibility_rule_brand_unique"
	ON "enrichment_compatibility_rule" ("brand_slug");
