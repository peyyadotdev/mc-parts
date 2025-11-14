<!-- b7ad2430-a6dc-40b0-bf25-83a1c97f1b02 daafab6c-f41e-4075-89f0-f868704e0bf1 -->
# Fitment UI Plan

## Goals

- Surface all vehicle fitment relationships (product ↔ variant ↔ model ↔ make) inside the admin UI so users can browse, filter, and manage them without raw SQL.

## Proposed Steps

1. **Fitment Data API**  

- Extend `[apps/server/src/routers/index.ts](apps/server/src/routers/index.ts)` with tRPC procedures for:
- `listProductFitments(productId)` returning enriched variant + vehicle model data.
- `listVehicleModelFitments(vehicleModelId)` returning linked products/variants.
- `listManufacturers()` aggregating vehicle makes and their models (reusing `vehicle_model` table).  
- Reuse existing joins encapsulated in helper functions under `[apps/server/src/lib/fitment.ts](apps/server/src/lib/fitment.ts)`.

2. **Shared Fitment Types**  

- Define DTOs/Zod schemas in `[packages/api/src/fitment.ts](packages/api/src/fitment.ts)` (or nearest shared package) so both server and web stay aligned: `FitmentVariantSummary`, `FitmentVehicleModel`, etc.

3. **Product Detail Tab**  

- In `[apps/web/src/app/products/[id]/page.tsx](apps/web/src/app/products/[id]/page.tsx)` (or equivalent detail page), add a “Fitment” panel:  
- Table grouped by variant → list linked vehicle models (`make`, `model`, `yearFrom`, `yearTo`).  
- Include column actions for removing/adding fitments (hooking into existing mutation endpoints if available).

4. **Vehicle Model Directory View**  

- Introduce a new route `[apps/web/src/app/fitment/models/page.tsx](apps/web/src/app/fitment/models/page.tsx)` with filters by manufacturer/moped model.  
- Use virtualized table or grouped list to display models and count of linked products.  
- Clicking a row shows linked SKUs/products (calls `listVehicleModelFitments`).

5. **Manufacturer Overview**  

- Add filterable list of makes at `[apps/web/src/app/fitment/manufacturers/page.tsx](apps/web/src/app/fitment/manufacturers/page.tsx)` summarizing model count and product count per make (from `listManufacturers`).  
- Provide drill-down to the model directory view with pre-applied filters.

6. **Variant Lookup Utility**  

- For operations teams, extend `[apps/web/src/app/attributes/page.tsx](apps/web/src/app/attributes/page.tsx)` or a new modal to support quick SKU lookup using the `Variant-centric view` query and show all associated fitments.

7. **QA & Docs**  

- Add Bun tests for new lib helpers (`apps/server/src/__tests__/fitment-lib.test.ts`).  
- Update `[docs/product-enrichment.md](docs/product-enrichment.md)` with screenshots/workflows for managing fitments.