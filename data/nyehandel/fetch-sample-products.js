#!/usr/bin/env node

/**
 * Fetch sample products from nyehandel API for enrichment analysis
 * Focus on: avgassystem, förgasare, mopeddelar
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local manually
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      process.env[match[1]] = match[2];
    }
  });
}

const NYE_BASE_URL = process.env.NYE_BASE_URL || 'https://api.nyehandel.se/api/v2';
const NYE_IDENTIFIER = process.env.NYE_IDENTIFIER;
const NYE_TOKEN = process.env.NYE_TOKEN;
const NYE_LANGUAGE = process.env.NYE_LANGUAGE || 'sv';

const headers = {
  'X-identifier': NYE_IDENTIFIER,
  'Authorization': `Bearer ${NYE_TOKEN}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Language': NYE_LANGUAGE
};

// Search terms for different product categories
const searchTerms = [
  'avgassystem',
  'avgasrör',
  'ljuddämpare',
  'förgasare',
  'karburator',
  'moped',
  'cylinder',
  'kolv',
  'vevparti',
  'bromsar'
];

async function fetchProducts(searchTerm, pageSize = 20) {
  const url = `${NYE_BASE_URL}/products?search=${encodeURIComponent(searchTerm)}&pageSize=${pageSize}`;

  console.log(`Fetching products for: ${searchTerm}`);

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`  Found ${data.data?.length || 0} products`);

    return {
      searchTerm,
      products: data.data || [],
      meta: data.meta || {}
    };
  } catch (error) {
    console.error(`  Error fetching ${searchTerm}:`, error.message);
    return {
      searchTerm,
      products: [],
      error: error.message
    };
  }
}

async function fetchCategories() {
  const url = `${NYE_BASE_URL}/categories`;

  console.log('Fetching categories...');

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`  Found ${data.data?.length || 0} categories`);

    return data.data || [];
  } catch (error) {
    console.error('  Error fetching categories:', error.message);
    return [];
  }
}

async function main() {
  console.log('=== Nyehandel Product Fetcher ===\n');

  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputDir = path.join(process.cwd(), 'data', 'nyehandel', `sample-${timestamp}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Output directory: ${outputDir}\n`);

  // Fetch categories first
  const categories = await fetchCategories();
  fs.writeFileSync(
    path.join(outputDir, 'categories.json'),
    JSON.stringify(categories, null, 2)
  );

  // Fetch products for each search term
  const allResults = [];

  for (const term of searchTerms) {
    const result = await fetchProducts(term);
    allResults.push(result);

    // Delay between requests to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Collect all unique products
  const productMap = new Map();

  for (const result of allResults) {
    for (const product of result.products) {
      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          ...product,
          _foundBySearchTerms: [result.searchTerm]
        });
      } else {
        const existing = productMap.get(product.id);
        existing._foundBySearchTerms.push(result.searchTerm);
      }
    }
  }

  const uniqueProducts = Array.from(productMap.values());

  console.log(`\n=== Summary ===`);
  console.log(`Total unique products found: ${uniqueProducts.length}`);
  console.log(`Categories found: ${categories.length}`);

  // Save results
  fs.writeFileSync(
    path.join(outputDir, 'products.json'),
    JSON.stringify(uniqueProducts, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'search-results.json'),
    JSON.stringify(allResults, null, 2)
  );

  // Generate summary
  const summary = {
    timestamp: new Date().toISOString(),
    totalProducts: uniqueProducts.length,
    totalCategories: categories.length,
    searchTerms: searchTerms,
    outputDirectory: outputDir,
    productsBySearchTerm: allResults.map(r => ({
      searchTerm: r.searchTerm,
      productCount: r.products.length
    }))
  };

  fs.writeFileSync(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\nFiles saved to: ${outputDir}`);
  console.log('  - products.json');
  console.log('  - categories.json');
  console.log('  - search-results.json');
  console.log('  - summary.json');
}

main().catch(console.error);
