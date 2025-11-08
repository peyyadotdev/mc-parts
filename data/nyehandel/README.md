# Nyehandel API Data Export & Analysis

This directory contains scripts and analysis for fetching, processing, and importing data from the nyehandel e-commerce platform API.

## Files Overview

### Data Fetching Scripts
- **`simple-test.js`** - Basic test script using original code example
- **`fetch-all-products.js`** - Comprehensive script to fetch all 32,063 products
- **`test-fetch-structure.js`** - Test script to analyze data structure with sample data

### Analysis Scripts
- **`find-total-pages.js`** - Script to determine total number of pages
- **`find-total-pages-efficient.js`** - Efficient version using maximum page size
- **`show-pagination-schema.js`** - Script to display complete pagination metadata
- **`analyze-data-structure.js`** - Comprehensive data analysis script

### Import & Schema
- **`import-script.js`** - Database import script with SQL generation
- **`database-schema-analysis.md`** - Complete database schema design document

## API Information

### Pagination
- **Total Products:** 32,063
- **Total Pages:** 321 (with 100 products per page)
- **Page Size:** 1-100 products per page (API limit)
- **Rate Limiting:** Recommended 1-second delay between requests

### Data Structure
The API returns data in the following format:
```json
{
  "data": [...], // Array of products
  "links": {...}, // Navigation URLs
  "meta": {...}  // Pagination metadata
}
```

### Key Entities
1. **Products** - Main product information
2. **Variants** - Product variants (1:1 relationship with products)
3. **Categories** - Product categories (many-to-many with products)
4. **Brands** - Product brands (many-to-one with products)

## Usage

### 1. Fetch All Products
```bash
bun run data/nyehandel/fetch-all-products.js
```
This will create a timestamped export directory with all product data.

### 2. Analyze Data Structure
```bash
bun run data/nyehandel/analyze-data-structure.js
```
This analyzes the exported data and generates schema recommendations.

### 3. Generate Import SQL
```bash
bun run data/nyehandel/import-script.js
```
This generates SQL INSERT statements for database import.

### 4. Test API Structure
```bash
bun run data/nyehandel/test-fetch-structure.js
```
This fetches a sample of data to understand the structure.

## Database Schema

The recommended database schema includes:

### Core Tables
- `products` - Main product information
- `product_variants` - Product variants
- `categories` - Product categories
- `brands` - Product brands
- `suppliers` - Product suppliers

### Relationship Tables
- `product_categories` - Many-to-many product-category relationships
- `variant_prices` - Multiple price tiers per variant
- `product_images` - Product images
- `product_translations` - Multi-language support
- `external_references` - External system tracking

### Key Features
- **Multi-language support** - Product translations
- **Complex pricing** - Multiple price tiers per variant
- **Hierarchical categories** - Self-referencing category structure
- **External integration** - Tracking external system references
- **Performance optimization** - Proper indexing and relationships

## Environment Variables

Required environment variables:
```bash
NYE_BASE_URL=https://api.nyehandel.se/api/v2
NYE_IDENTIFIER=your_identifier
NYE_TOKEN=your_token
NYE_LANGUAGE=sv  # Optional, defaults to Swedish
```

## Data Export Structure

Each export creates a timestamped directory containing:
- `all-products.json` - All product data
- `all-variants.json` - All variant data
- `all-categories.json` - All category data
- `all-brands.json` - All brand data
- `pagination-info.json` - Pagination metadata
- `export-summary.json` - Export summary
- `data-analysis.json` - Data analysis results
- `import.sql` - Generated SQL import statements

## Performance Considerations

### Rate Limiting
- API requests are rate-limited to prevent overwhelming the server
- Default: 5 concurrent requests with 1-second delay between batches
- Total fetch time: ~5-10 minutes for all 32,063 products

### Data Size
- **Products:** ~32,063 records
- **Variants:** ~32,063 records (1:1 with products)
- **Categories:** ~40+ unique categories
- **Brands:** Variable (many products have null brands)
- **Total API requests:** 321 requests (1 per page)

### Memory Usage
- Scripts are designed to process data in batches
- JSON files can be large (100MB+ for full export)
- Consider disk space for export files

## Error Handling

The scripts include comprehensive error handling:
- Network timeouts and retries
- Invalid response handling
- Data validation and sanitization
- Progress logging and monitoring

## Next Steps

1. **Run full export** - Execute `fetch-all-products.js` to get all data
2. **Analyze structure** - Run `analyze-data-structure.js` for insights
3. **Generate SQL** - Run `import-script.js` for database import
4. **Implement schema** - Use the generated SQL to create database tables
5. **Import data** - Execute the generated SQL statements
6. **Validate import** - Verify data integrity and relationships

## Support

For issues or questions:
1. Check the generated log files for error details
2. Verify environment variables are correctly set
3. Ensure sufficient disk space for export files
4. Check API rate limits and authentication

## License

This code is provided as-is for educational and development purposes. Please respect the nyehandel API terms of service and rate limits.
