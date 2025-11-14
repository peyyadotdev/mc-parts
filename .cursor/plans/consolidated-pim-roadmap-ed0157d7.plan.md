<!-- ed0157d7-8c5f-40eb-8907-6ba324817360 0b74f18c-17ce-46e4-b936-37de981b2edf -->
# Consolidated PIM Roadmap

## Phase 0 – Baseline & Environment

- **inventory-existing**: Catalogue current Drizzle tables and TRPC routes; log gaps versus desired PIM features.

- **env-alignment**: Confirm Supabase connectivity (DATABASE_URL), run migrations, seed minimal demo data (brand, product, variant, fitment) for UI smoke tests.

- **ui-diagnostic**: Run apps/web locally, capture current behaviour/screenshots to lock the baseline.

## Phase 1 – Core Schema & CRUD Scaffolding

- **schema-enrichment**: Add tables for product_enrichment, attribute_definition, attribute_template, brand_alias, brand_metadata; ship Drizzle migrations + seed utilities.

- **api-foundation**: Expose CRUD routes in apps/server for the new entities (list/create/update/delete) using tRPC.

- **ui-foundation**: Extend apps/web with simple tables/forms (shadcn + TanStack + React Hook Form) so operators can manage brand aliases, attribute definitions, enrichment stubs.

## Phase 2 – Attribute Templates & Validation Loop

- **template-editor**: Build UI to compose templates (fields, data types, units, required flags) and assign them to categories/product types.

- **validation-layer**: Harden import/update logic so product_variant.attributes must conform to assigned templates; surface validation state via TRPC + UI badges/filters.

- **brand-normalization**: Implement alias matching script + review UI (flagged products, approve/override, bulk actions).

## Phase 3 – Content Authoring & Preview

- **markdown-storage**: Store markdown + front-matter in product_enrichment (JSONB) while prepping Payload; parse with Gray

### To-dos

- [ ] Catalog current schema and tRPC behavior against PIM requirements
- [ ] Ensure local Supabase connection and seed baseline demo data
- [ ] Review existing admin UI in apps/web with sample data
- [ ] Add enrichment- and attribute-related tables via Drizzle migrations (product_enrichment, attribute_definition, attribute_template, brand_alias, brand_metadata)
- [ ] Create Drizzle seed utilities for new tables
- [ ] Expose CRUD tRPC routes for product_enrichment (list/create/update/delete)
- [ ] Expose CRUD tRPC routes for attribute_definition (list/create/update/delete)
- [ ] Expose CRUD tRPC routes for attribute_template (list/create/update/delete)
- [ ] Expose CRUD tRPC routes for brand_alias (list/create/update/delete)
- [ ] Expose CRUD tRPC routes for brand_metadata (list/create/update/delete)
- [ ] Build admin table/form for brand aliases management in apps/web
- [ ] Build admin table/form for attribute definitions management in apps/web
- [ ] Build admin table/form for attribute templates management in apps/web
- [ ] Build admin table/form for product enrichment stubs management in apps/web
- [ ] Implement UI to compose attribute templates (fields, data types, units, required flags)
- [ ] Implement UI to assign templates to categories/product types
- [ ] Enforce template validation in product variant import logic
- [ ] Enforce template validation in product variant update logic
- [ ] Surface validation state via TRPC responses (validation errors, warnings)
- [ ] Add UI badges/filters to show validation status in product grid
- [ ] Implement brand alias matching script/algorithm
- [ ] Build review UI for flagged products with brand mismatches
- [ ] Add approve/override actions in brand normalization UI
- [ ] Add bulk actions for brand normalization (bulk approve, bulk override)
- [ ] Store markdown + front-matter in product_enrichment JSONB column
- [ ] Integrate Gray Matter parsing in server for front-matter extraction
- [ ] Add markdown editor component in admin UI (textarea or code editor)
- [ ] Add markdown preview component in admin UI
- [ ] Add front-matter form fields in admin UI (YAML editor or structured form)
- [ ] Add Zod validation for front-matter schema
- [ ] Implement markdown→HTML renderer (server-side)
- [ ] Implement dynamic placeholder injection (price, stock, availability) in renderer
- [ ] Add product detail preview route/page showing rendered HTML
- [ ] Scaffold Payload CMS service (new workspace/app)
- [ ] Configure Payload to connect to Supabase database
- [ ] Align Payload collection schemas with Drizzle types (shared types or adapters)
- [ ] Create Payload collections for product_enrichment
- [ ] Create Payload collections for attribute templates
- [ ] Build sync adapter/webhook to sync Payload edits back to PIM tables
- [ ] Build worker polling mechanism as alternative sync method
- [ ] Scaffold worker app (apps/worker or similar)
- [ ] Integrate BullMQ in worker app
- [ ] Create BullMQ job for product variant imports
- [ ] Create BullMQ job for enrichment syncs
- [ ] Create BullMQ job for fitment updates
- [ ] Build queue status panel in admin UI (job list, status, progress)
- [ ] Add Trigger.dev integration for scheduled jobs (optional)
- [ ] Create scheduled job for nightly syncs
- [ ] Create scheduled job for QA reports
- [ ] Implement Postgres trigram search endpoint in tRPC
- [ ] Add search filters for brand in search endpoint
- [ ] Add search filters for template status in search endpoint
- [ ] Wire search endpoint into product grid in admin UI
- [ ] Set up MeiliSearch instance/service
- [ ] Create MeiliSearch indexer that feeds from PIM data
- [ ] Build MeiliSearch search endpoint in tRPC
- [ ] Add UI toggle to switch between Postgres and MeiliSearch backends
- [ ] Build reporting dashboard component (TanStack Table/Charts)
- [ ] Add enrichment coverage metrics to dashboard
- [ ] Add attribute completeness metrics to dashboard
- [ ] Add brand normalization progress metrics to dashboard
- [ ] Install and configure Pino logger in server app
- [ ] Install and configure Pino logger in worker app
- [ ] Set up Axiom account/project
- [ ] Configure Pino to send logs to Axiom
- [ ] Create Axiom dashboards for sync failures
- [ ] Create Axiom dashboards for validation errors
- [ ] Configure Axiom alerts for critical errors
- [ ] Add Vitest unit tests for schema validation
- [ ] Add Vitest unit tests for markdown renderer
- [ ] Add Vitest unit tests for template enforcement
- [ ] Add Vitest integration tests for CRUD operations
- [ ] Add Playwright smoke tests for brand alias management
- [ ] Add Playwright smoke tests for attribute template creation
- [ ] Add Playwright smoke tests for enrichment authoring workflow
- [ ] Document content workflow in apps/fumadocs
- [ ] Document sync operations in apps/fumadocs
- [ ] Document troubleshooting guide in apps/fumadocs
- [ ] Define Vercel deployment process for Next.js apps
- [ ] Define Payload deployment process
- [ ] Create GitHub Actions pipeline for linting
- [ ] Create GitHub Actions pipeline for running tests
- [ ] Create GitHub Actions pipeline for running migrations
- [ ] Create GitHub Actions pipeline for content validation
- [ ] Create pilot release checklist/UAT checklist