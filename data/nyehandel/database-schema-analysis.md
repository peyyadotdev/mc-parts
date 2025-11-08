# Nyehandel API Database Schema Analysis

## Overview
Based on analysis of the nyehandel e-commerce API data structure, this document provides recommendations for designing a comprehensive database schema to store products, variants, categories, brands, and their relationships.

## Data Structure Analysis

### API Response Structure
The nyehandel API returns data in the following format:
```json
{
  "data": [...], // Array of products
  "links": {...}, // Navigation URLs
  "meta": {...}  // Pagination metadata
}
```

### Core Entities

#### 1. Products
**Total Count:** 32,063 products
**Key Fields:**
- `id` (number) - Unique product identifier
- `status` (string) - Product status (published, draft, inactive, etc.)
- `type` (string) - Product type (inventory_item, etc.)
- `name` (string) - Product name
- `slug` (string) - URL-friendly identifier
- `description` (string) - HTML description
- `short_description` (string) - Brief description
- `meta_title` (string) - SEO title
- `meta_description` (string) - SEO description
- `hs_code` (object) - Harmonized System code
- `country_of_origin` (object) - Origin country
- `filterTags` (array) - Filter tags
- `variants` (array) - Product variants
- `categories` (array) - Product categories
- `brand` (object) - Product brand
- `supplier` (object) - Supplier information
- `specifications` (array) - Product specifications
- `images` (array) - Product images
- `created_at` (string) - Creation timestamp

#### 2. Product Variants
**Total Count:** ~32,063 variants (1:1 relationship with products)
**Key Fields:**
- `id` (number) - Unique variant identifier
- `product_id` (number) - Parent product ID
- `sku` (string) - Stock Keeping Unit
- `gtin` (string) - Global Trade Item Number
- `stock` (string) - Stock quantity
- `weight` (number) - Product weight
- `purchase_price` (number) - Purchase price
- `stock_price` (number) - Stock price
- `price` (number) - Selling price
- `prices` (array) - Multiple price tiers
- `compare_price` (number) - Comparison price
- `auto_pricing` (number) - Auto-pricing flag
- `package_size` (number) - Package size
- `storage_space` (object) - Storage requirements
- `supplier_sku` (object) - Supplier SKU
- `external_reference` (object) - External system reference
- `always_orderable` (boolean) - Orderable flag
- `positive_inventory_status` (object) - Positive inventory status
- `negative_inventory_status` (object) - Negative inventory status
- `created_at` (string) - Creation timestamp

#### 3. Categories
**Total Count:** ~40+ unique categories
**Key Fields:**
- `id` (number) - Unique category identifier
- `external_reference` (object) - External system reference
- `name` (string) - Category name

#### 4. Brands
**Total Count:** Variable (many products have null brands)
**Key Fields:**
- `id` (number) - Unique brand identifier
- `name` (string) - Brand name
- Additional fields from API response

## Relationship Analysis

### Product-Variant Relationships
- **Type:** One-to-One (each product has exactly one variant)
- **Key:** `variants[0].id` → `products.id`
- **Note:** This is unusual for e-commerce - typically products have multiple variants

### Product-Category Relationships
- **Type:** Many-to-Many
- **Key:** `products.categories[]` → `categories.id`
- **Average:** ~1 category per product
- **Note:** Products can belong to multiple categories

### Product-Brand Relationships
- **Type:** Many-to-One
- **Key:** `products.brand.id` → `brands.id`
- **Note:** Many products have null brands

### Category Hierarchy
- **Type:** Self-referencing
- **Key:** `categories.parent_id` → `categories.id`
- **Note:** Categories can have parent categories

## Recommended Database Schema

### Core Tables

#### 1. products
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    type VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    short_description TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    hs_code JSON,
    country_of_origin JSON,
    filter_tags JSON,
    brand_id INTEGER,
    supplier_id INTEGER,
    specifications JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

#### 2. product_variants
```sql
CREATE TABLE product_variants (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    gtin VARCHAR(50),
    stock DECIMAL(10,2),
    weight DECIMAL(10,2),
    purchase_price DECIMAL(10,2),
    stock_price DECIMAL(10,2),
    price DECIMAL(10,2),
    compare_price DECIMAL(10,2),
    auto_pricing DECIMAL(10,2),
    auto_pricing_min_price DECIMAL(10,2),
    package_size INTEGER,
    storage_space JSON,
    supplier_sku JSON,
    external_reference JSON,
    always_orderable BOOLEAN DEFAULT FALSE,
    positive_inventory_status JSON,
    negative_inventory_status JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

#### 3. categories
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    external_reference JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);
```

