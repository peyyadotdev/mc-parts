# PIM Schema & tRPC Inventory

## Current Drizzle Tables

### Core Product Tables
- **product**: id, brandId, name, slug, description, status, createdAt, updatedAt
- **product_variant**: id, productId, sku, gtin, oemPartNumber, attributes (JSONB), priceCents, currency, stockQty, status, weightGrams, dimensions (JSONB), createdAt, updatedAt
- **product_category**: productId, categoryId (junction table)
- **product_fitment**: variantId, vehicleModelId (junction table)
- **product_translation**: (not yet reviewed in detail)

### Brand Tables
- **brand**: id, name, slug, createdAt, updatedAt
- **brand_translation**: (not yet reviewed in detail)

### Category Tables
- **category**: id, parentId, name, slug, isActive, createdAt, updatedAt
- **category_translation**: (not yet reviewed in detail)

### Vehicle/Fitment Tables
- **vehicle_model**: (not yet reviewed in detail)

### Other Tables
- **external_ref**: (not yet reviewed in detail)
- **price_list**: (not yet reviewed in detail)
- **variant_price**: (not yet reviewed in detail)
- **staging**: (not yet reviewed in detail)
- **customer**: (not yet reviewed in detail)
- **order**: (not yet reviewed in detail)
- **purchase**: (not yet reviewed in detail)
- **pages**: (not yet reviewed in detail)

## Current tRPC Routes

### Product Routes
- `getProducts`: Paginated products with variant counts, search, filtering by brand/status/date/fitment
- `getProductDetails`: Product details with variants and fitments
- `searchVariants`: Quick search by SKU or product name

### Utility Routes
- `healthCheck`: Simple health check
- `getStats`: DB stats (products, variants, fitments counts)
- `listBrands`: Brands for filters with product counts

## Gaps vs PIM Requirements

### Missing Tables (Phase 1)
1. **product_enrichment**: Missing - needed for markdown content, front-matter, rendered HTML
2. **attribute_definition**: Missing - needed for defining attribute schemas (name, type, unit, required)
3. **attribute_template**: Missing - needed for grouping attributes and assigning to categories/product types
4. **brand_alias**: Missing - needed for brand normalization (aliases, canonical brand mapping)
5. **brand_metadata**: Missing - needed for brand-level metadata (logo, description, etc.)

### Missing tRPC Routes
- No CRUD routes for any of the new tables
- No validation endpoints
- No brand normalization endpoints
- No enrichment management endpoints
- No template management endpoints

### Missing Features
- Attribute template validation
- Brand alias matching
- Markdown storage and rendering
- Front-matter parsing
- Content preview
- Validation state tracking
