<!-- b4179e85-e4c1-4956-97c3-9bc1dfa5728f 99a12fd5-acf9-4fa7-93b2-f6dfa527c2b2 -->
# Product Enrichment Implementation Plan

## Scope & Attribute Taxonomy

- Consolidate universal and category-specific attributes from `data/nyehandel/ENRICHMENT-REPORT.md`, `enrichment-analysis.json`, and regex blueprints; expand with curated regex patterns for each attribute and document capture groups.
- Draft an attribute glossary (source vs derived fields, units, confidence rules) in `docs/product-enrichment.md`, including manufacturer/part-brand dictionaries and linkage rules.

## Data Modeling & Migrations

- Extend Drizzle schema with definition tables (`apps/server/src/db/schema/tables/attribute_definition.ts`, `variant_attribute.ts`) plus join helpers for category applicability; add migrations and seeds reflecting the taxonomy and brand/manufacturer registries.
- Update `productVariant` model & Drizzle relations to coexist with legacy `attributes_jsonb` while new tables backfill and eventually replace it.

## Attribute Templates & Master Catalogs

- Compile part-brand master list and vehicle make/model catalog from Nyehandel data and external sources; normalize naming and map to internal IDs.
- Define attribute templates per product family (e.g., `Förgasare`, `Kedjor`, `Cylinder`) with required/optional fields, units, and validation rules; merge into a deduplicated master attribute registry.

## Extraction Engine & Tooling

- Refactor `apps/server/src/scripts/extract-product-attributes.ts` into a reusable service module under `apps/server/src/services/attributeExtraction/` with regex/NLP rules from the analysis, batching, and conflict resolution against manual entries.
- Enhance `apps/server/src/scripts/test-attribute-extraction.ts` to call the service, run on sample exports (`data/nyehandel/sample-2025-11-11/*`), log precision/recall metrics, and emit HTML/MD reports for QA.

## External Data & AI Augmentation

- Implement internet enrichment adapters (scraping/API) to fetch missing specs using brand/model lookups, with caching and provenance tracking.
- Integrate AI pipeline that first retrieves similar product/category descriptions from the knowledge base, then applies delta edits; persist AI memory of canonical copy and log changes for review.

## API & Workflow Integration

- Add tRPC procedures in `apps/server/src/routers/index.ts` for listing attribute definitions, triggering extraction jobs, managing AI-generated content, and persisting reviewed values (including confidence + provenance metadata).
- Wire backend jobs into Bun task runner (e.g. `bun run extract:attributes`) with idempotent pagination so nightly enrichment can target delta products and invoke external/AI augmentation when gaps remain.

## Admin UI & Review Experience

- Build out `apps/web/src/app/attributes/page.tsx` to support attribute detail panels, edit forms bound to new endpoints, bulk actions, and status filters (manual vs extracted, missing critical attributes).
- Surface confidence badges, source icons (manual/regex/AI/external), change history, and quick-fix helpers using ShadCN components and virtualized tables for large result sets.

## Rollout, Monitoring & Ops

- Define test coverage (`apps/server/src/__tests__/attribute-extraction.test.ts`) with fixtures from sample data, asserting extraction accuracy and API contracts.
- Instrument job runs with logging/metrics (e.g., per-attribute success rate, AI modification rate) and document operational playbooks in `docs/product-enrichment.md` before moving to production.

### To-dos

- [x] Finalize attribute taxonomy and glossary from Nyehandel analysis outputs
- [x] Design and apply schema migrations introducing attribute definition/value tables
- [x] Refactor extraction script into service with tests and reporting
- [x] Expose enrichment APIs via tRPC and build admin review UI
- [x] Add automated tests, job instrumentation, and deployment playbook