#### 4. brands
```sql
CREATE TABLE brands (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),
    external_reference JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 5. suppliers
```sql
CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_info JSON,
    external_reference JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Relationship Tables

#### 6. product_categories
```sql
CREATE TABLE product_categories (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    created_at TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(product_id, category_id)
);
```

#### 7. variant_prices
```sql
CREATE TABLE variant_prices (
    id INTEGER PRIMARY KEY,
    variant_id INTEGER NOT NULL,
    customer_group_id INTEGER,
    currency_id INTEGER,
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    tier INTEGER DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);
```

#### 8. product_images
```sql
CREATE TABLE product_images (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    name VARCHAR(255),
    title VARCHAR(255),
    alt_tag VARCHAR(255),
    url VARCHAR(500) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);
```

#### 9. product_translations
```sql
CREATE TABLE product_translations (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    short_description TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, language_code)
);
```

#### 10. external_references
```sql
CREATE TABLE external_references (
    id INTEGER PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'variant', 'category', 'brand'
    entity_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'nyehandel'
    external_id VARCHAR(100) NOT NULL,
    external_data JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    UNIQUE(entity_type, entity_id, provider),
    UNIQUE(provider, external_id)
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_slug ON products(slug);

CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_gtin ON product_variants(gtin);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

CREATE INDEX idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX idx_product_categories_category_id ON product_categories(category_id);

CREATE INDEX idx_variant_prices_variant_id ON variant_prices(variant_id);
CREATE INDEX idx_variant_prices_customer_group ON variant_prices(customer_group_id);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_variant_id ON product_images(variant_id);

CREATE INDEX idx_external_references_entity ON external_references(entity_type, entity_id);
CREATE INDEX idx_external_references_provider ON external_references(provider, external_id);
```

## Data Import Strategy

### 1. Import Order
1. **brands** - Import first (referenced by products)
2. **suppliers** - Import second (referenced by products)
3. **categories** - Import third (referenced by products)
4. **products** - Import fourth (main entity)
5. **product_variants** - Import fifth (referenced by products)
6. **product_categories** - Import sixth (many-to-many relationship)
7. **variant_prices** - Import seventh (referenced by variants)
8. **product_images** - Import eighth (referenced by products/variants)
9. **product_translations** - Import ninth (referenced by products)
10. **external_references** - Import last (tracking table)

### 2. Data Transformation
- Convert API timestamps to database format
- Handle null values appropriately
- Extract nested objects (brand, supplier) into separate tables
- Flatten arrays (categories, images, prices) into relationship tables
- Generate slugs for SEO-friendly URLs
- Create external reference entries for all entities

### 3. Validation Rules
- Ensure SKUs are unique
- Validate price formats
- Check required fields
- Verify foreign key relationships
- Handle duplicate external references

## Performance Considerations

### 1. Pagination
- Use cursor-based pagination for large datasets
- Implement proper indexing for common queries
- Consider partitioning for very large tables

### 2. Caching
- Cache frequently accessed data (categories, brands)
- Implement Redis for session data
- Use CDN for product images

### 3. Search
- Implement full-text search on product names and descriptions
- Use Elasticsearch for advanced search capabilities
- Create search indexes on relevant fields

## Security Considerations

### 1. Data Access
- Implement role-based access control
- Encrypt sensitive data (prices, supplier info)
- Audit trail for data changes

### 2. API Security
- Rate limiting for API endpoints
- Input validation and sanitization
- SQL injection prevention

## Maintenance

### 1. Data Synchronization
- Regular sync with nyehandel API
- Handle data updates and deletions
- Maintain data consistency

### 2. Monitoring
- Track import performance
- Monitor database performance
- Alert on data quality issues

## Conclusion

This schema design provides a robust foundation for storing nyehandel product data with proper relationships, indexing, and extensibility. The design supports:

- Multi-language content
- Complex pricing structures
- Hierarchical categories
- Multiple product images
- External system integration
- Performance optimization
- Data integrity

The schema can be implemented using any SQL database (PostgreSQL, MySQL, SQLite) and provides a solid foundation for building a comprehensive e-commerce system.
